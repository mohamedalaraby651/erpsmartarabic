/**
 * DispatcherBatchDetailPage
 * Shows all events executed within a specific dispatcher batch (by correlation_id),
 * with per-event latency, status, and failure reason.
 */
import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, CheckCircle2, AlertTriangle, SkipForward, Clock } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

interface BatchRow {
  id: string;
  correlation_id: string;
  started_at: string;
  finished_at: string;
  processed: number;
  failed: number;
  skipped: number;
  batch_size: number;
  claimed_count: number;
  total_ms: number;
  auth_mode: string | null;
}

interface ExecRow {
  id: string;
  event_id: string;
  event_type: string;
  aggregate_type: string | null;
  aggregate_id: string | null;
  tenant_id: string | null;
  status: 'processed' | 'failed' | 'skipped';
  error: string | null;
  latency_ms: number;
  attempts: number;
  executed_at: string;
}

const fmtTime = (iso: string) => new Date(iso).toLocaleString('ar-EG', { hour12: false });

const statusBadge = (s: ExecRow['status']) => {
  if (s === 'processed') return <Badge className="bg-success text-success-foreground">ناجح</Badge>;
  if (s === 'failed') return <Badge variant="destructive">فشل</Badge>;
  return <Badge variant="secondary">متخطّى</Badge>;
};

export default function DispatcherBatchDetailPage() {
  const { correlationId = '' } = useParams<{ correlationId: string }>();
  usePageTitle(`دفعة ${correlationId.slice(0, 8)}…`);

  const { data: batch, isLoading: loadingBatch } = useQuery({
    queryKey: ['dispatcher-batch', correlationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('dispatcher_batch_runs')
        .select('*')
        .eq('correlation_id', correlationId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as BatchRow | null;
    },
    enabled: !!correlationId,
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['dispatcher-batch-events', correlationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('dispatcher_event_executions')
        .select('*')
        .eq('correlation_id', correlationId)
        .order('executed_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ExecRow[];
    },
    enabled: !!correlationId,
  });

  const stats = useMemo(() => {
    const processed = events.filter((e) => e.status === 'processed').length;
    const failed = events.filter((e) => e.status === 'failed').length;
    const skipped = events.filter((e) => e.status === 'skipped').length;
    const slowest = events.reduce((m, e) => (e.latency_ms > m ? e.latency_ms : m), 0);
    const avg = events.length
      ? Math.round(events.reduce((s, e) => s + e.latency_ms, 0) / events.length)
      : 0;
    return { processed, failed, skipped, slowest, avg };
  }, [events]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/dispatcher-batches">
            <ArrowRight className="h-4 w-4 ml-1" />
            رجوع للقائمة
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">تفاصيل الدفعة</h1>
        <p className="text-sm text-muted-foreground font-mono break-all">{correlationId}</p>
      </div>

      {/* Batch summary */}
      {loadingBatch ? (
        <Skeleton className="h-32" />
      ) : !batch ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            لا توجد بيانات دفعة بهذا المعرّف.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ملخّص الدفعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Info label="وقت البدء" value={fmtTime(batch.started_at)} />
              <Info label="وقت الانتهاء" value={fmtTime(batch.finished_at)} />
              <Info label="الزمن الكلي" value={`${batch.total_ms}ms`} />
              <Info label="المصدر" value={batch.auth_mode || '—'} />
              <Info label="حجم الدفعة المطلوب" value={batch.batch_size} />
              <Info label="عدد المُلتَقَط" value={batch.claimed_count} />
              <Info label="ناجح / فاشل / متخطّى" value={`${batch.processed} / ${batch.failed} / ${batch.skipped}`} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-event stats */}
      {!loadingEvents && events.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={<CheckCircle2 className="h-5 w-5 text-success" />} value={stats.processed} label="ناجح" />
          <StatCard
            icon={<AlertTriangle className={`h-5 w-5 ${stats.failed > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />}
            value={stats.failed}
            label="فشل"
          />
          <StatCard icon={<SkipForward className="h-5 w-5 text-warning" />} value={stats.skipped} label="متخطّى" />
          <StatCard icon={<Clock className="h-5 w-5 text-info" />} value={`${stats.avg}ms`} label="متوسط/حدث" />
          <StatCard icon={<Clock className="h-5 w-5 text-warning" />} value={`${stats.slowest}ms`} label="الأبطأ" />
        </div>
      )}

      {/* Events table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">الأحداث ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEvents ? (
            <Skeleton className="h-64 w-full" />
          ) : events.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              لا توجد أحداث مسجّلة لهذه الدفعة.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-right">
                    <th className="p-2 font-medium">وقت التنفيذ</th>
                    <th className="p-2 font-medium">نوع الحدث</th>
                    <th className="p-2 font-medium">معرّف الكيان</th>
                    <th className="p-2 font-medium">الحالة</th>
                    <th className="p-2 font-medium">الزمن</th>
                    <th className="p-2 font-medium">محاولات</th>
                    <th className="p-2 font-medium">سبب الفشل</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => {
                    const slow = e.latency_ms > 3000;
                    return (
                      <tr key={e.id} className="border-t align-top hover:bg-muted/30">
                        <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                          {fmtTime(e.executed_at)}
                        </td>
                        <td className="p-2 font-mono text-xs">{e.event_type}</td>
                        <td className="p-2 font-mono text-xs" title={e.aggregate_id || ''}>
                          {e.aggregate_id ? `${e.aggregate_id.slice(0, 8)}…` : '—'}
                        </td>
                        <td className="p-2">{statusBadge(e.status)}</td>
                        <td className="p-2">
                          <span className={slow ? 'text-warning font-medium' : ''}>
                            {e.latency_ms}ms
                          </span>
                        </td>
                        <td className="p-2 text-center">{e.attempts}</td>
                        <td className="p-2 max-w-md">
                          {e.error ? (
                            <code className="block text-xs bg-destructive/10 text-destructive p-2 rounded whitespace-pre-wrap break-words">
                              {e.error}
                            </code>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
