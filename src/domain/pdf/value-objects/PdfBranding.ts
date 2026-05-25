/**
 * PdfBranding — ألوان، اسم شركة، رقم ضريبي، شعار.
 * يحسب التباين تلقائياً (WCAG AA).
 */

export interface PdfBranding {
  primaryColor: string;   // #RRGGBB
  secondaryColor: string;
  textColor: string;
  companyName?: string;
  taxNumber?: string;
  logoAssetId?: string | null;
}

export const DEFAULT_BRANDING: PdfBranding = Object.freeze({
  primaryColor: '#111111',
  secondaryColor: '#f1f1f2',
  textColor: '#1a1a1a',
});

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export interface BrandingIssue {
  field: keyof PdfBranding | 'contrast';
  severity: 'error' | 'warning';
  message: string;
}

function hexToRgb(hex: string): [number, number, number] | null {
  if (!HEX_RE.test(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const ch = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

/** نسبة تباين WCAG بين لونين (1..21). */
export function contrastRatio(fg: string, bg: string): number {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  if (!f || !b) return 1;
  const L1 = relativeLuminance(f);
  const L2 = relativeLuminance(b);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA للنص العادي = 4.5، للنص الكبير = 3. */
export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3.0;

export function validateBranding(b: PdfBranding): BrandingIssue[] {
  const issues: BrandingIssue[] = [];

  (['primaryColor', 'secondaryColor', 'textColor'] as const).forEach((k) => {
    if (!HEX_RE.test(b[k])) {
      issues.push({
        field: k,
        severity: 'error',
        message: `${k} يجب أن يكون لوناً سداسياً صالحاً (#RRGGBB)`,
      });
    }
  });

  if (b.companyName && b.companyName.length > 200) {
    issues.push({ field: 'companyName', severity: 'error', message: 'اسم الشركة طويل جداً' });
  }
  if (b.taxNumber && b.taxNumber.length > 40) {
    issues.push({ field: 'taxNumber', severity: 'error', message: 'الرقم الضريبي طويل جداً' });
  }

  if (HEX_RE.test(b.textColor) && HEX_RE.test(b.secondaryColor)) {
    const ratio = contrastRatio(b.textColor, b.secondaryColor);
    if (ratio < WCAG_AA_NORMAL) {
      issues.push({
        field: 'contrast',
        severity: 'warning',
        message: `تباين النص على الخلفية الثانوية (${ratio.toFixed(2)}) أقل من معيار WCAG AA (${WCAG_AA_NORMAL})`,
      });
    }
  }

  return issues;
}

export function isBrandingValid(b: PdfBranding): boolean {
  return !validateBranding(b).some((i) => i.severity === 'error');
}
