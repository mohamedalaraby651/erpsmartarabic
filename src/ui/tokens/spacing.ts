/**
 * Spacing tokens — UX-1A
 *
 * Spacing scale aligned with Tailwind's 4px base unit. Use semantic aliases
 * (`gutter`, `section`) at the layout level and numeric steps at the
 * component level.
 */

export const spacingScale = {
  px: "1px",
  0: "0",
  0.5: "0.125rem", // 2px
  1: "0.25rem",    // 4px
  1.5: "0.375rem", // 6px
  2: "0.5rem",     // 8px
  2.5: "0.625rem", // 10px
  3: "0.75rem",    // 12px
  4: "1rem",       // 16px
  5: "1.25rem",    // 20px
  6: "1.5rem",     // 24px
  8: "2rem",       // 32px
  10: "2.5rem",    // 40px
  12: "3rem",      // 48px
  16: "4rem",      // 64px
  20: "5rem",      // 80px
  24: "6rem",      // 96px
} as const;

export const semanticSpacing = {
  inline: spacingScale[2],
  stack: spacingScale[3],
  gutter: spacingScale[4],
  section: spacingScale[8],
  page: spacingScale[12],
} as const;

export const spacingTokens = {
  scale: spacingScale,
  semantic: semanticSpacing,
} as const;

export type SpacingTokens = typeof spacingTokens;
