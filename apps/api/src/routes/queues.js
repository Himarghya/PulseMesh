import { JobRepository, query } from '@pulsemesh/database';

const pausedQueues = new Set();

export async function handleQueueRoutes(req, res, url, body, authContext) {
  // GET /api/v1/queues (Queue Explorer Summary)
  if (url.pathname === '/api/v1/queues' && req.method === 'GET') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });

    const jobs = await JobRepository.listJobs(authContext.organizationId);
    const queueMap = new Map();

    for (const job of jobs) {
      const qName = job.queue_name || 'default';
      if (!queueMap.has(qName)) {
        queueMap.set(qName, {
          name: qName,
          isPaused: pausedQueues.has(qName),
          counts: {
            queued: 0,
            running: 0,
            retry_wait: 0,
            succeeded: 0,
            failed: 0,
            cancelled: 0,
            dead_letter: 0,
            total: 0,
          },
          priorityDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 },
        });
      }

      const q = queueMap.get(qName);
      q.counts.total += 1;
      if (q.counts[job.status] !== undefined) {
        q.counts[job.status] += 1;
      }
      if (job.priority && q.priorityDistribution[job.priority] !== undefined) {
        q.priorityDistribution[job.priority] += 1;
      }
    }

    // Include default queue if empty
    if (queueMap.size === 0) {
      queueMap.set('default', {
        name: 'default',
        isPaused: pausedQueues.has('default'),
        counts: { queued: 0, running: 0, retry_wait: 0, succeeded: 0, failed: 0, cancelled: 0, dead_letter: 0, total: 0 },
        priorityDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 },
      });
    }

    return sendJson(res, 200, { success: true, data: Array.from(queueMap.values()) });
  }

  // POST /api/v1/queues/:name/pause
  if (url.pathname.match(/^\/api\/v1\/queues\/[^/]+\/pause$/) && req.method === 'POST') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const name = decodeURIComponent(url.pathname.split('/')[4]);
    pausedQueues.add(name);
    return sendJson(res, 200, { success: true, message: `Queue '${name}' paused.` });
  }

  // POST /api/v1/queues/:name/resume
  if (url.pathname.match(/^\/api\/v1\/queues\/[^/]+\/resume$/) && req.method === 'POST') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const name = decodeURIComponent(url.pathname.split('/')[4]);
    pausedQueues.delete(name);
    return sendJson(res, 200, { success: true, message: `Queue '${name}' resumed.` });
  }

  return false;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
  return true;
}
