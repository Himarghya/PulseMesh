import { SlidingWindowRateLimiter } from '@pulsemesh/shared';
import { config } from '../config.js';

const defaultLimiter = new SlidingWindowRateLimiter(config.rateLimit.maxPerMinute, config.rateLimit.windowMs);
const authLimiter = new SlidingWindowRateLimiter(config.rateLimit.authMaxPerMinute, config.rateLimit.windowMs);
const bulkLimiter = new SlidingWindowRateLimiter(config.rateLimit.bulkMaxPerMinute, config.rateLimit.windowMs);

// Track consecutive auth failures for exponential backoff delay
const authFailures = new Map();

export function checkRateLimit(req, type = 'default') {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || '127.0.0.1';
  const apiKey = req.headers['x-api-key'];
  const key = apiKey ? `key:${apiKey}` : `ip:${ip}`;

  if (type === 'auth') {
    return authLimiter.check(`auth:${key}`);
  } else if (type === 'bulk') {
    return bulkLimiter.check(`bulk:${key}`);
  }
  return defaultLimiter.check(`default:${key}`);
}

export function recordAuthAttempt(key, isSuccess) {
  if (isSuccess) {
    authFailures.delete(key);
  } else {
    const current = authFailures.get(key) || { count: 0, lastFailed: Date.now() };
    current.count += 1;
    current.lastFailed = Date.now();
    authFailures.set(key, current);
  }
}

export function getAuthBackoffMs(key) {
  const record = authFailures.get(key);
  if (!record || record.count <= 1) return 0;
  // Exponential backoff: 250ms, 500ms, 1000ms, 2000ms (max 8000ms) rather than hard lockout
  return Math.min(8000, 250 * Math.pow(2, record.count - 1));
}
