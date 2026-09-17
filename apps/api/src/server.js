import http from 'http';
import { URL } from 'url';
import { config } from './config.js';
import { authenticateRequest } from './middleware/auth.js';
import { handleAuthRoutes } from './routes/auth.js';
import { handleJobRoutes } from './routes/jobs.js';
import { handleWorkflowRoutes } from './routes/workflows.js';
import { handleQueueRoutes } from './routes/queues.js';
import { handleWorkerRoutes } from './routes/workers.js';
import { handleScheduleRoutes } from './routes/schedules.js';
import { handleStreamRoutes } from './routes/stream.js';
import { handleMetricsRoutes } from './routes/metrics.js';
import { handleHealthRoutes } from './routes/health.js';

export function createServer() {
  const server = http.createServer(async (req, res) => {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const host = req.headers.host || `localhost:${config.port}`;
    const url = new URL(req.url, `http://${host}`);

    // Fast-path routes (SSE / Health / Metrics)
    if (handleStreamRoutes(req, res, url)) return;
    if (await handleHealthRoutes(req, res, url)) return;
    if (await handleMetricsRoutes(req, res, url)) return;

    // Parse Body
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const text = Buffer.concat(buffers).toString('utf8');
        body = text ? JSON.parse(text) : {};
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { code: 'INVALID_JSON', message: 'Malformed JSON payload' } }));
      }
    }

    // Rate limiting check
    const isAuthRoute = url.pathname.startsWith('/api/v1/auth');
    const isBulkRoute = url.pathname.includes('/bulk');
    const rateLimitType = isAuthRoute ? 'auth' : isBulkRoute ? 'bulk' : 'default';

    if (!checkRateLimit(req, rateLimitType)) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
      return res.end(JSON.stringify({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: isAuthRoute
            ? 'Too many authentication attempts. Please wait before retrying.'
            : 'Rate limit exceeded. Please throttle requests.'
        }
      }));
    }

    // Authenticate
    const authContext = await authenticateRequest(req, config.jwtSecret);

    // Route dispatch
    try {
      if (await handleAuthRoutes(req, res, url, body, authContext)) return;
      if (await handleJobRoutes(req, res, url, body, authContext)) return;
      if (await handleWorkflowRoutes(req, res, url, body, authContext)) return;
      if (await handleQueueRoutes(req, res, url, body, authContext)) return;
      if (await handleWorkerRoutes(req, res, url, body, authContext)) return;
      if (await handleScheduleRoutes(req, res, url, body, authContext)) return;

      // 404 Not Found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${url.pathname}` } }));
    } catch (err) {
      console.error('[API Server Error]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'An internal error occurred. Please try again.' } }));
    }
  });

  return server;
}
