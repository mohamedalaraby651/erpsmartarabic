/**
 * RenderProfileMapper — يحوّل DocumentRenderProfile إلى PdfConfigInput
 * الذي تفهمه المحركات الحالية (HtmlPdfEngine / JsPdfEngine).
 *
 * هذه هي طبقة التوافق التي تحفظ Domain نقياً.
 */
import type { DocumentRenderProfile } from '../entities/DocumentRenderProfile';
import type { PdfConfigInput } from '@/lib/pdf/config/pdfConfigSchema';

export function profileToPdfConfigInput(p: DocumentRenderProfile): PdfConfigInput {
  return {
    page: {
      size: p.layout.pageSize,
      orientation: p.layout.orientation,
      margins: { ...p.layout.margins },
    },
    typography: {
      fontKey: (p.typography.fontKey === 'noto-naskh' || p.typography.fontKey === 'system'
        ? 'cairo'
        : p.typography.fontKey) as PdfConfigInput['typography'] extends infer T
          ? T extends { fontKey: infer F } ? F : never
          : never,
      baseFontSizePx: p.typography.baseFontSizePx,
      lineHeight: p.typography.lineHeight,
      letterSpacing: p.typography.letterSpacing,
    },
    header: {
      enabled: p.header.enabled,
      height: p.header.height,
      html: p.header.html,
      showOnFirstPage: p.header.showOnFirstPage,
    },
    footer: {
      enabled: p.footer.enabled,
      height: p.footer.height,
      html: p.footer.html,
      showOnFirstPage: true,
    },
    pageNumbers: {
      enabled: p.footer.showPageNumbers,
      format: p.footer.pageNumberFormat,
      position: 'footer-center',
    },
    watermark: {
      enabled: p.watermark.enabled,
      text: p.watermark.text,
      opacity: p.watermark.opacity,
      rotation: p.watermark.rotation,
      tiled: p.watermark.repeat || p.watermark.position === 'tiled',
    },
    branding: {
      primaryColor: p.branding.primaryColor,
      secondaryColor: p.branding.secondaryColor,
      companyName: p.branding.companyName,
      taxNumber: p.branding.taxNumber,
    },
  };
}
