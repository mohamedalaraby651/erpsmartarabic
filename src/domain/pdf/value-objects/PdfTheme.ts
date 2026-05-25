/**
 * PdfTheme — تجميع value objects التي تشكّل المظهر البصري للمستند.
 * نفسه ليس له منطق إضافي، فقط نوع مركّب يستخدمه الكيان الأعلى.
 */
import { type PdfBranding, DEFAULT_BRANDING } from './PdfBranding';
import { type PdfTypography, DEFAULT_TYPOGRAPHY } from './PdfTypography';
import { type PdfWatermark, DEFAULT_WATERMARK } from './PdfWatermark';

export interface PdfTheme {
  branding: PdfBranding;
  typography: PdfTypography;
  watermark: PdfWatermark;
}

export const DEFAULT_THEME: PdfTheme = Object.freeze({
  branding: DEFAULT_BRANDING,
  typography: DEFAULT_TYPOGRAPHY,
  watermark: DEFAULT_WATERMARK,
});
