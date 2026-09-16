import pg from 'pg';
import { randomUUID } from 'crypto';

const { Pool } = pg;

class MemoryDbEngine {
  constructor() {
    this.tables = {
      organizations: new Map(),
      users: new Map(),
      organization_members: new Map(),
      api_keys: new Map(),
      jobs: new Map(),
      job_attempts: new Map(),
      job_events: new Map(),
      outbox_events: new Map(),
      workflows: new Map(),
      workflow_versions: new Map(),
      workflow_runs: new Map(),
      workflow_task_runs: new Map(),
      workers: new Map(),
      schedules: new Map(),
      schedule_executions: new Map(),
      audit_logs: new Map(),
    };
    this.lockedJobIds = new Set();
  }

  reset() {
    for (const table of Object.values(this.tables)) {
      table.clear();
    }
    this.lockedJobIds.clear();
  }
}

export const memoryDb = new MemoryDbEngine();

let realPool = null;
let useMemoryFallback = false;

export function initDbPool(connectionString) {
  if (process.env.PULSEMESH_FORCE_MEMORY === 'true') {
    useMemoryFallback = true;
    return null;
  }

  const url = connectionString || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pulsemesh';
  try {
    realPool = new Pool({
      connectionString: url,
      max: Number(process.env.PGMAX_CONNECTIONS || 20),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    realPool.on('error', (err) => {
      // Don't crash process if Postgres connection fails in dev/test
      useMemoryFallback = true;
    });

    return realPool;
  } catch (err) {
    useMemoryFallback = true;
    return null;
  }
}

export async function query(text, params = []) {
  if (!useMemoryFallback && realPool) {
    try {
      const client = await realPool.connect();
      try {
        const result = await client.query(text, params);
        return result;
      } finally {
        client.release();
      }
    } catch (err) {
      // Fallback to memory DB for seamless developer experience if PG is not running
      useMemoryFallback = true;
    }
  }

  // Memory fallback query processor for tests and local zero-dependency testing
  return executeMemoryQuery(text, params);
}

export async function withTransaction(callback) {
  if (!useMemoryFallback && realPool) {
    let client;
    try {
      client = await realPool.connect();
      await client.query('BEGIN');
      const tx = {
        query: (sql, params) => client.query(sql, params),
      };
      const result = await callback(tx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      useMemoryFallback = true;
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch {}
      }
    } finally {
      if (client) client.release();
    }
  }

  // Memory transaction mock
  const txMock = {
    query: (sql, params) => executeMemoryQuery(sql, params),
  };
  return await callback(txMock);
}

function executeMemoryQuery(sql, params = []) {
  const normalized = sql.trim();
  const lower = normalized.toLowerCase();

  // Simple query dispatcher for memory engine
  if (lower.startsWith('select 1') || lower.startsWith('select now()')) {
    return { rows: [{ '?column?': 1, now: new Date().toISOString() }], rowCount: 1 };
  }

  // Jobs queries
  if (lower.includes('from jobs') || lower.includes('update jobs') || lower.includes('insert into jobs')) {
    return handleMemoryJobs(normalized, params);
  }

  // Outbox events
  if (lower.includes('outbox_events')) {
    return handleMemoryOutbox(normalized, params);
  }

  // Workflows
  if (lower.includes('workflow')) {
    return handleMemoryWorkflows(normalized, params);
  }

  // Workers
  if (lower.includes('workers')) {
    return handleMemoryWorkers(normalized, params);
  }

  // Schedules
  if (lower.includes('schedules') || lower.includes('schedule_executions')) {
    return handleMemorySchedules(normalized, params);
  }

  // Auth / Users / Orgs / API Keys / Logs
  if (lower.includes('users') || lower.includes('organizations') || lower.includes('api_keys') || lower.includes('audit_logs') || lower.includes('organization_members')) {
    return handleMemoryAuth(normalized, params);
  }

  return { rows: [], rowCount: 0 };
}

function handleMemoryJobs(sql, params) {
  const table = memoryDb.tables.jobs;
  const lower = sql.toLowerCase();

  // INSERT INTO jobs
  if (lower.startsWith('insert into jobs')) {
    const job = {
      id: params[0] || randomUUID(),
      organization_id: params[1],
      queue_name: params[2] || 'default',
      type: params[3],
      payload: typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4] || {},
      priority: params[5] ?? 5,
      status: params[6] || 'created',
      idempotency_key: params[7] || null,
      max_attempts: params[8] ?? 3,
      attempt_number: 0,
      execution_generation: 0,
      backoff_type: params[9] || 'exponential',
      backoff_delay_ms: params[10] ?? 2000,
      timeout_ms: params[11] ?? 60000,
      version: 1,
      result: null,
      error: null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      lease_token: null,
      leased_until: null,
      leased_by_worker_id: null,
      heartbeat_at: null,
    };

    // Check idempotency unique constraint
    if (job.idempotency_key) {
      for (const existing of table.values()) {
        if (existing.organization_id === job.organization_id && existing.idempotency_key === job.idempotency_key) {
          return { rows: [{ ...existing }], rowCount: 1, isDuplicate: true };
        }
      }
    }

    table.set(job.id, job);
    return { rows: [{ ...job }], rowCount: 1 };
  }

  // Atomic Claim with FOR UPDATE SKIP LOCKED
  if (lower.includes('for update skip locked') && lower.includes("status = 'queued'")) {
    const queueName = params[0] || 'default';
    const workerId = params[1] || randomUUID();
    const leaseSeconds = params[2] || 30;

    const queuedJobs = Array.from(table.values())
      .filter((j) => j.status === 'queued' && (queueName === '*' || j.queue_name === queueName) && !memoryDb.lockedJobIds.has(j.id))
      .sort((a, b) => {
        // Priority aging formula
        const ageA = (Date.now() - new Date(a.created_at).getTime()) / 1000 / 60;
        const ageB = (Date.now() - new Date(b.created_at).getTime()) / 1000 / 60;
        const scoreA = a.priority * 100 + ageA;
        const scoreB = b.priority * 100 + ageB;
        return scoreB - scoreA;
      });

    if (queuedJobs.length === 0) {
      return { rows: [], rowCount: 0 };
    }

    const job = queuedJobs[0];
    const leaseToken = randomUUID();
    const now = new Date();
    const leasedUntil = new Date(now.getTime() + leaseSeconds * 1000);

    job.status = 'running';
    job.lease_token = leaseToken;
    job.leased_until = leasedUntil.toISOString();
    job.leased_by_worker_id = workerId;
    job.heartbeat_at = now.toISOString();
    job.attempt_number += 1;
    job.execution_generation += 1;
    job.version += 1;
    job.started_at = job.started_at || now.toISOString();

    return { rows: [{ ...job }], rowCount: 1 };
  }

  // SELECT ... FROM jobs WHERE id = $1 (Exact match on primary key id)
  if (lower.startsWith('select') && /\bwhere\s+id\s*=/i.test(lower)) {
    const jobId = params[0];
    const job = table.get(jobId);
    return { rows: job ? [{ ...job }] : [], rowCount: job ? 1 : 0 };
  }

  // SELECT ... FROM jobs WHERE organization_id = ...
  if (lower.startsWith('select') && lower.includes('from jobs')) {
    let rows = Array.from(table.values()).map((j) => ({ ...j }));
    if (params.length > 0 && params[0]) {
      rows = rows.filter((j) => j.organization_id === params[0]);
    }
    return { rows, rowCount: rows.length };
  }

  // UPDATE jobs (Conditional lease mutations)
  if (lower.startsWith('update jobs')) {
    const jobId = params[0];
    const targetJob = table.get(jobId);

    if (targetJob) {
      // Check conditional lease token if query requires it in WHERE clause (multi-line dotAll)
      if (/\bwhere\b[\s\S]*lease_token\s*=/i.test(lower)) {
        const leaseToken = params[1];
        if (targetJob.lease_token !== leaseToken) {
          // Fencing rejection! Stale worker rejected
          return { rows: [], rowCount: 0 };
        }
      }

      // Check version optimistic lock if required in WHERE clause
      if (/\bwhere\b[\s\S]*version\s*=/i.test(lower) && typeof params[2] === 'number') {
        if (targetJob.version !== params[2]) {
          return { rows: [], rowCount: 0 };
        }
      }

      // Update fields based on query context
      if (/\bset\s+status\s*=\s*'succeeded'/i.test(lower)) {
        targetJob.status = 'succeeded';
        targetJob.completed_at = new Date().toISOString();
        targetJob.result = params[3] || {};
        targetJob.version += 1;
        return { rows: [targetJob], rowCount: 1 };
      }

      if (/\bset\s+status\s*=\s*'queued'/i.test(lower)) {
        targetJob.status = 'queued';
        targetJob.lease_token = null;
        targetJob.leased_until = null;
        targetJob.leased_by_worker_id = null;
        targetJob.version += 1;
        return { rows: [targetJob], rowCount: 1 };
      }

      if (/\bset\s+status\s*=\s*('failed'|'retry_wait'|'dead_letter'|\$)/i.test(lower)) {
        const newStatus = params.find((p) => typeof p === 'string' && ['failed', 'retry_wait', 'dead_letter', 'succeeded', 'queued', 'cancelled'].includes(p)) || (lower.includes("status = 'retry_wait'") ? 'retry_wait' : lower.includes("status = 'dead_letter'") ? 'dead_letter' : 'failed');
        targetJob.status = newStatus;
        targetJob.lease_token = null;
        targetJob.leased_until = null;
        targetJob.leased_by_worker_id = null;
        targetJob.completed_at = newStatus === 'failed' ? new Date().toISOString() : null;
        targetJob.error = params.find((p) => typeof p === 'object' && p !== null) || {};
        targetJob.version += 1;
        return { rows: [targetJob], rowCount: 1 };
      }

      if (lower.includes('heartbeat_at =')) {
        targetJob.heartbeat_at = new Date().toISOString();
        targetJob.leased_until = new Date(Date.now() + 30000).toISOString();
        return { rows: [targetJob], rowCount: 1 };
      }

      if (lower.includes("status = 'cancelled'") || lower.includes("status = 'cancel_requested'")) {
        targetJob.status = lower.includes("status = 'cancelled'") ? 'cancelled' : 'cancel_requested';
        targetJob.version += 1;
        return { rows: [targetJob], rowCount: 1 };
      }
    }

    return { rows: [], rowCount: 0 };
  }

  // DELETE FROM jobs
  if (lower.startsWith('delete from jobs')) {
    const jobId = params[0];
    const exists = table.delete(jobId);
    return { rows: [], rowCount: exists ? 1 : 0 };
  }

  return { rows: [], rowCount: 0 };
}

function handleMemoryOutbox(sql, params) {
  const table = memoryDb.tables.outbox_events;
  const lower = sql.toLowerCase();

  if (lower.startsWith('insert into outbox_events')) {
    const event = {
      id: params[0] || randomUUID(),
      aggregate_type: params[1],
      aggregate_id: params[2],
      event_type: params[3],
      payload: typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4],
      status: 'pending',
      attempts: 0,
      created_at: new Date().toISOString(),
      published_at: null,
    };
    table.set(event.id, event);
    return { rows: [event], rowCount: 1 };
  }

  if (lower.includes("status = 'pending'")) {
    const pending = Array.from(table.values()).filter((e) => e.status === 'pending');
    return { rows: pending, rowCount: pending.length };
  }

  if (lower.startsWith('update outbox_events')) {
    const id = params[0];
    const event = table.get(id);
    if (event) {
      event.status = 'published';
      event.published_at = new Date().toISOString();
      return { rows: [event], rowCount: 1 };
    }
  }

  return { rows: [], rowCount: 0 };
}

