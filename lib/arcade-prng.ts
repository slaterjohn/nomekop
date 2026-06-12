// Tiny deterministic PRNG for the secret arcade. Math.random() makes tests
// flaky (and is off-limits in this codebase's test-critical paths), so every
// game seeds a mulberry32 generator from a prop. Tests pass a fixed seed for
// reproducible layouts; production seeds from `performance.now()|0` at mount.

export type Rng = {
  /** Float in [0, 1). */
  next: () => number;
  /** Integer in [0, max). */
  int: (max: number) => number;
  /** In-place Fisher–Yates shuffle, returning the same array. */
  shuffle: <T>(arr: T[]) => T[];
};

/**
 * mulberry32 — a fast, well-distributed 32-bit seeded generator. Same seed in,
 * same sequence out (the whole point: deterministic games under test).
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (max: number) => (max <= 0 ? 0 : Math.floor(next() * max));
  const shuffle = <T>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = int(i + 1);
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
    return arr;
  };
  return { next, int, shuffle };
}

/**
 * A production seed that varies per mount without touching Date in render.
 * `performance.now()` is a monotonic clock; OR-ing with a constant guarantees a
 * non-zero 32-bit int even if the clock reads 0 (jsdom). Call from an event or
 * mount effect, never during render.
 */
export function makeSeed(): number {
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  return (Math.floor(now) ^ 0x9e3779b9) >>> 0 || 0x9e3779b9;
}
