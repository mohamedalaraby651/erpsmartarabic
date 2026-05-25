/**
 * useLivePreviewProfile — wrapper around usePdfProfile so wizard surfaces
 * (Invoice/Quotation forms) can mount <LivePreviewPanel /> without needing to
 * know about the underlying realtime subscription.
 *
 * `usePdfProfile()` already invokes `usePdfProfileRealtime()` internally, so
 * any margin / branding / watermark change made by an admin in another tab
 * refreshes the preview instantly.
 */
import { usePdfProfile } from '@/hooks/usePdfProfile';

export function useLivePreviewProfile() {
  const { profile, isLoading } = usePdfProfile('global', null);
  return { profile, isLoading };
}
