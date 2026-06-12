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
  ) {}

  /** True if the caller may proceed (consumes one token). */
  consume(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, lastRefill: now };
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
    this.buckets.set(key, bucket);
    return true;
  }
}

export const pdfLimiter = new TokenBucketLimiter();
