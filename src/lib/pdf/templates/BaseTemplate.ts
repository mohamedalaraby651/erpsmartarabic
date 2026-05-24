/**
 * Reusable header/footer/watermark/page-number primitives for the v2
 * jsPDF engine. Pure draw helpers — they take a jsPDF doc and a
 * PageConfig/Theme and produce side effects on the current page.
 *
 * These helpers are deliberately small and dependency-free so they can
 * be invoked from `didDrawPage` callbacks in jspdf-autotable as well as
 * from custom render loops in InvoiceTemplate / QuotationTemplate.
 */
import type { jsPDF } from 'jspdf';
import {
  resolvePageSize,
  type PageConfig,
} from '../config/PageConfig';
import { DEFAULT_THEME, type PdfTheme } from '../config/ThemeConfig';
import { prepareForPdf } from '../arabic/bidi';

export interface PageChromeContext {
  doc: jsPDF;
  page: PageConfig;
  theme?: PdfTheme;
  currentPage: number;
  totalPages: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '');
  const n = v.length === 3
    ? v.split('').map((c) => c + c).join('')
    : v.padEnd(6, '0');
  const num = parseInt(n.slice(0, 6), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Bottom-right page number, e.g. "صفحة 3 من 12". */
export function drawPageNumber(ctx: PageChromeContext): void {
  const theme = ctx.theme ?? DEFAULT_THEME;
  if (!theme.showPageNumbers) return;
  const { width, height } = resolvePageSize(ctx.page);
  const [r, g, b] = hexToRgb(theme.mutedColor);
  ctx.doc.setTextColor(r, g, b);
  ctx.doc.setFontSize(Math.max(8, theme.baseFontSize - 1));
  const label = prepareForPdf(theme.pageNumberFormat(ctx.currentPage, ctx.totalPages));
  // RTL document: place on the LEFT margin so it reads naturally at the
  // end of a right-to-left page flow.
  const y = height - ctx.page.margins.bottom / 2;
  ctx.doc.text(label, ctx.page.margins.left, y, { align: 'left' });
  // Reset text color so subsequent draws don't inherit muted gray.
  const [tr, tg, tb] = hexToRgb(theme.textColor);
  ctx.doc.setTextColor(tr, tg, tb);
  // Mark width as touched to satisfy the linter when this branch is unused.
  void width;
}

/** Diagonal watermark (e.g. "مسودة" / "مدفوع"). No-op if not configured. */
export function drawWatermark(ctx: PageChromeContext): void {
  const theme = ctx.theme ?? DEFAULT_THEME;
  const wm = theme.watermark;
  if (!wm || !wm.text) return;
  const { width, height } = resolvePageSize(ctx.page);
  const [r, g, b] = hexToRgb(wm.color ?? theme.mutedColor);
  const angle = wm.angle ?? -30;
  const fontSize = wm.fontSize ?? 72;
  const opacity = Math.max(0, Math.min(1, wm.opacity ?? 0.12));

  const anyDoc = ctx.doc as unknown as {
    saveGraphicsState?: () => void;
    restoreGraphicsState?: () => void;
    setGState?: (s: unknown) => unknown;
    GState?: new (o: { opacity: number }) => unknown;
  };

  let restored = false;
  if (anyDoc.saveGraphicsState && anyDoc.setGState && anyDoc.GState) {
    anyDoc.saveGraphicsState();
    anyDoc.setGState(new anyDoc.GState({ opacity }));
    restored = true;
  }

  ctx.doc.setTextColor(r, g, b);
  ctx.doc.setFontSize(fontSize);
  ctx.doc.text(prepareForPdf(wm.text), width / 2, height / 2, {
    align: 'center',
    angle,
    baseline: 'middle',
  });

  if (restored && anyDoc.restoreGraphicsState) {
    anyDoc.restoreGraphicsState();
  }
}

/** Draw a thin separator line under the header band. */
export function drawHeaderRule(ctx: PageChromeContext): void {
  const theme = ctx.theme ?? DEFAULT_THEME;
  const { width } = resolvePageSize(ctx.page);
  const [r, g, b] = hexToRgb(theme.primaryColor);
  ctx.doc.setDrawColor(r, g, b);
  ctx.doc.setLineWidth(0.4);
  ctx.doc.line(
    ctx.page.margins.left,
    ctx.page.margins.top,
    width - ctx.page.margins.right,
    ctx.page.margins.top,
  );
}

/**
 * Compose chrome for a freshly drawn page: watermark first (bottom layer),
 * then header rule, then page number. Use inside `didDrawPage`.
 */
export function applyPageChrome(ctx: PageChromeContext): void {
  drawWatermark(ctx);
  drawHeaderRule(ctx);
  drawPageNumber(ctx);
}
