/**
 * Motion tokens — UX-1A
 *
 * Durations and easings power transitions and animations. Easings are read
 * from CSS variables so the design system can retune them without touching
 * component code.
 */

export const motionDuration = {
  instant: "0ms",
  fast: "120ms",
  base: "180ms",
  slow: "260ms",
  slower: "400ms",
} as const;

export const motionEasing = {
  out: "var(--ease-out-soft)",
  inOut: "var(--ease-in-out-soft)",
  linear: "linear",
} as const;

export const motionTokens = {
  duration: motionDuration,
  easing: motionEasing,
} as const;

export type MotionTokens = typeof motionTokens;
