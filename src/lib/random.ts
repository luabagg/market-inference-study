import type { Rng } from "@/estatistica";

/** mulberry32: small, fast, and deterministic for a given seed. */
export const seededRng = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Standard normal via Box–Muller. */
export const normal = (rng: Rng) => {
  const u = 1 - rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
};

export const logistic = (x: number) => 1 / (1 + Math.exp(-x));

/** Index drawn with probability proportional to `cumulative[i] - cumulative[i-1]`. */
export const pickWeighted = (cumulative: Float64Array, rng: Rng) => {
  const target = rng() * cumulative[cumulative.length - 1];
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};
