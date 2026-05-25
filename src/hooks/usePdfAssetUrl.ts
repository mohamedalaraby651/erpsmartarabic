/**
 * usePdfAssetUrl — يحول assetId إلى Signed URL قابل للعرض في <img>.
 *
 * يقرأ سجل الـ asset من tenant_pdf_assets ثم يوقّع المسار من bucket 'pdf-branding'.
 * يُعاد تلقائياً قبل انتهاء الصلاحية عبر useSignedStorageUrl.
 */
import { useQuery } from '@tanstack/react-query';
import { pdfAssetsRepository } from '@/lib/repositories/pdfAssetsRepository';
import { useSignedStorageUrl } from './useSignedStorageUrl';

export function usePdfAssetUrl(assetId: string | null | undefined) {
  const assetQuery = useQuery({
    queryKey: ['pdf-asset', assetId],
    queryFn: () => pdfAssetsRepository.findById(assetId!),
    enabled: !!assetId,
    staleTime: 5 * 60_000,
  });

  const urlQuery = useSignedStorageUrl('pdf-branding', assetQuery.data?.file_path ?? null);

  return {
    url: urlQuery.data ?? null,
    asset: assetQuery.data ?? null,
    isLoading: assetQuery.isLoading || urlQuery.isLoading,
    error: (assetQuery.error ?? urlQuery.error) as Error | null,
  };
}
