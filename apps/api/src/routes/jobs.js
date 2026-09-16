import { JobRepository } from '@pulsemesh/database';
import { checkRateLimit } from '../middleware/rate-limiter.js';
import { JobStatus } from '@pulsemesh/shared';

export async function handleJobRoutes(req, res, url, body, authContext) {
  // POST /api/v1/jobs (Single Job Submit)
  if (url.pathname === '/api/v1/jobs' && req.method === 'POST') {
    if (!authContext) {
      return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const rate = checkRateLimit(req, false);
    if (!rate.allowed) {
      return sendJson(res, 429, { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } });
    }

    const { type, queue_name, payload, priority, idempotency_key, max_attempts, backoff_type, backoff_delay_ms, timeout_ms } = body || {};
    if (!type) {
      return sendJson(res, 400, { error: { code: 'INVALID_INPUT', message: 'Job `type` is required' } });
    }

    try {
      const job = await JobRepository.createJob({
        organizationId: authContext.organizationId,
        type,
        queueName: queue_name || 'default',
        payload: payload || {},
        priority: priority ?? 5,
        idempotencyKey: idempotency_key || null,
        maxAttempts: max_attempts ?? 3,
        backoffType: backoff_type || 'exponential',
        backoffDelayMs: backoff_delay_ms ?? 2000,
        timeoutMs: timeout_ms ?? 60000,
      });

      return sendJson(res, 201, {
        success: true,
        data: {
          id: job.id,
          queueName: job.queue_name,
          type: job.type,
          status: job.status,
          priority: job.priority,
          attempts: job.attempt_number,
          createdAt: job.created_at,
        },
      });
    } catch (err) {
      return sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  // POST /api/v1/jobs/bulk (Bulk Job Submission)
  if (url.pathname === '/api/v1/jobs/bulk' && req.method === 'POST') {
    if (!authContext) {
      return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const rate = checkRateLimit(req, true);
    if (!rate.allowed) {
      return sendJson(res, 429, { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Bulk rate limit exceeded' } });
    }

    const { jobs: jobList } = body || {};
    if (!Array.isArray(jobList) || jobList.length === 0) {
      return sendJson(res, 400, { error: { code: 'INVALID_INPUT', message: 'Array of `jobs` is required' } });
    }

    const created = [];
    for (const item of jobList) {
      const job = await JobRepository.createJob({
        organizationId: authContext.organizationId,
        type: item.type || 'generic_task',
        queueName: item.queue_name || 'default',
        payload: item.payload || {},
        priority: item.priority ?? 5,
        idempotencyKey: item.idempotency_key || null,
      });
      created.push({ id: job.id, status: job.status });
    }

    return sendJson(res, 201, { success: true, data: { count: created.length, jobs: created } });
  }

  // GET /api/v1/jobs (List & Filter Jobs)
  if (url.pathname === '/api/v1/jobs' && req.method === 'GET') {
    if (!authContext) {
      return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const filters = {
      status: url.searchParams.get('status'),
      queueName: url.searchParams.get('queue'),
      type: url.searchParams.get('type'),
    };
    const jobs = await JobRepository.listJobs(authContext.organizationId, filters);
    return sendJson(res, 200, { success: true, data: jobs });
  }

  // GET /api/v1/jobs/:id/attempts
  if (url.pathname.match(/^\/api\/v1\/jobs\/[^/]+\/attempts$/) && req.method === 'GET') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const jobId = url.pathname.split('/')[4];
    const attempts = await JobRepository.getJobAttempts(jobId);
    return sendJson(res, 200, { success: true, data: attempts });
  }

  // GET /api/v1/jobs/:id/events
  if (url.pathname.match(/^\/api\/v1\/jobs\/[^/]+\/events$/) && req.method === 'GET') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const jobId = url.pathname.split('/')[4];
    const events = await JobRepository.getJobEvents(jobId);
    return sendJson(res, 200, { success: true, data: events });
  }

  // GET /api/v1/jobs/:id
  if (url.pathname.match(/^\/api\/v1\/jobs\/[^/]+$/) && req.method === 'GET') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const jobId = url.pathname.split('/')[4];
    const job = await JobRepository.getJobById(jobId);
    if (!job) return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Job not found' } });
    return sendJson(res, 200, { success: true, data: job });
  }

  // POST /api/v1/jobs/:id/cancel
  if (url.pathname.match(/^\/api\/v1\/jobs\/[^/]+\/cancel$/) && req.method === 'POST') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const jobId = url.pathname.split('/')[4];
    const job = await JobRepository.cancelJob(jobId);
    return sendJson(res, 200, { success: true, data: job });
  }

  // POST /api/v1/jobs/:id/retry
  if (url.pathname.match(/^\/api\/v1\/jobs\/[^/]+\/retry$/) && req.method === 'POST') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const jobId = url.pathname.split('/')[4];
    const job = await JobRepository.retryJob(jobId);
    return sendJson(res, 200, { success: true, data: job });
  }

  return false;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
  return true;
}
