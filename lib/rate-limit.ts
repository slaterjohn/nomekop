type Bucket = { tokens: number; lastRefill: number };

/**
 * In-memory token bucket per key. PDF rendering is the expensive resource
 * this protects; defaults allow a burst of 5 then 1 render per 10s per IP.
 */
export class TokenBucketLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private capacity = 5,
    private refillIntervalMs = 10_000,
    // Hard cap on tracked keys. The PDF route derives the key from a
    // client-supplied header (x-forwarded-for), so without a bound an attacker
    // could rotate it to grow this map without limit — a memory-exhaustion DoS.
    private maxKeys = 20_000,
  ) {}

  /** True if the caller may proceed (consumes one token). */
  consume(key: string): boolean {
    const now = Date.now();
    const existing = this.buckets.get(key);
    const bucket = existing ?? { tokens: this.capacity, lastRefill: now };
    const refills = Math.floor((now - bucket.lastRefill) / this.refillIntervalMs);
    if (refills > 0) {
      bucket.tokens = Math.min(this.capacity, bucket.tokens + refills);
      bucket.lastRefill += refills * this.refillIntervalMs;
    }
    if (bucket.tokens <= 0) {
      this.buckets.set(key, bucket);
      return false;
    }
    bucket.tokens -= 1;
    if (!existing && this.buckets.size >= this.maxKeys) this.evict(now);
    this.buckets.set(key, bucket);
    return true;
  }

  /** Keep memory bounded under a flood of distinct keys: drop entries that have
   *  fully refilled (indistinguishable from a never-seen key), and if that isn't
   *  enough, reset entirely. */
  private evict(now: number): void {
    for (const [k, b] of this.buckets) {
      const refills = Math.floor((now - b.lastRefill) / this.refillIntervalMs);
      if (b.tokens + refills >= this.capacity) this.buckets.delete(k);
    }
    if (this.buckets.size >= this.maxKeys) this.buckets.clear();
  }

  /** Test/introspection helper. */
  size(): number {
    return this.buckets.size;
  }
}

export const pdfLimiter = new TokenBucketLimiter();
