/**
 * RenderProfileMapper — يحوّل DocumentRenderProfile إلى PdfConfigInput
 * الذي تفهمه المحركات الحالية (HtmlPdfEngine / JsPdfEngine).
 *
 * هذه هي طبقة التوافق التي تحفظ Domain نقياً.
 *
 * نسختان:
 *  - profileToPdfConfigInput        : متزامن. لا يحلّ assetIds (يتجاهلها).
 *  - profileToPdfConfigInputAsync   : غير متزامن. يحلّ logoAssetId و
 *    watermark.imageAssetId إلى Signed URLs عبر دالة resolver محقونة.
 */
import type { DocumentRenderProfile } from '../entities/DocumentRenderProfile';
import type { PdfConfigInput } from '@/lib/pdf/config/pdfConfigSchema';

/** يستقبل assetId ويعيد signed URL أو null عند الفشل/الغياب. */
export type AssetUrlResolver = (assetId: string) => Promise<string | null>;

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
      text: p.watermark.type === 'text' ? p.watermark.text : undefined,
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

/**
 * نسخة async تحلّ صور الشعار والعلامة المائية إلى Signed URLs.
 * أي فشل في تحليل URL يُتجاهَل بصمت لكي لا يكسر التصدير.
 */
export async function profileToPdfConfigInputAsync(
  p: DocumentRenderProfile,
  resolveAssetUrl: AssetUrlResolver,
): Promise<PdfConfigInput> {
  const base = profileToPdfConfigInput(p);

  const [logoUrl, watermarkImageUrl] = await Promise.all([
    p.branding.logoAssetId ? safeResolve(resolveAssetUrl, p.branding.logoAssetId) : null,
    p.watermark.enabled && p.watermark.type === 'image' && p.watermark.imageAssetId
      ? safeResolve(resolveAssetUrl, p.watermark.imageAssetId)
      : null,
  ]);

  if (logoUrl) {
    base.header = { ...(base.header ?? {}), logoUrl };
  }
  if (watermarkImageUrl) {
    base.watermark = {
      ...(base.watermark ?? {}),
      imageUrl: watermarkImageUrl,
      // أبقِ النص فارغاً عند استخدام صورة لتفادي التداخل.
      text: undefined,
    };
  }

  return base;
}

async function safeResolve(resolver: AssetUrlResolver, id: string): Promise<string | null> {
  try {
    return await resolver(id);
  } catch {
    return null;
  }
}
