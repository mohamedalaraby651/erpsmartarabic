/**
 * LivePreviewPanel — معاينة فورية عالية الدقة لـ DocumentRenderProfile.
 *
 * المزايا:
 *  - يدعم كل أحجام الورق (A3/A4/A5/Letter/Legal) واتجاهيها بدقة.
 *  - يحسب المقياس بناءً على عرض/ارتفاع الحاوية معاً (ResizeObserver) لتجنب القصّ
 *    خصوصاً في الوضع العرضي landscape.
 *  - يعرض شارة حجم الصفحة الفعلي بالـ mm + DPI تقريبي.
 *  - يعرض overlay أخطاء عند فشل validateProfile (إعدادات غير صالحة → لا يُرسم المحتوى).
 *  - يدعم: header zone, footer, watermark (نص + position + repeat/tiled).
 */
import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { DocumentRenderProfile } from '@/domain/pdf/entities/DocumentRenderProfile';
import { validateProfile } from '@/domain/pdf/entities/DocumentRenderProfile';
import { PAPER_DIMENSIONS_MM } from '@/lib/pdf/config/PageConfig';
import type { WatermarkPosition } from '@/domain/pdf/value-objects/PdfWatermark';
import { usePdfAssetUrl } from '@/hooks/usePdfAssetUrl';

const FONT_STACK: Record<string, string> = {
  cairo: '"Cairo", "Tajawal", system-ui, sans-serif',
  tajawal: '"Tajawal", "Cairo", system-ui, sans-serif',
  amiri: '"Amiri", "Cairo", serif',
  'noto-naskh': '"Noto Naskh Arabic", "Cairo", serif',
  system: 'system-ui, -apple-system, "Segoe UI", sans-serif',
};

interface Props {
  profile: DocumentRenderProfile;
  /** الارتفاع المستهدف للحاوية بالبكسل. القيمة الفعلية تعتمد على ResizeObserver. */
  height?: number;
}

function resolveDims(p: DocumentRenderProfile) {
  const base = PAPER_DIMENSIONS_MM[p.layout.pageSize] ?? PAPER_DIMENSIONS_MM.A4;
  return p.layout.orientation === 'landscape'
    ? { w: base.height, h: base.width }
    : { w: base.width, h: base.height };
}

function watermarkOffsets(pos: WatermarkPosition): { top: string; left: string; translate: string } {
  switch (pos) {
    case 'top-left': return { top: '8%', left: '8%', translate: 'translate(0,0)' };
    case 'top-right': return { top: '8%', left: '92%', translate: 'translate(-100%,0)' };
    case 'bottom-left': return { top: '92%', left: '8%', translate: 'translate(0,-100%)' };
    case 'bottom-right': return { top: '92%', left: '92%', translate: 'translate(-100%,-100%)' };
    case 'center':
    case 'tiled':
    default: return { top: '50%', left: '50%', translate: 'translate(-50%,-50%)' };
  }
}

