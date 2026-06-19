/**
 * Color tokens — UX-1A
 *
 * Semantic colors are sourced exclusively from CSS variables defined in
 * `src/index.css`. Consumers must read values via `hsl(var(--...))`
 * (Tailwind classes such as `bg-primary`) or via this map.
 *
 * Never hardcode HSL/HEX/RGB values in `src/ui/**` or `src/workspaces/**`.
 * Pipeline:  Semantic Tokens → CSS Variables → Tailwind Theme → React
 */

export const colorTokens = {
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",

  surface: {
    1: "hsl(var(--surface-1))",
    2: "hsl(var(--surface-2))",
    3: "hsl(var(--surface-3))",
    sunken: "hsl(var(--surface-sunken))",
  },

  card: {
    DEFAULT: "hsl(var(--card))",
    foreground: "hsl(var(--card-foreground))",
  },
  popover: {
    DEFAULT: "hsl(var(--popover))",
    foreground: "hsl(var(--popover-foreground))",
  },

  primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
    soft: "hsl(var(--primary-soft))",
  },
  secondary: {
    DEFAULT: "hsl(var(--secondary))",
    foreground: "hsl(var(--secondary-foreground))",
  },
  accent: {
    DEFAULT: "hsl(var(--accent))",
    foreground: "hsl(var(--accent-foreground))",
  },
  muted: {
    DEFAULT: "hsl(var(--muted))",
    foreground: "hsl(var(--muted-foreground))",
  },

  destructive: {
    DEFAULT: "hsl(var(--destructive))",
    foreground: "hsl(var(--destructive-foreground))",
  },
  success: {
    DEFAULT: "hsl(var(--success))",
    foreground: "hsl(var(--success-foreground))",
  },
  warning: {
    DEFAULT: "hsl(var(--warning))",
    foreground: "hsl(var(--warning-foreground))",
  },
  info: {
    DEFAULT: "hsl(var(--info))",
    foreground: "hsl(var(--info-foreground))",
  },

  border: "hsl(var(--border))",
  borderStrong: "hsl(var(--border-strong))",
  input: "hsl(var(--input))",
  ring: "hsl(var(--ring))",
} as const;

export type ColorTokens = typeof colorTokens;
