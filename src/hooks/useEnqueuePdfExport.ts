/**
 * Client hook for enqueueing heavy PDF export jobs via the `render-pdf`
 * edge function. Returns a TanStack `useMutation` whose `mutateAsync`
 * resolves with `{ jobId, status }`. Use for >50 page reports; for small
 * documents prefer the in-browser v2 engine via `routePdfRequest`.
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnqueuePdfExportInput {
  docType: string;
  data: Record<string, unknown>;
  deliver?: 'download' | 'email';
  recipientEmail?: string;
}

export interface EnqueuePdfExportResult {
  ok: boolean;
  jobId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  message?: string;
}

async function enqueuePdfExport(input: EnqueuePdfExportInput): Promise<EnqueuePdfExportResult> {
  const { data, error } = await supabase.functions.invoke('render-pdf', { body: input });
  if (error) throw new Error(error.message ?? 'فشل إنشاء المهمة');
  if (!data?.ok || !data?.jobId) throw new Error(data?.error ?? 'استجابة غير صالحة من الخادم');
  return data as EnqueuePdfExportResult;
}

export function useEnqueuePdfExport() {
  return useMutation({
    mutationFn: enqueuePdfExport,
    onSuccess: (res) => {
      toast.success(`تم إنشاء مهمة التصدير (${res.jobId.slice(0, 8)}…)`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'تعذر إنشاء مهمة التصدير');
    },
  });
}
