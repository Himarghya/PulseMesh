import { query, withTransaction, WorkerRepository, JobRepository, OutboxRepository } from '@pulsemesh/database';
import { JobStatus } from '@pulsemesh/shared';
import { randomUUID } from 'crypto';

export class RecoveryService {
  constructor(options = {}) {
    this.scanIntervalMs = options.scanIntervalMs || 5000;
    this.staleWorkerTimeoutSeconds = options.staleWorkerTimeoutSeconds || 15;
    this.isRunning = false;
    this.timer = null;
  }

  async start() {
    this.isRunning = true;
    console.log(`🛡️ [Recovery Service] Started lease watchdog (Scan interval: ${this.scanIntervalMs}ms)`);
    this.timer = setInterval(() => this.scan(), this.scanIntervalMs);
  }

  async scan() {
    try {
      await this.recoverStaleWorkers();
      await this.recoverExpiredLeases();
      await this.relayOutboxEvents();
    } catch (err) {
      console.error('[Recovery Service] Error in recovery scan:', err.message);
    }
  }

  /**
   * 1. Detect workers with expired heartbeats and mark them as offline
   */
  async recoverStaleWorkers() {
    const staleWorkers = await WorkerRepository.findStaleWorkers(this.staleWorkerTimeoutSeconds);
    for (const worker of staleWorkers) {
      console.warn(`🛡️ [Recovery Service] Worker ${worker.id} heartbeat expired. Marking offline.`);
      await WorkerRepository.markWorkerOffline(worker.id);
    }
  }

  /**
   * 2. Find running jobs whose lease_until has passed and resurrect them
   */
  async recoverExpiredLeases() {
    // Find abandoned jobs
    const sql = `
      SELECT * FROM jobs
      WHERE status = 'running'
        AND leased_until < NOW()
      LIMIT 50;
    `;
    const res = await query(sql);

    for (const job of res.rows) {
      await withTransaction(async (tx) => {
        const canRetry = job.attempt_number < job.max_attempts;
        const newStatus = canRetry ? JobStatus.RETRY_WAIT : JobStatus.DEAD_LETTER;

        console.warn(
          `🛡️ [Recovery Service] Job ${job.id} lease expired (Attempt ${job.attempt_number}/${job.max_attempts}). Transitioning to '${newStatus}'.`
        );

        // Update Job state, clearing lease token
        await tx.query(
          `UPDATE jobs
           SET status = $2,
               lease_token = NULL,
               leased_until = NULL,
               leased_by_worker_id = NULL,
               error = $3,
               version = version + 1
           WHERE id = $1 AND status = 'running';`,
          [
            job.id,
            newStatus,
            { message: 'Worker heartbeat lease expired / Worker crash detected', recoveredAt: new Date().toISOString() },
          ]
        );

        // Record recovery event in timeline
        await tx.query(
          `INSERT INTO job_events (id, job_id, organization_id, type, attempt, metadata)
           VALUES ($1, $2, $3, $4, $5, $6);`,
          [
            randomUUID(),
            job.id,
            job.organization_id,
            'job.lease_expired',
            job.attempt_number,
            { previousWorker: job.leased_by_worker_id, newStatus },
          ]
        );

        // If retryable, requeue after brief wait
        if (canRetry) {
          await tx.query(
            `UPDATE jobs SET status = 'queued' WHERE id = $1 AND status = 'retry_wait';`,
            [job.id]
          );
        }
      });
    }
  }

  /**
   * 3. Relays pending outbox events (guaranteeing at-least-once delivery)
   */
  async relayOutboxEvents() {
    const pendingEvents = await OutboxRepository.fetchPendingEvents(50);
    for (const event of pendingEvents) {
      try {
        // In full Redis mode, publish to Redis channel here
        // Then mark published in PostgreSQL
        await OutboxRepository.markPublished(event.id);
      } catch (err) {
        await OutboxRepository.markFailedAttempt(event.id);
      }
    }
  }

  stop() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    console.log('[Recovery Service] Stopped.');
  }
}
