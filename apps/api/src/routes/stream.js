const sseClients = new Set();

// Periodic keepalive to keep proxy connections alive
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(':keepalive\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 15000);

export function broadcastSseEvent(eventType, payload) {
  const data = JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() });
  for (const client of sseClients) {
    try {
      client.write(`event: pulse\ndata: ${data}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

export function handleStreamRoutes(req, res, url) {
  if (url.pathname === '/api/v1/stream/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    res.write('event: connected\ndata: {"status":"connected"}\n\n');
    sseClients.add(res);

    const cleanup = () => {
      sseClients.delete(res);
    };

    req.on('close', cleanup);
    req.on('end', cleanup);
    req.on('error', cleanup);
    res.on('error', cleanup);
    res.on('close', cleanup);

    return true;
  }

  return false;
}