function LivePreviewPanelInner({ profile, height = 560 }: Props) {
  const deferred = useDeferredValue(profile);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: height });

  const { url: logoUrl } = usePdfAssetUrl(deferred.branding.logoAssetId);
  const { url: watermarkImageUrl } = usePdfAssetUrl(
    deferred.watermark.type === 'image' ? deferred.watermark.imageAssetId : null,
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const validation = useMemo(() => validateProfile(deferred), [deferred]);

  const { w: pageMmW, h: pageMmH } = resolveDims(deferred);

  // مقياس يحترم العرض والارتفاع معاً (contain) — مع padding بسيط
  const PAD = 16;
  const availW = Math.max(0, box.w - PAD);
  const availH = Math.max(0, (box.h || height) - PAD);
  const scale = availW > 0 && availH > 0
    ? Math.min(availW / pageMmW, availH / pageMmH)
    : 0;

  const pxW = pageMmW * scale;
  const pxH = pageMmH * scale;
  const dpi = scale > 0 ? Math.round(scale * 25.4) : 0;

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
        boxShadow: '0 4px 24px hsl(var(--foreground) / 0.15)',
        position: 'relative' as const,
        overflow: 'hidden' as const,
        transition: 'width 180ms ease, height 180ms ease',
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

  const renderWatermark = () => {
    const w = deferred.watermark;
    if (!w.enabled) return null;
    const isImage = w.type === 'image';
    const txt = !isImage ? (w.text ?? '') : '';
    if (!isImage && !txt) return null;
    if (isImage && !watermarkImageUrl) return null;

    const size = Math.min(pxW, pxH) * 0.35 * (w.scale ?? 1);

    const renderSingle = (key: string | number, style: React.CSSProperties) =>
      isImage ? (
        <img
          key={key}
          src={watermarkImageUrl!}
          alt=""
          style={{
            ...style,
            width: `${size}px`,
            height: 'auto',
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      ) : (
        <div
          key={key}
          style={{
            ...style,
            fontSize: `${size * (1 / 0.35) * 0.18}px`,
            fontWeight: 800,
            color: deferred.branding.primaryColor,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {txt}
        </div>
      );

    if (w.position === 'tiled' || w.repeat) {
      const cells = 9;
      return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {Array.from({ length: cells }).map((_, i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            return renderSingle(i, {
              position: 'absolute',
              top: `${(row + 0.5) * 33}%`,
              left: `${(col + 0.5) * 33}%`,
              transform: `translate(-50%,-50%) rotate(${w.rotation}deg) scale(0.6)`,
              opacity: w.opacity,
            });
          })}
        </div>
      );
    }

    const pos = watermarkOffsets(w.position);
    return renderSingle('single', {
      position: 'absolute',
      top: pos.top,
      left: pos.left,
      transform: `${pos.translate} rotate(${w.rotation}deg)`,
      opacity: w.opacity,
    });
  };

  const hasFatal = !validation.valid;

  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {deferred.layout.pageSize} · {deferred.layout.orientation === 'landscape' ? 'عرضي' : 'طولي'} ·
          {' '}{pageMmW}×{pageMmH}mm
        </span>
        <span>~{dpi} DPI معاينة</span>
      </div>
      <div
        ref={containerRef}
        className="relative flex items-center justify-center w-full bg-muted/40 rounded-lg p-2 border overflow-hidden"
        style={{ height: `${height}px` }}
      >
        {scale > 0 && !hasFatal && (
          <div style={style.page}>
            <div style={style.inner}>
              {/* رأس مخصص (header zone) */}
              {deferred.header.enabled && (
                <div
                  style={{
                    height: `${deferred.header.height * scale}px`,
                    background: deferred.branding.secondaryColor,
                    borderRadius: `${2 * scale}px`,
                    display: 'flex',
                    alignItems: 'center',
                    paddingInline: `${6 * scale}px`,
                    fontSize: `${8 * scale}px`,
                    color: deferred.branding.primaryColor,
                  }}
                >
                  منطقة الرأس المخصصة
                </div>
              )}

              {/* رأس الفاتورة */}
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
                  <div style={{ fontWeight: 700, color: deferred.branding.primaryColor, fontSize: `${14 * scale}px` }}>
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

              {/* جدول */}
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
                {[1, 2, 3, 4].map((i) => (
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
                    opacity: 0.75,
                  }}
                >
                  {deferred.footer.showPageNumbers ? 'صفحة 1 / 1 — ' : ''}شكراً لتعاملكم معنا
                </div>
              )}
            </div>

            {renderWatermark()}
          </div>
        )}

        {/* Overlay: أخطاء صلاحية الإعدادات */}
        {hasFatal && (
          <div
            role="alert"
            className="absolute inset-2 rounded-md border-2 border-destructive/50 bg-destructive/10 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-4 text-center"
          >
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="font-semibold text-destructive">تعذّر عرض المعاينة</p>
            <p className="text-xs text-destructive/90 max-w-sm">
              توجد إعدادات غير صالحة. أصلح الأخطاء التالية لاستئناف الرسم:
            </p>
            <ul className="text-xs text-destructive/90 list-disc pr-4 max-h-32 overflow-auto text-right">
              {validation.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              {validation.errors.length > 5 && (
                <li>… و{validation.errors.length - 5} أخرى</li>
              )}
            </ul>
          </div>
        )}

        {scale === 0 && !hasFatal && (
          <div className="text-xs text-muted-foreground">جارٍ حساب أبعاد المعاينة…</div>
        )}
      </div>
    </div>
  );
}

export const LivePreviewPanel = memo(LivePreviewPanelInner);
export default LivePreviewPanel;
