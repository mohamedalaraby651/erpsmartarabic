import type { PdfFontKey } from '@/lib/arabicFont';

export interface PdfWatermark {
  text: string;
  color?: string;          // hex
  opacity?: number;        // 0..1
  angle?: number;          // degrees
  fontSize?: number;
}

export interface PdfTheme {
  primaryColor: string;        // hex, brand
  secondaryColor: string;
  textColor: string;
  mutedColor: string;
  tableHeaderBg: string;
  tableRowAltBg: string;
  font: PdfFontKey;
  baseFontSize: number;        // pt
  headingFontSize: number;     // pt
  lineHeightFactor: number;    // 1.0..2.0
  watermark?: PdfWatermark;
  showPageNumbers: boolean;
  pageNumberFormat: (current: number, total: number) => string;
}

export const DEFAULT_THEME: PdfTheme = {
  primaryColor: '#1e40af',
  secondaryColor: '#64748b',
  textColor: '#0f172a',
  mutedColor: '#94a3b8',
  tableHeaderBg: '#1e40af',
  tableRowAltBg: '#f8fafc',
  font: 'amiri',
  baseFontSize: 10,
  headingFontSize: 18,
  lineHeightFactor: 1.5,
  showPageNumbers: true,
  pageNumberFormat: (current, total) => `صفحة ${current} من ${total}`,
};

export function mergeTheme(partial?: Partial<PdfTheme>): PdfTheme {
  return { ...DEFAULT_THEME, ...(partial ?? {}) };
}
