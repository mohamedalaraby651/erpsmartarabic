/**
 * Unified storage URL helper.
 *
 * All buckets in the system are private. Use `getStorageUrl(bucket, path)` to
 * obtain a short-lived signed URL suitable for <img src> usage.
 *
 * If a full URL is passed (legacy public URL or external link), it is returned
 * unchanged so existing data continues to render until rotated.
 */
import { supabase } from '@/integrations/supabase/client';

export type StorageBucket =
  | 'avatars'
  | 'logos'
  | 'customer-images'
  | 'supplier-images'
  | 'employee-images'
  | 'documents'
  | 'restore-snapshots';

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Extracts the storage object path from a stored value.
 * Accepts either a bare path ("folder/file.png") or a full URL.
 */
export function extractStoragePath(value: string, bucket: StorageBucket): string | null {
  if (!value) return null;
  if (!value.startsWith('http')) return value;

  // Try to find "/<bucket>/" segment
  const marker = `/${bucket}/`;
  const idx = value.indexOf(marker);
  if (idx === -1) return null;
  // Strip query string if any
  const after = value.slice(idx + marker.length);
  const qIdx = after.indexOf('?');
  return qIdx === -1 ? after : after.slice(0, qIdx);
}

/**
 * Returns a signed URL for the given object. Falls back to the original value
 * when it's a non-storage URL (e.g. external CDN) or when signing fails.
 */
export async function getStorageUrl(
  bucket: StorageBucket,
  pathOrUrl: string | null | undefined,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string | null> {
  if (!pathOrUrl) return null;

  const path = extractStoragePath(pathOrUrl, bucket);
  if (!path) return pathOrUrl; // external URL — pass through

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttlSeconds);

  if (error || !data?.signedUrl) {
    if (import.meta.env.DEV) {
      console.warn(`[storageUrl] Failed to sign ${bucket}/${path}:`, error?.message);
    }
    return pathOrUrl;
  }
  return data.signedUrl;
}

/**
 * Stores only the storage path (not the URL) when uploading. This makes URL
 * rotation transparent and avoids leaking long-lived public URLs.
 */
export function buildStoragePath(folder: string | undefined, fileName: string): string {
  return folder ? `${folder}/${fileName}` : fileName;
}
