import { useQuery } from '@tanstack/react-query';
import { getStorageUrl } from '@/lib/storageUrl';

/**
 * Resolves a stored branding value into a URL that renders right now.
 *
 * `company_settings.logo_url` holds a durable storage path (older records may
 * hold an expired signed URL). Storage reads are private, so the value has to
 * be re-signed on every render instead of being used as an <img> source.
 */
export function useBrandingLogo(rawUrl: string | null | undefined) {
  const { data, isPending } = useQuery({
    queryKey: ['branding-logo', rawUrl ?? null],
    queryFn: () => getStorageUrl('logos', rawUrl ?? ''),
    enabled: Boolean(rawUrl),
    staleTime: 5 * 60 * 1000,
  });

  return { logoUrl: data || rawUrl || null, isPending: Boolean(rawUrl) && isPending };
}
