/**
 * Radius tokens — UX-1A
 *
 * All component radii must derive from `--radius`. Numeric overrides
 * (`rounded-[6px]`) are forbidden inside `src/ui/**`.
 */

export const radiusTokens = {
  none: "0",
  sm: "calc(var(--radius) - 4px)",
  md: "calc(var(--radius) - 2px)",
  lg: "var(--radius)",
  xl: "calc(var(--radius) + 4px)",
  "2xl": "calc(var(--radius) + 8px)",
  full: "9999px",
} as const;

export type RadiusTokens = typeof radiusTokens;
