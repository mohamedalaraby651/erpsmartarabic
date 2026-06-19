/**
 * Elevation tokens — UX-1A
 *
 * Layered shadows sourced from CSS variables (`--shadow-*`). Components
 * must consume them via Tailwind utilities (`shadow-md`) or the map below.
 */

export const elevationTokens = {
  none: "none",
  xs: "var(--shadow-xs)",
  sm: "var(--shadow-sm)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)",
  xl: "var(--shadow-xl)",
  focus: "var(--shadow-focus)",
} as const;

export type ElevationTokens = typeof elevationTokens;
