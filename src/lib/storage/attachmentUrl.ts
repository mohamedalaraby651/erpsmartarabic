import { supabase } from '@/integrations/supabase/client';

/** Returns the object path inside the private `documents` bucket, whether a plain path or a legacy signed URL was stored. */
export function attachmentObjectPath(fileUrl: string): string {
  if (!/^https?:\/\//.test(fileUrl)) return fileUrl;
  const part = fileUrl.split('/documents/')[1]?.split('?')[0];
  return part ? decodeURIComponent(part) : '';
}

/** Short-lived link issued on demand, so access always follows the viewer's current permission. */
export async function getAttachmentSignedUrl(fileUrl: string, seconds = 300): Promise<string> {
  const path = attachmentObjectPath(fileUrl);
  if (!path) return '';
  const { data } = await supabase.storage.from('documents').createSignedUrl(path, seconds);
  return data?.signedUrl ?? '';
}
