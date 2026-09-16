import { query, withTransaction } from '../pool.js';
import { randomUUID } from 'crypto';
import { JobStatus, isValidJobTransition } from '@pulsemesh/shared';

export class JobRepository {
  /**
   * Creates a new job and an atomic outbox event inside a single transaction.
   */
  static async createJob(jobData) {
    return withTransaction(async (tx) => {
      const jobId = jobData.id || randomUUID();
      const outboxId = randomUUID();

      // 1. Insert Job
      const insertJobSql = `
        INSERT INTO jobs (
          id, organization_id, queue_name, type, payload, priority,
          status, idempotency_key, max_attempts, backoff_type,
          backoff_delay_ms, timeout_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
      `;
      const jobParams = [
        jobId,
        jobData.organizationId,
        jobData.queueName || 'default',
        jobData.type,
        jobData.payload || {},
        jobData.priority ?? 5,
        jobData.status || JobStatus.QUEUED,
        jobData.idempotencyKey || null,
        jobData.maxAttempts ?? 3,
        jobData.backoffType || 'exponential',
        jobData.backoffDelayMs ?? 2000,
        jobData.timeoutMs ?? 60000,
      ];

      const res = await tx.query(insertJobSql, jobParams);
      const job = res.rows[0];

      // 2. Insert Outbox Event
      const insertOutboxSql = `
        INSERT INTO outbox_events (
          id, aggregate_type, aggregate_id, event_type, payload
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const outboxPayload = {
        jobId: job.id,
        organizationId: job.organization_id,
        queueName: job.queue_name,
        type: job.type,
        priority: job.priority,
      };
      await tx.query(insertOutboxSql, [
        outboxId,
        'job',
        job.id,
        'job.created',
        outboxPayload,
      ]);

      // 3. Insert Initial Event in Timeline
      const insertEventSql = `
        INSERT INTO job_events (
          id, job_id, organization_id, type, attempt, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6);
      `;
      await tx.query(insertEventSql, [
        randomUUID(),
        job.id,
        job.organization_id,
        'job.created',
        0,
        { queueName: job.queue_name, priority: job.priority },
      ]);

      return job;
    });
  }

  /**
   * Atomic Job Claim with FOR UPDATE SKIP LOCKED & Priority Aging
   */
  static async claimNextJob(queueName = 'default', workerId, leaseDurationSeconds = 30) {
    const claimSql = `
      WITH claimed AS (
        SELECT id
        FROM jobs
        WHERE status = 'queued'
          AND (queue_name = $1 OR $1 = '*')
        ORDER BY
          (priority * 100 + EXTRACT(EPOCH FROM (NOW() - created_at)) / 60) DESC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE jobs j
      SET status = 'running',
          lease_token = gen_random_uuid(),
          leased_until = NOW() + ($3 || ' seconds')::INTERVAL,
          leased_by_worker_id = $2,
          heartbeat_at = NOW(),
          attempt_number = attempt_number + 1,
          execution_generation = execution_generation + 1,
          version = version + 1,
          started_at = COALESCE(started_at, NOW())
      FROM claimed
      WHERE j.id = claimed.id
      RETURNING j.*;
    `;

    const res = await query(claimSql, [queueName, workerId, leaseDurationSeconds]);
    const job = res.rows[0];

    if (job) {
      // Record attempt and event
      await query(
        `INSERT INTO job_attempts (id, job_id, attempt_number, execution_generation, worker_id, status, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW());`,
        [randomUUID(), job.id, job.attempt_number, job.execution_generation, workerId, 'running']
      );

      await query(
        `INSERT INTO job_events (id, job_id, organization_id, type, attempt, worker_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          randomUUID(),
          job.id,
          job.organization_id,
          'job.claimed',
          job.attempt_number,
          workerId,
          { leaseToken: job.lease_token, leasedUntil: job.leased_until },
        ]
      );
    }

    return job || null;
  }

  /**
   * Renews the heartbeat lease on an active job with strict lease token verification.
   */
  static async renewHeartbeat(jobId, leaseToken, leaseExtensionSeconds = 30) {
    const sql = `
      UPDATE jobs
      SET heartbeat_at = NOW(),
          leased_until = NOW() + ($3 || ' seconds')::INTERVAL
      WHERE id = $1
        AND status = 'running'
        AND lease_token = $2
      RETURNING *;
    `;
    const res = await query(sql, [jobId, leaseToken, leaseExtensionSeconds]);
    return res.rowCount === 1;
  }

  /**
   * Conditional Success State Mutation with Fencing Token Verification
   * Rejects stale workers if rows_affected === 0.
   */
  static async completeJob(jobId, leaseToken, version, result = {}) {
    return withTransaction(async (tx) => {
      const sql = `
        UPDATE jobs
        SET status = 'succeeded',
            result = $4,
            completed_at = NOW(),
            version = version + 1
        WHERE id = $1
          AND status = 'running'
          AND lease_token = $2
          AND version = $3
        RETURNING *;
      `;
      const res = await tx.query(sql, [jobId, leaseToken, version, result]);
      if (res.rowCount === 0) {
        return { success: false, reason: 'STALE_LEASE_REJECTED' };
      }

      const job = res.rows[0];

      // Update attempt
      await tx.query(
        `UPDATE job_attempts
         SET status = 'succeeded', finished_at = NOW()
         WHERE job_id = $1 AND attempt_number = $2;`,
        [jobId, job.attempt_number]
      );

      // Add event
      await tx.query(
        `INSERT INTO job_events (id, job_id, organization_id, type, attempt, metadata)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [randomUUID(), jobId, job.organization_id, 'job.succeeded', job.attempt_number, { result }]
      );

      return { success: true, job };
    });
  }

  /**
   * Conditional Failure State Mutation with Fencing Token Verification
   */
  static async failJob(jobId, leaseToken, version, errorDetails = {}, shouldRetry = false) {
    return withTransaction(async (tx) => {
      const newStatus = shouldRetry ? JobStatus.RETRY_WAIT : JobStatus.FAILED;
      const sql = `
        UPDATE jobs
        SET status = $4,
            error = $5,
            completed_at = CASE WHEN $4 = 'failed' THEN NOW() ELSE NULL END,
            version = version + 1
        WHERE id = $1
          AND status = 'running'
          AND lease_token = $2
          AND version = $3
        RETURNING *;
      `;
      const res = await tx.query(sql, [jobId, leaseToken, version, newStatus, errorDetails]);
      if (res.rowCount === 0) {
        return { success: false, reason: 'STALE_LEASE_REJECTED' };
      }

      const job = res.rows[0];

      await tx.query(
        `UPDATE job_attempts
         SET status = $3, finished_at = NOW(), error_details = $4
         WHERE job_id = $1 AND attempt_number = $2;`,
        [jobId, job.attempt_number, newStatus, errorDetails]
      );

      await tx.query(
        `INSERT INTO job_events (id, job_id, organization_id, type, attempt, metadata)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [
          randomUUID(),
          jobId,
          job.organization_id,
          shouldRetry ? 'job.retry_scheduled' : 'job.failed',
          job.attempt_number,
          { error: errorDetails, shouldRetry },
        ]
      );

      return { success: true, job };
    });
  }

  static async getJobById(jobId) {
    const res = await query('SELECT * FROM jobs WHERE id = $1;', [jobId]);
    return res.rows[0] || null;
  }

  static async listJobs(organizationId, filters = {}) {
    const res = await query('SELECT * FROM jobs WHERE organization_id = $1 ORDER BY created_at DESC;', [
      organizationId,
    ]);
    let jobs = res.rows;
    if (filters.status) {
      jobs = jobs.filter((j) => j.status === filters.status);
    }
    if (filters.queueName) {
      jobs = jobs.filter((j) => j.queue_name === filters.queueName);
    }
    if (filters.type) {
      jobs = jobs.filter((j) => j.type === filters.type);
    }
    return jobs;
  }

  static async getJobEvents(jobId) {
    const res = await query('SELECT * FROM job_events WHERE job_id = $1 ORDER BY created_at ASC;', [jobId]);
    return res.rows;
  }

  static async getJobAttempts(jobId) {
    const res = await query('SELECT * FROM job_attempts WHERE job_id = $1 ORDER BY attempt_number ASC;', [jobId]);
    return res.rows;
  }

  static async retryJob(jobId) {
    const sql = `
      UPDATE jobs
      SET status = 'queued',
          lease_token = NULL,
          leased_until = NULL,
          leased_by_worker_id = NULL,
          version = version + 1
      WHERE id = $1
      RETURNING *;
    `;
    const res = await query(sql, [jobId]);
    return res.rows[0] || null;
  }

  static async cancelJob(jobId) {
    const sql = `
      UPDATE jobs
      SET status = 'cancelled',
          completed_at = NOW(),
          version = version + 1
      WHERE id = $1
      RETURNING *;
    `;
    const res = await query(sql, [jobId]);
    return res.rows[0] || null;
  }
}
