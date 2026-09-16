/**
 * Poison Pill Task Handler (Chaos & Dead-Letter Queue Testing)
 * 
 * Intentionally throws a fatal exception when executed to simulate
 * poison pill payloads, corrupt records, or unrecoverable external failures.
 * Used to verify retry exhaustion and Dead Letter Queue (DLQ) routing.
 */
export async function handlePoisonTask(payload = {}, context = {}) {
  const errorType = payload.errorType || 'FATAL_CORRUPTION_SIMULATION';
  const customMessage = payload.message || 'Malformed unprocessable payload encountered';
  
  // Brief delay to simulate execution attempt before crashing
  await new Promise((resolve) => setTimeout(resolve, 80));

  const jobId = context.jobId || 'unknown';
  throw new Error(`[POISON_PILL] ${errorType}: ${customMessage} (Job ID: ${jobId})`);
}

