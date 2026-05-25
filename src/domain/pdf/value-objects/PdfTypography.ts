/**
 * PdfTypography — value object للخطوط، الأحجام، وارتفاع السطر.
 * يدعم سلسلة fallback (Cairo → Tajawal → Amiri → system).
 */

export type PdfFontKey = 'cairo' | 'tajawal' | 'amiri' | 'noto-naskh' | 'system';

export interface PdfTypography {
  fontKey: PdfFontKey;
  /** سلسلة بديلة يُلجأ إليها عند فشل تحميل الخط الأساسي. */
  fallbackChain: PdfFontKey[];
  baseFontSizePx: number;
  lineHeight: number;
  letterSpacing: number;
}

export const DEFAULT_TYPOGRAPHY: PdfTypography = Object.freeze({
  fontKey: 'cairo' as PdfFontKey,
  fallbackChain: ['cairo', 'tajawal', 'amiri', 'system'] as PdfFontKey[],
  baseFontSizePx: 12,
  lineHeight: 1.7,
  letterSpacing: 0,
});

const FONT_CSS_NAMES: Record<PdfFontKey, string> = {
  cairo: '"Cairo"',
  tajawal: '"Tajawal"',
  amiri: '"Amiri"',
  'noto-naskh': '"Noto Naskh Arabic"',
  system: 'system-ui, -apple-system, "Segoe UI", sans-serif',
};

export interface TypographyIssue {
  field: keyof PdfTypography;
  severity: 'error' | 'warning';
  message: string;
}

export function validateTypography(t: PdfTypography): TypographyIssue[] {
  const issues: TypographyIssue[] = [];

  if (!FONT_CSS_NAMES[t.fontKey]) {
    issues.push({
      field: 'fontKey',
      severity: 'error',
      message: `الخط غير مدعوم: ${t.fontKey}`,
    });
  }

  if (t.baseFontSizePx < 8 || t.baseFontSizePx > 24) {
    issues.push({
      field: 'baseFontSizePx',
      severity: 'error',
      message: 'حجم الخط يجب أن يكون بين 8 و 24 px',
    });
  } else if (t.baseFontSizePx < 10) {
    issues.push({
      field: 'baseFontSizePx',
      severity: 'warning',
      message: 'حجم خط صغير جداً قد يضر بقابلية القراءة',
    });
  }

  if (t.lineHeight < 1 || t.lineHeight > 3) {
    issues.push({
      field: 'lineHeight',
      severity: 'error',
      message: 'ارتفاع السطر يجب أن يكون بين 1 و 3',
    });
  } else if (t.lineHeight < 1.4) {
    issues.push({
      field: 'lineHeight',
      severity: 'warning',
      message: 'ارتفاع سطر منخفض قد لا يستوعب التشكيل العربي',
    });
  }

  if (t.letterSpacing < -2 || t.letterSpacing > 4) {
    issues.push({
      field: 'letterSpacing',
      severity: 'error',
      message: 'تباعد الأحرف خارج النطاق المسموح',
    });
  }

  if (!Array.isArray(t.fallbackChain) || t.fallbackChain.length === 0) {
    issues.push({
      field: 'fallbackChain',
      severity: 'error',
      message: 'يجب توفير سلسلة fallback واحدة على الأقل',
    });
  }

  return issues;
}

/** يبني خاصية font-family كاملة من السلسلة. */
export function toFontFamilyCss(t: PdfTypography): string {
  const chain = [t.fontKey, ...t.fallbackChain.filter((f) => f !== t.fontKey)];
  return chain.map((k) => FONT_CSS_NAMES[k] ?? FONT_CSS_NAMES.system).join(', ');
}

export function isTypographyValid(t: PdfTypography): boolean {
  return !validateTypography(t).some((i) => i.severity === 'error');
}
