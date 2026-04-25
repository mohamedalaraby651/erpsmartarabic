import { useQuery } from '@tanstack/react-query';
import { getStorageUrl, type StorageBucket } from '@/lib/storageUrl';

/**
 * React hook returning a fresh signed URL for a private storage object.
 * Refreshes a few minutes before expiry to avoid broken images.
 */
export function useSignedStorageUrl(
  bucket: StorageBucket,
  pathOrUrl: string | null | undefined,
  ttlSeconds: number = 60 * 60,
) {
  return useQuery({
    queryKey: ['signed-storage-url', bucket, pathOrUrl, ttlSeconds],
    queryFn: () => getStorageUrl(bucket, pathOrUrl, ttlSeconds),
    enabled: !!pathOrUrl,
    staleTime: Math.max((ttlSeconds - 300) * 1000, 60_000),
    gcTime: ttlSeconds * 1000,
  });
}
