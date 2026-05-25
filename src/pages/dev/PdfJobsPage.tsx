/**
 * Dev-only dashboard for `pdf_export_jobs`. Polls every 5s, lets the
 * developer enqueue a sample render via the edge function and view the
 * tenant-scoped queue.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEnqueuePdfExport } from '@/hooks/useEnqueuePdfExport';

interface PdfJobRow {
  id: string;
  doc_type: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  file_url: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

const STATUS_TONE: Record<PdfJobRow['status'], 'default' | 'secondary' | 'destructive'> = {
  queued: 'secondary',
  running: 'default',
  done: 'default',
  failed: 'destructive',
};

export default function PdfJobsPage() {
  const [rows, setRows] = useState<PdfJobRow[]>([]);
  const [loading, setLoading] = useState(false);
  const enqueue = useEnqueuePdfExport();

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pdf_export_jobs')
      .select('id, doc_type, status, file_url, error_message, created_at, completed_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setRows((data ?? []) as PdfJobRow[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <Card className="card-premium">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>مهام تصدير PDF</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              قائمة الانتظار لتصدير المستندات الثقيلة عبر العامل الخلفي
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <RefreshCw className="h-4 w-4 ml-1" />}
              تحديث
            </Button>
            <Button
              size="sm"
              onClick={() => enqueue.mutate({ docType: 'invoice', data: { sample: true } })}
              disabled={enqueue.isPending}
            >
              {enqueue.isPending ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Send className="h-4 w-4 ml-1" />}
              إنشاء مهمة تجريبية
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              لا توجد مهام بعد
            </p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-right">
                  <tr>
                    <th className="px-3 py-2">المعرّف</th>
                    <th className="px-3 py-2">النوع</th>
                    <th className="px-3 py-2">الحالة</th>
                    <th className="px-3 py-2">أُنشئت</th>
                    <th className="px-3 py-2">اكتملت</th>
                    <th className="px-3 py-2">رابط/خطأ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{r.id.slice(0, 8)}…</td>
                      <td className="px-3 py-2">{r.doc_type}</td>
                      <td className="px-3 py-2">
                        <Badge variant={STATUS_TONE[r.status]}>{r.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">{new Date(r.created_at).toLocaleString('ar')}</td>
                      <td className="px-3 py-2 text-xs">
                        {r.completed_at ? new Date(r.completed_at).toLocaleString('ar') : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs max-w-[260px] truncate">
                        {r.file_url ? (
                          <a href={r.file_url} target="_blank" rel="noreferrer" className="text-primary underline">
                            تحميل
                          </a>
                        ) : (
                          <span className="text-destructive">{r.error_message ?? '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
