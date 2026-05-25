/**
 * usePdfProfileRealtime — Wave C / Item 10.
 *
 * يشترك في تغييرات جدول `tenant_pdf_profiles` للمؤسسة الحالية عبر
 * Supabase Realtime ويُبطل في الحال:
 *   1. الكاش الداخلي في `PdfRenderService` (نافذة TTL = 60s).
 *   2. كل استعلامات React Query المرتبطة بمفتاح `PDF_PROFILE_QUERY_KEY`
 *      لإجبار `LivePreviewPanel` وأي شاشة مفتوحة على إعادة المزامنة فوراً.
 *
 * يُلغي الاشتراك تلقائياً عند unmount لتفادي تسرب الذاكرة، ويبقى آلية
 * الـ TTL كاحتياط في حال تعطّل WebSockets.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './useTenant';
import { invalidatePdfRenderCache } from '@/lib/pdf/services/PdfRenderService';
import { PDF_PROFILE_QUERY_KEY } from './usePdfProfile';

export interface UsePdfProfileRealtimeOptions {
  /** يسمح بإيقافه يدوياً (مثلاً في الاختبارات). */
  enabled?: boolean;
}

export function usePdfProfileRealtime(
  opts: UsePdfProfileRealtimeOptions = {},
): void {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const enabled = opts.enabled !== false;

  useEffect(() => {
    if (!enabled || !tenantId) return;

    const channel = supabase
      .channel(`pdf-profiles:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenant_pdf_profiles',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload: { eventType?: string }) => {
          // 1) إبطال كاش الـ TTL داخل PdfRenderService.
          invalidatePdfRenderCache(tenantId);
          // 2) إبطال React Query حتى تنعكس على الواجهات المفتوحة.
          qc.invalidateQueries({ queryKey: [PDF_PROFILE_QUERY_KEY, tenantId] });
          if (typeof console !== 'undefined' && import.meta.env?.DEV) {
            console.debug(
              '[pdf-realtime] profile changed',
              payload?.eventType ?? 'change',
            );
          }
        },
      )
      .subscribe((status) => {
        if (
          (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') &&
          typeof console !== 'undefined'
        ) {
          console.warn(
            '[pdf-realtime] subscription degraded — falling back to TTL cache',
            status,
          );
        }
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* noop */
      }
    };
  }, [tenantId, enabled, qc]);
}
