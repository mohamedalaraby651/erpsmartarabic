/**
 * Advanced Arabic typography rules (Wave 17).
 *
 * Produces a CSS overlay that prevents tashkeel clipping, fixes
 * descender cut-off (ج ح ع غ), enforces tabular numerals, and
 * applies font-feature-settings required for proper shaping.
 *
 * Layered AFTER `buildArabicCss()` so it overrides defaults when
 * the caller opts in.
 */
import type { PdfConfig } from '../config/pdfConfigSchema';

export interface TypographyRulesOptions {
  /** Heuristic: page has tashkeel (Quranic-style) — extra line height. */
  hasTashkeel?: boolean;
  /** Extra padding-block on text blocks to protect descenders. */
  descenderSafe?: boolean;
}

/**
 * Build the typography overlay CSS. Caller injects it via the engine's
 * payload `css` field or layers it on top of `buildArabicCss().css`.
 */
export function buildTypographyRulesCss(
  cfg: Pick<PdfConfig, 'typography'>,
  opts: TypographyRulesOptions = {},
): string {
  const t = cfg.typography;
  const lh = opts.hasTashkeel ? Math.max(t.lineHeight, 2.0) : t.lineHeight;
  const padY = opts.descenderSafe ? '0.18em' : '0.08em';

  return `
:root {
  --pdf-base-fs: ${t.baseFontSizePx}px;
  --pdf-lh: ${lh};
  --pdf-tracking: ${t.letterSpacing}px;
}
.pdf-root {
  font-size: var(--pdf-base-fs);
  line-height: var(--pdf-lh);
  letter-spacing: var(--pdf-tracking);
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  font-feature-settings: "kern" 1, "liga" 1, "calt" 1, "mark" 1, "mkmk" 1, "ss01" 1;
  font-variant-numeric: tabular-nums;
}
.pdf-root p,
.pdf-root li,
.pdf-root td,
.pdf-root th,
.pdf-root div { padding-block: ${padY}; }
.pdf-root td, .pdf-root th { vertical-align: middle; }
.pdf-root .with-tashkeel { line-height: 2.05; }
.pdf-root .num, .pdf-root .amount {
  font-variant-numeric: tabular-nums;
  unicode-bidi: plaintext;
}
.pdf-root img { max-width: 100%; }
/* Page-break safety for tables (Wave 17 split prevention). */
.pdf-root thead { display: table-header-group; }
.pdf-root tfoot { display: table-footer-group; }
.pdf-root tr { page-break-inside: avoid; break-inside: avoid; }
.pdf-root .avoid-break { page-break-inside: avoid; break-inside: avoid; }
.pdf-root .page-break { page-break-after: always; break-after: page; }
`.trim();
}

/** Heuristic detector for tashkeel-heavy text. */
const TASHKEEL_RE = /[\u064B-\u065F\u0670]/g;
export function detectTashkeel(text: string, minRatio = 0.01): boolean {
  if (!text) return false;
  const matches = text.match(TASHKEEL_RE);
  if (!matches) return false;
  return matches.length / text.length >= minRatio;
}
