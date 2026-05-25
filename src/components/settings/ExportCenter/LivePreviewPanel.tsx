/**
 * LivePreviewPanel — معاينة فورية لـ DocumentRenderProfile.
 * يرسم فاتورة تجريبية بنسبة الصفحة المختارة مع تطبيق الهوامش والخطوط والألوان.
 *
 * - Pure presentation: لا يستدعي API ولا يولّد PDF فعلياً.
 * - useDeferredValue يحافظ على استجابة الواجهة عند الكتابة السريعة.
 */
import { memo, useDeferredValue, useMemo } from 'react';
import type { DocumentRenderProfile } from '@/domain/pdf/entities/DocumentRenderProfile';

const PAGE_DIMS_MM: Record<string, { w: number; h: number }> = {
  A3: { w: 297, h: 420 },
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  Letter: { w: 216, h: 279 },
  Legal: { w: 216, h: 356 },
};

const FONT_STACK: Record<string, string> = {
  cairo: '"Cairo", "Tajawal", system-ui, sans-serif',
  tajawal: '"Tajawal", "Cairo", system-ui, sans-serif',
  amiri: '"Amiri", "Cairo", serif',
  'noto-naskh': '"Noto Naskh Arabic", "Cairo", serif',
  system: 'system-ui, -apple-system, "Segoe UI", sans-serif',
};

interface Props {
  profile: DocumentRenderProfile;
  /** ارتفاع المعاينة بالبكسل (العرض يُحسب من نسبة الصفحة). */
  height?: number;
}

function LivePreviewPanelInner({ profile, height = 560 }: Props) {
  const deferred = useDeferredValue(profile);

  const dims = PAGE_DIMS_MM[deferred.layout.pageSize] ?? PAGE_DIMS_MM.A4;
  const isLandscape = deferred.layout.orientation === 'landscape';
  const pageW = isLandscape ? dims.h : dims.w;
  const pageH = isLandscape ? dims.w : dims.h;

  // مقياس: ارتفاع المعاينة بالـ px ÷ ارتفاع الصفحة بالـ mm
  const scale = (height - 16) / pageH;
  const pxW = pageW * scale;
  const pxH = pageH * scale;

  const style = useMemo(() => {
    const m = deferred.layout.margins;
    return {
      page: {
        width: `${pxW}px`,
        height: `${pxH}px`,
        fontFamily: FONT_STACK[deferred.typography.fontKey] ?? FONT_STACK.cairo,
        fontSize: `${Math.max(6, deferred.typography.baseFontSizePx * scale * 0.7)}px`,
        lineHeight: deferred.typography.lineHeight,
        color: deferred.branding.textColor,
        background: '#fff',
        boxShadow: '0 4px 24px hsl(var(--foreground) / 0.12)',
        position: 'relative' as const,
        overflow: 'hidden' as const,
      },
      inner: {
        paddingTop: `${m.top * scale}px`,
        paddingRight: `${m.right * scale}px`,
        paddingBottom: `${m.bottom * scale}px`,
        paddingLeft: `${m.left * scale}px`,
        height: '100%',
        display: 'flex' as const,
        flexDirection: 'column' as const,
        gap: `${8 * scale}px`,
      },
    };
  }, [deferred, pxH, pxW, scale]);

  return (
    <div
      className="flex items-center justify-center w-full bg-muted/40 rounded-lg p-2 border"
      style={{ minHeight: `${height}px` }}
      dir="rtl"
    >
      <div style={style.page}>
        <div style={style.inner}>
          {/* رأس الصفحة */}
          <div
            style={{
              borderBottom: `2px solid ${deferred.branding.primaryColor}`,
              paddingBottom: `${4 * scale}px`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 700,
                  color: deferred.branding.primaryColor,
                  fontSize: `${14 * scale}px`,
                }}
              >
                {deferred.branding.companyName || 'اسم الشركة'}
              </div>
              {deferred.branding.taxNumber && (
                <div style={{ fontSize: `${8 * scale}px`, opacity: 0.7 }}>
                  ر.ض: {deferred.branding.taxNumber}
                </div>
              )}
            </div>
            <div
              style={{
                background: deferred.branding.secondaryColor,
                padding: `${4 * scale}px ${8 * scale}px`,
                borderRadius: `${4 * scale}px`,
                color: deferred.branding.primaryColor,
                fontWeight: 600,
                fontSize: `${10 * scale}px`,
              }}
            >
              فاتورة #2026-0001
            </div>
          </div>

          {/* جدول وهمي */}
          <div style={{ fontSize: `${8 * scale}px`, flex: 1 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                gap: `${4 * scale}px`,
                fontWeight: 600,
                background: deferred.branding.secondaryColor,
                padding: `${4 * scale}px`,
                borderRadius: `${2 * scale}px`,
              }}
            >
              <span>الصنف</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span>
            </div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  gap: `${4 * scale}px`,
                  padding: `${3 * scale}px ${4 * scale}px`,
                  borderBottom: '1px solid #eee',
                }}
              >
                <span>صنف تجريبي {i}</span>
                <span>{i}</span>
                <span>{(i * 100).toFixed(2)}</span>
                <span>{(i * i * 100).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* تذييل */}
          {deferred.footer.enabled && (
            <div
              style={{
                borderTop: `1px solid ${deferred.branding.primaryColor}`,
                paddingTop: `${3 * scale}px`,
                fontSize: `${7 * scale}px`,
                textAlign: 'center',
                opacity: 0.7,
              }}
            >
              {deferred.footer.showPageNumbers ? 'صفحة 1 / 1 — ' : ''}
              شكراً لتعاملكم معنا
            </div>
          )}
        </div>

        {/* العلامة المائية */}
        {deferred.watermark.enabled && deferred.watermark.text && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: deferred.watermark.opacity,
              transform: `rotate(${deferred.watermark.rotation}deg)`,
              fontSize: `${Math.min(pxW, pxH) * 0.18}px`,
              fontWeight: 800,
              color: deferred.branding.primaryColor,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {deferred.watermark.text}
          </div>
        )}
      </div>
    </div>
  );
}

export const LivePreviewPanel = memo(LivePreviewPanelInner);