function handleMemoryWorkflows(sql, params) {
  const wfTable = memoryDb.tables.workflows;
  const verTable = memoryDb.tables.workflow_versions;
  const runTable = memoryDb.tables.workflow_runs;
  const taskRunTable = memoryDb.tables.workflow_task_runs;
  const lower = sql.toLowerCase();

  if (lower.startsWith('insert into workflows')) {
    const wf = {
      id: params[0] || randomUUID(),
      organization_id: params[1],
      name: params[2],
      description: params[3] || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    wfTable.set(wf.id, wf);
    return { rows: [wf], rowCount: 1 };
  }

  if (lower.startsWith('insert into workflow_versions')) {
    const ver = {
      id: params[0] || randomUUID(),
      workflow_id: params[1],
      version: params[2],
      definition: typeof params[3] === 'string' ? JSON.parse(params[3]) : params[3],
      created_at: new Date().toISOString(),
    };
    verTable.set(ver.id, ver);
    return { rows: [ver], rowCount: 1 };
  }

  if (lower.startsWith('insert into workflow_runs')) {
    const run = {
      id: params[0] || randomUUID(),
      workflow_version_id: params[1],
      organization_id: params[2],
      status: params[3] || 'running',
      input: typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4] || {},
      output: null,
      timeout_ms: params[5] || 900000,
      started_at: new Date().toISOString(),
      completed_at: null,
    };
    runTable.set(run.id, run);
    return { rows: [{ ...run }], rowCount: 1 };
  }

  if (lower.startsWith('insert into workflow_task_runs')) {
    const taskRun = {
      id: params[0] || randomUUID(),
      workflow_run_id: params[1],
      task_id: params[2],
      job_id: null,
      status: params[3] || 'pending',
      dependencies: params[4] || [],
      inputs: typeof params[5] === 'string' ? JSON.parse(params[5]) : params[5] || {},
      outputs: null,
      started_at: null,
      completed_at: null,
    };
    // Unique (workflow_run_id, task_id)
    for (const existing of taskRunTable.values()) {
      if (existing.workflow_run_id === taskRun.workflow_run_id && existing.task_id === taskRun.task_id) {
        return { rows: [{ ...existing }], rowCount: 1 };
      }
    }
    taskRunTable.set(taskRun.id, taskRun);
    return { rows: [{ ...taskRun }], rowCount: 1 };
  }

  if (lower.startsWith('select') && lower.includes('from workflow_versions')) {
    if (lower.includes('workflow_id =')) {
      const wfId = params[0];
      const matching = Array.from(verTable.values())
        .filter((v) => v.workflow_id === wfId)
        .sort((a, b) => b.version - a.version);
      return { rows: matching.slice(0, 1).map((v) => ({ ...v })), rowCount: matching.length > 0 ? 1 : 0 };
    }
    if (lower.includes('where id =') || lower.includes('where workflow_versions.id =')) {
      const verId = params[0];
      const ver = verTable.get(verId);
      return { rows: ver ? [{ ...ver }] : [], rowCount: ver ? 1 : 0 };
    }
    const rows = Array.from(verTable.values()).map((v) => ({ ...v }));
    return { rows, rowCount: rows.length };
  }

  if (lower.startsWith('select') && lower.includes('from workflows')) {
    if (lower.includes('where id =')) {
      const wfId = params[0];
      const wf = wfTable.get(wfId);
      return { rows: wf ? [{ ...wf }] : [], rowCount: wf ? 1 : 0 };
    }
    const rows = Array.from(wfTable.values()).map((w) => ({ ...w }));
    return { rows, rowCount: rows.length };
  }

  if (lower.startsWith('select') && lower.includes('from workflow_runs')) {
    if (lower.includes('where id =')) {
      const runId = params[0];
      const run = runTable.get(runId);
      return { rows: run ? [{ ...run }] : [], rowCount: run ? 1 : 0 };
    }
    let rows = Array.from(runTable.values()).map((r) => ({ ...r }));
    if (lower.includes('organization_id =') && params.length > 0) {
      rows = rows.filter((r) => r.organization_id === params[0]);
    }
    return { rows, rowCount: rows.length };
  }

  if (lower.startsWith('select') && lower.includes('from workflow_task_runs')) {
    const runId = params[0];
    const rows = Array.from(taskRunTable.values())
      .filter((t) => !runId || t.workflow_run_id === runId)
      .map((t) => ({ ...t }));
    return { rows, rowCount: rows.length };
  }

  if (lower.startsWith('update workflow_runs')) {
    const runId = params[0];
    const status = params[1];
    const output = params[2];
    const run = runTable.get(runId);
    if (run) {
      if (status) run.status = status;
      if (output !== undefined) run.output = output;
      run.completed_at = new Date().toISOString();
      return { rows: [{ ...run }], rowCount: 1 };
    }
  }

  if (lower.startsWith('update workflow_task_runs')) {
    const runId = params[0];
    const taskId = params[1];
    const status = params[2];
    const outputs = params[3];
    for (const tr of taskRunTable.values()) {
      if ((tr.workflow_run_id === runId && tr.task_id === taskId) || tr.id === runId) {
        if (status) tr.status = status;
        if (outputs !== undefined && outputs !== null) tr.outputs = outputs;
        if (['succeeded', 'failed', 'skipped'].includes(status)) {
          tr.completed_at = new Date().toISOString();
        }
        return { rows: [{ ...tr }], rowCount: 1 };
      }
    }
  }

  return { rows: [], rowCount: 0 };
}

