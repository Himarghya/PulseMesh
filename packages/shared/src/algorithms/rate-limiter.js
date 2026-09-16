/**
 * PulseMesh Sliding Window Rate Limiter
 */

export class SlidingWindowRateLimiter {
  /**
   * @param {number} maxRequests
   * @param {number} windowSizeMs
   */
  constructor(maxRequests = 100, windowSizeMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowSizeMs = windowSizeMs;
    this.hits = new Map();
  }

  /**
   * Checks whether the request is allowed under the rate limit.
   *
   * @param {string} key
   * @param {number} now
   * @returns {{allowed: boolean, limit: number, remaining: number, resetMs: number}}
   */
  check(key, now = Date.now()) {
    const windowStart = now - this.windowSizeMs;
    let timestamps = this.hits.get(key) || [];

    // Purge expired hits
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0];
      const resetMs = Math.max(0, oldest + this.windowSizeMs - now);
      this.hits.set(key, timestamps);
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetMs,
      };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);

    return {
      allowed: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - timestamps.length,
      resetMs: this.windowSizeMs,
    };
  }

  reset(key) {
    if (key) {
      this.hits.delete(key);
    } else {
      this.hits.clear();
    }
  }
}
