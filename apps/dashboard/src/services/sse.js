/**
 * Server-Sent Events client for real-time live pulse streaming
 */
export function connectEventStream(onEvent, onError) {
  const eventSource = new EventSource('/api/v1/stream/events');

  eventSource.addEventListener('pulse', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (onEvent) onEvent(data);
    } catch {}
  });

  eventSource.onerror = (err) => {
    if (onError) onError(err);
  };

  return () => {
    eventSource.close();
  };
}