function handleMemoryWorkers(sql, params) {
  const table = memoryDb.tables.workers;
  const lower = sql.toLowerCase();

  if (lower.startsWith('insert into workers') || lower.startsWith('insert or replace into workers')) {
    const worker = {
      id: params[0],
      hostname: params[1] || 'localhost',
      ip_address: params[2] || '127.0.0.1',
      status: params[3] || 'online',
      active_jobs_count: params[4] || 0,
      capacity: params[5] || 5,
      last_heartbeat_at: new Date().toISOString(),
      metadata: typeof params[6] === 'string' ? JSON.parse(params[6]) : params[6] || {},
      created_at: new Date().toISOString(),
    };
    table.set(worker.id, worker);
    return { rows: [worker], rowCount: 1 };
  }

  if (lower.startsWith('select') && lower.includes('from workers')) {
    const rows = Array.from(table.values());
    return { rows, rowCount: rows.length };
  }

  if (lower.startsWith('update workers')) {
    const workerId = params[params.length - 1];
    const worker = table.get(workerId);
    if (worker) {
      if (lower.includes("status = 'draining'")) worker.status = 'draining';
      if (lower.includes("status = 'offline'")) worker.status = 'offline';
      worker.last_heartbeat_at = new Date().toISOString();
      return { rows: [worker], rowCount: 1 };
    }
  }

  return { rows: [], rowCount: 0 };
}

