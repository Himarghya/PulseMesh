const sseClients = new Set();

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
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    res.write('event: connected\ndata: {"status":"connected"}\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });

    return true;
  }

  return false;
}
