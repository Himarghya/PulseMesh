import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateBackoffDelay, SlidingWindowRateLimiter, isPrivateIp, validateSsrfUrl } from '@pulsemesh/shared';

describe('Algorithm & Security Unit Tests', () => {
  it('calculates exponential backoff delays with jitter', () => {
    const delay1 = calculateBackoffDelay(1, { baseDelayMs: 1000, factor: 2, jitter: 'none' });
    const delay2 = calculateBackoffDelay(2, { baseDelayMs: 1000, factor: 2, jitter: 'none' });
    const delay3 = calculateBackoffDelay(3, { baseDelayMs: 1000, factor: 2, jitter: 'none' });

    assert.strictEqual(delay1, 1000);
    assert.strictEqual(delay2, 2000);
    assert.strictEqual(delay3, 4000);

    const jitterDelay = calculateBackoffDelay(3, { baseDelayMs: 1000, factor: 2, jitter: 'full' });
    assert.ok(jitterDelay >= 0 && jitterDelay <= 4000);
  });

  it('enforces sliding window rate limiter thresholds', () => {
    const limiter = new SlidingWindowRateLimiter(3, 1000); // 3 requests per second
    const now = 10000;

    assert.strictEqual(limiter.check('client-1', now).allowed, true);
    assert.strictEqual(limiter.check('client-1', now + 100).allowed, true);
    assert.strictEqual(limiter.check('client-1', now + 200).allowed, true);

    // 4th request within 1s window should be rejected
    const blocked = limiter.check('client-1', now + 300);
    assert.strictEqual(blocked.allowed, false);

    // After 1000ms, request should be allowed again
    const later = limiter.check('client-1', now + 1100);
    assert.strictEqual(later.allowed, true);
  });

  it('blocks private IP addresses and cloud metadata from SSRF', () => {
    assert.strictEqual(isPrivateIp('127.0.0.1'), true);
    assert.strictEqual(isPrivateIp('localhost'), true);
    assert.strictEqual(isPrivateIp('169.254.169.254'), true); // AWS/GCP metadata
    assert.strictEqual(isPrivateIp('10.0.4.1'), true);
    assert.strictEqual(isPrivateIp('192.168.1.1'), true);
    assert.strictEqual(isPrivateIp('172.20.0.1'), true);
    assert.strictEqual(isPrivateIp('8.8.8.8'), false); // Public DNS
  });
});