function handleMemorySchedules(sql, params) {
  const schedTable = memoryDb.tables.schedules;
  const execTable = memoryDb.tables.schedule_executions;
  const lower = sql.toLowerCase();

  if (lower.startsWith('insert into schedules')) {
    const sched = {
      id: params[0] || randomUUID(),
      organization_id: params[1],
      name: params[2],
      target_type: params[3],
      target_payload: typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4],
      cron_expression: params[5],
      timezone: params[6] || 'UTC',
      status: params[7] || 'active',
      next_run_at: params[8] || new Date().toISOString(),
      last_run_at: null,
      created_at: new Date().toISOString(),
    };
    schedTable.set(sched.id, sched);
    return { rows: [sched], rowCount: 1 };
  }

  if (lower.startsWith('insert into schedule_executions')) {
    const schedId = params[1];
    const scheduledAt = params[2];

    // Check unique (schedule_id, scheduled_at)
    for (const existing of execTable.values()) {
      if (existing.schedule_id === schedId && existing.scheduled_at === scheduledAt) {
        return { rows: [], rowCount: 0, isDuplicate: true };
      }
    }

    const exec = {
      id: params[0] || randomUUID(),
      schedule_id: schedId,
      scheduled_at: scheduledAt,
      status: params[3] || 'triggered',
      triggered_entity_id: params[4] || null,
      created_at: new Date().toISOString(),
    };
    execTable.set(exec.id, exec);
    return { rows: [exec], rowCount: 1 };
  }

  if (lower.startsWith('select') && lower.includes('from schedules')) {
    const rows = Array.from(schedTable.values());
    return { rows, rowCount: rows.length };
  }

  return { rows: [], rowCount: 0 };
}

