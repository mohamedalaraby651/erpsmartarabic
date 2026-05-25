/**
 * usePdfProfile — Hook لإدارة DocumentRenderProfile الخاص بالمؤسسة الحالية.
 *
 * - يجلب الملف النشط للنطاق المطلوب (افتراضياً global).
 * - عند عدم وجود ملف، يُعيد ملفاً افتراضياً بدون حفظه.
 * - يوفر `save()` لحفظ التغييرات مع تحديث الكاش وبث حدث.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from './useTenant';
import { pdfProfilesRepository } from '@/lib/repositories/pdfProfilesRepository';
import {
  type DocumentRenderProfile,
  type ProfileScope,
  createDefaultProfile,
  validateProfile,
} from '@/domain/pdf/entities/DocumentRenderProfile';
import { EXPORT_SETTINGS_EVENT } from './useExportSettings';
import { toast } from 'sonner';

export const PDF_PROFILE_QUERY_KEY = 'pdf-render-profile';

export function usePdfProfile(
  scopeType: ProfileScope = 'global',
  scopeId: string | null = null,
) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [PDF_PROFILE_QUERY_KEY, tenantId, scopeType, scopeId],
    queryFn: async (): Promise<DocumentRenderProfile> => {
      if (!tenantId) return createDefaultProfile(scopeType);
      const found = await pdfProfilesRepository.findActive(tenantId, scopeType, scopeId);
      if (found) return found;
      return { ...createDefaultProfile(scopeType), tenantId };
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (next: DocumentRenderProfile) => {
      const v = validateProfile(next);
      if (!v.valid) throw new Error(`بيانات غير صالحة: ${v.errors.join('، ')}`);
      const withTenant = { ...next, tenantId: next.tenantId ?? tenantId ?? undefined };
      if (!withTenant.tenantId) throw new Error('لا توجد مؤسسة نشطة');
      return pdfProfilesRepository.upsert(withTenant);
    },
    onSuccess: (saved) => {
      qc.setQueryData([PDF_PROFILE_QUERY_KEY, tenantId, scopeType, scopeId], saved);
      try {
        window.dispatchEvent(new CustomEvent(EXPORT_SETTINGS_EVENT, { detail: 'profile-saved' }));
      } catch { /* noop */ }
      toast.success('تم حفظ إعدادات تصيير المستندات');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'تعذّر حفظ الإعدادات');
    },
  });

  return {
    profile: query.data ?? createDefaultProfile(scopeType),
    isLoading: query.isLoading,
    error: query.error as Error | null,
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
    refetch: query.refetch,
  };
}
