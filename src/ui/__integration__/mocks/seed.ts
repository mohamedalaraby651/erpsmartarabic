/**
 * Deterministic PRNG + id helpers — UX-1E.
 *
 * @canonicalState Spike
 * @since UX-1E
 *
 * No `Date.now()`, no `Math.random()`, no `crypto.randomUUID()`. The fitness
 * check `check-integration-scope` enforces this on every file under
 * `src/ui/__integration__/mocks/**`.
 */

/** Mulberry32 PRNG — 32-bit state, period 2^32. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededId(prefix: string, n: number, width = 6): string {
  return `${prefix}-${String(n).padStart(width, "0")}`;
}

export function pick<T>(rng: () => number, arr: ReadonlyArray<T>): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

export function rngInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Deterministic ISO date (no Date.now); derived from a seeded offset in days. */
export function seededIsoDate(offsetDays: number): string {
  // Epoch anchor: 2026-01-01T00:00:00Z
  const ANCHOR = 1767225600000;
  const ms = ANCHOR + offsetDays * 86400000;
  return new Date(ms).toISOString();
}

export const SEED = 1234;
