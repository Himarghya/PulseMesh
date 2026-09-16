import { SlidingWindowRateLimiter } from '@pulsemesh/shared';
import { config } from '../config.js';

const defaultLimiter = new SlidingWindowRateLimiter(config.rateLimit.maxPerMinute, 60000);
const bulkLimiter = new SlidingWindowRateLimiter(config.rateLimit.bulkMaxPerMinute, 60000);

export function checkRateLimit(req, isBulk = false) {
  const key = req.headers['x-api-key'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anonymous';
  const limiter = isBulk ? bulkLimiter : defaultLimiter;
  return limiter.check(key);
}
