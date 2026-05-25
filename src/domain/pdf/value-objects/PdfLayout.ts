/**
 * PdfLayout — value object يصف هيئة الصفحة (الحجم، الاتجاه، الهوامش).
 * نقي تماماً: بدون React/Supabase/DOM.
 */

export type PaperSize = 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal';
export type PageOrientation = 'portrait' | 'landscape';

export interface PageMargins {
  top: number;    // mm
  right: number;  // mm
  bottom: number; // mm
  left: number;   // mm
}

export interface PdfLayout {
  pageSize: PaperSize;
  orientation: PageOrientation;
  margins: PageMargins;
}

export const DEFAULT_LAYOUT: PdfLayout = Object.freeze({
  pageSize: 'A4',
  orientation: 'portrait',
  margins: { top: 15, right: 12, bottom: 15, left: 12 },
});

/** الحد الأدنى للهوامش القابلة للطباعة على معظم الطابعات (mm). */
export const MIN_PRINTABLE_MARGIN_MM = 5;
/** الحد الموصى به للهوامش الآمنة. */
export const SAFE_PRINTABLE_MARGIN_MM = 8;

export interface LayoutValidationIssue {
  field: 'top' | 'right' | 'bottom' | 'left' | 'pageSize' | 'orientation';
  severity: 'error' | 'warning';
  message: string;
}

const VALID_SIZES: PaperSize[] = ['A3', 'A4', 'A5', 'Letter', 'Legal'];
const VALID_ORIENTATIONS: PageOrientation[] = ['portrait', 'landscape'];

export function validateLayout(layout: PdfLayout): LayoutValidationIssue[] {
  const issues: LayoutValidationIssue[] = [];

  if (!VALID_SIZES.includes(layout.pageSize)) {
    issues.push({
      field: 'pageSize',
      severity: 'error',
      message: `حجم الصفحة غير مدعوم: ${layout.pageSize}`,
    });
  }
  if (!VALID_ORIENTATIONS.includes(layout.orientation)) {
    issues.push({
      field: 'orientation',
      severity: 'error',
      message: `اتجاه الصفحة غير صالح: ${layout.orientation}`,
    });
  }

  (['top', 'right', 'bottom', 'left'] as const).forEach((side) => {
    const v = layout.margins[side];
    if (typeof v !== 'number' || Number.isNaN(v)) {
      issues.push({
        field: side,
        severity: 'error',
        message: `الهامش ${side} ليس رقماً صالحاً`,
      });
      return;
    }
    if (v < 0 || v > 100) {
      issues.push({
        field: side,
        severity: 'error',
        message: `الهامش ${side} خارج النطاق المسموح (0-100mm)`,
      });
      return;
    }
    if (v < MIN_PRINTABLE_MARGIN_MM) {
      issues.push({
        field: side,
        severity: 'error',
        message: `الهامش ${side} أقل من الحد الأدنى للطباعة (${MIN_PRINTABLE_MARGIN_MM}mm)`,
      });
    } else if (v < SAFE_PRINTABLE_MARGIN_MM) {
      issues.push({
        field: side,
        severity: 'warning',
        message: `الهامش ${side} قد يُقَصّ على بعض الطابعات (موصى ≥ ${SAFE_PRINTABLE_MARGIN_MM}mm)`,
      });
    }
  });

  return issues;
}

export function isLayoutValid(layout: PdfLayout): boolean {
  return !validateLayout(layout).some((i) => i.severity === 'error');
}

export function withMargins(layout: PdfLayout, margins: Partial<PageMargins>): PdfLayout {
  return { ...layout, margins: { ...layout.margins, ...margins } };
}
