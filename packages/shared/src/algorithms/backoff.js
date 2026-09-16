/**
 * PulseMesh Retry & Backoff Algorithms
 */

/**
 * Calculates retry delay with exponential backoff and jitter algorithms.
 * Full Jitter: random_between(0, min(maxDelay, baseDelay * factor^(attempt - 1)))
 * Equal Jitter: (temp / 2) + random_between(0, temp / 2)
 *
 * @param {number} attemptNumber
 * @param {{baseDelayMs?: number, maxDelayMs?: number, factor?: number, jitter?: 'full'|'equal'|'none'}} options
 * @returns {number}
 */
export function calculateBackoffDelay(attemptNumber, options = {}) {
  const {
    baseDelayMs = 2000,
    maxDelayMs = 60000,
    factor = 2,
    jitter = 'full',
  } = options;

  const attempt = Math.max(1, attemptNumber);
  const calculated = baseDelayMs * Math.pow(factor, attempt - 1);
  const capped = Math.min(calculated, maxDelayMs);

  if (jitter === 'none') {
    return Math.floor(capped);
  }

  if (jitter === 'full') {
    return Math.floor(Math.random() * capped);
  }

  if (jitter === 'equal') {
    const half = capped / 2;
    return Math.floor(half + Math.random() * half);
  }

  return Math.floor(capped);
}
