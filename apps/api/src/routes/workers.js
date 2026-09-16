import { WorkerRepository } from '@pulsemesh/database';

export async function handleWorkerRoutes(req, res, url, body, authContext) {
  // GET /api/v1/workers
  if (url.pathname === '/api/v1/workers' && req.method === 'GET') {
    const workers = await WorkerRepository.listWorkers();
    return sendJson(res, 200, { success: true, data: workers });
  }

  // POST /api/v1/workers/:id/drain
  if (url.pathname.match(/^\/api\/v1\/workers\/[^/]+\/drain$/) && req.method === 'POST') {
    const workerId = url.pathname.split('/')[4];
    const updated = await WorkerRepository.setWorkerDraining(workerId);
    return sendJson(res, 200, { success: true, data: updated });
  }

  // POST /api/v1/workers/heartbeat
  if (url.pathname === '/api/v1/workers/heartbeat' && req.method === 'POST') {
    const workerData = body || {};
    if (!workerData.id) {
      return sendJson(res, 400, { error: { code: 'INVALID_INPUT', message: 'Worker ID required' } });
    }
    const worker = await WorkerRepository.registerHeartbeat(workerData);
    return sendJson(res, 200, { success: true, data: worker });
  }

  return false;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
  return true;
}
