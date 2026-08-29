/**
 * Builds an Arabic-ready CSS block for HtmlPdfEngine. Embeds the
 * resolved font as `@font-face` (base64 TTF) and applies the strict
 * RTL standard used across the app: right alignment, RTL tables with
 * mirrored padding, consistent line-height for Arabic glyphs, and
 * tabular numerals so amounts align in columns.
 */
import { resolveFont } from '../fonts/fontRegistry';
import type { PdfFontKey } from '@/lib/arabicFont';

export interface ArabicCssOptions {
  fontKey?: PdfFontKey;
  /** Base font size (px) applied to the container. Default 12. */
  baseFontSizePx?: number;
}

export interface ArabicCssResult {
  css: string;
  fontFamily: string;
  fontKey: PdfFontKey;
}

/** Resolve + inline the Arabic font as a self-contained CSS block. */
export async function buildArabicCss(opts: ArabicCssOptions = {}): Promise<ArabicCssResult> {
  // `resolveFont(undefined)` consults the user preference (default: Cairo).
  const font = await resolveFont(opts.fontKey);
  const family = font.config.name || font.key;
  const size = opts.baseFontSizePx ?? 12;
  // Stripping a potential data-URI prefix keeps the @font-face src clean.
  const b64 = font.base64.replace(/^data:[^;]+;base64,/, '');
  const css = `
@font-face {
  font-family: '${family}';
  src: url(data:font/ttf;base64,${b64}) format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}
.pdf-root, .pdf-root * {
  font-family: '${family}';
  direction: rtl;
  unicode-bidi: plaintext;
  -webkit-font-smoothing: antialiased;
}
.pdf-root {
  font-size: ${size}px;
  line-height: 1.7;
  color: #111;
  text-align: right;
  background: #ffffff;
}
.pdf-root table {
  width: 100%;
  border-collapse: collapse;
  direction: rtl;
}
.pdf-root th, .pdf-root td {
  text-align: right;
  padding: 6px 8px;
  border: 1px solid #ddd;
  vertical-align: middle;
}
.pdf-root thead { display: table-header-group; }
.pdf-root tr { page-break-inside: avoid; }
.pdf-root .num, .pdf-root .amount, .pdf-root [data-num] {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  direction: ltr;
  unicode-bidi: embed;
  text-align: left;
}
.pdf-root .ltr { direction: ltr; unicode-bidi: embed; }
.pdf-root img { max-width: 100%; }
`;
  return { css, fontFamily: family, fontKey: font.key };
}
