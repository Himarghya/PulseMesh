import { query } from '@pulsemesh/database';

export async function handleHealthRoutes(req, res, url) {
  if (url.pathname === '/healthz' || url.pathname === '/health') {
    let dbOk = true;
    try {
      await query('SELECT 1;');
    } catch {
      dbOk = false;
    }

    res.writeHead(dbOk ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: dbOk ? 'healthy' : 'degraded',
        database: dbOk ? 'connected' : 'unreachable',
        timestamp: new Date().toISOString(),
      })
    );
    return true;
  }

  return false;
}
