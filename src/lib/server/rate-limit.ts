import "server-only";

/**
 * In-memory sliding-window rate limiter with a hard cap on tracked keys. Good for a single
 * instance (the recommended Docker deployment). With several instances, keep this as a second
 * layer and enforce the primary limit at the CDN/WAF (see DEPLOYMENT.md).
 */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  /** Records a hit and returns whether it is allowed. */
  take(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const since = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      const oldest = recent[0] ?? now;
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000)),
      };
    }
    recent.push(now);
    this.hits.delete(key); // re-insert to keep Map order = least recently used first
    this.hits.set(key, recent);
    if (this.hits.size > this.maxKeys) this.evict(since);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private evict(since: number): void {
    for (const [key, times] of this.hits) {
      if (times.every((t) => t <= since)) this.hits.delete(key);
    }
    // still too many: drop least recently used
    while (this.hits.size > this.maxKeys) {
      const first = this.hits.keys().next();
      if (first.done) break;
      this.hits.delete(first.value);
    }
  }

  size(): number {
    return this.hits.size;
  }
}