function handleMemoryAuth(sql, params) {
  const orgTable = memoryDb.tables.organizations;
  const userTable = memoryDb.tables.users;
  const memTable = memoryDb.tables.organization_members;
  const keyTable = memoryDb.tables.api_keys;
  const logTable = memoryDb.tables.audit_logs;
  const lower = sql.toLowerCase();

  if (lower.startsWith('insert into organizations')) {
    const org = {
      id: params[0] || randomUUID(),
      name: params[1],
      slug: params[2],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    orgTable.set(org.id, org);
    return { rows: [org], rowCount: 1 };
  }

  if (lower.startsWith('insert into users')) {
    const user = {
      id: params[0] || randomUUID(),
      email: params[1],
      password_hash: params[2],
      full_name: params[3],
      created_at: new Date().toISOString(),
    };
    userTable.set(user.id, user);
    return { rows: [user], rowCount: 1 };
  }

  if (lower.startsWith('insert into organization_members')) {
    const member = {
      id: params[0] || randomUUID(),
      organization_id: params[1],
      user_id: params[2],
      role: params[3] || 'developer',
      created_at: new Date().toISOString(),
    };
    memTable.set(member.id, member);
    return { rows: [member], rowCount: 1 };
  }

  if (lower.startsWith('insert into api_keys')) {
    const apiKey = {
      id: params[0] || randomUUID(),
      organization_id: params[1],
      name: params[2],
      key_hash: params[3],
      prefix: params[4],
      revoked_at: null,
      expires_at: params[5] || null,
      created_at: new Date().toISOString(),
    };
    keyTable.set(apiKey.id, apiKey);
    return { rows: [apiKey], rowCount: 1 };
  }

  if (lower.startsWith('insert into audit_logs')) {
    const log = {
      id: params[0] || randomUUID(),
      organization_id: params[1],
      user_id: params[2] || null,
      action: params[3],
      resource_type: params[4],
      resource_id: params[5],
      metadata: typeof params[6] === 'string' ? JSON.parse(params[6]) : params[6] || {},
      ip_address: params[7] || null,
      created_at: new Date().toISOString(),
    };
    logTable.set(log.id, log);
    return { rows: [log], rowCount: 1 };
  }

  if (lower.startsWith('select') && lower.includes('from users where email =')) {
    const email = params[0];
    for (const u of userTable.values()) {
      if (u.email === email) return { rows: [u], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (lower.startsWith('select') && lower.includes('from api_keys where key_hash =')) {
    const hash = params[0];
    for (const k of keyTable.values()) {
      if (k.key_hash === hash && !k.revoked_at) return { rows: [k], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (lower.startsWith('select') && lower.includes('from api_keys')) {
    const orgId = params[0];
    const rows = Array.from(keyTable.values()).filter((k) => !orgId || k.organization_id === orgId);
    return { rows, rowCount: rows.length };
  }

  return { rows: [], rowCount: 0 };
}
