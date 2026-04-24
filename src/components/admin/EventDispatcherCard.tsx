/**
 * EventDispatcherCard
 * Real-time view of the domain-event pipeline (success rate, latency, backlog).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface MetricRow {
  hour: string;
  event_type: string;
  success_count: number;
  failure_count: number;
  total_count: number;
  success_rate_pct: number;
  avg_latency_ms: number;
}

interface BacklogRow {
  status: string;
  event_type: string;
  event_count: number;
  oldest_event_at: string;
  max_attempts: number;
}

export const EventDispatcherCard = () => {
  const { data: metrics = [], isLoading: loadingMetrics } = useQuery({
    queryKey: ['event-dispatcher-metrics'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('event_dispatcher_metrics')
        .select('*')
        .order('hour', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as MetricRow[];
    },
    refetchInterval: 30_000,
  });

  const { data: backlog = [], isLoading: loadingBacklog } = useQuery({
    queryKey: ['event-dispatcher-backlog'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('event_dispatcher_backlog')
        .select('*');
      if (error) throw error;
      return (data || []) as BacklogRow[];
    },
    refetchInterval: 15_000,
  });

  const totals = metrics.reduce(
    (acc, m) => {
      acc.success += m.success_count;
      acc.failure += m.failure_count;
      acc.latencySum += m.avg_latency_ms * m.total_count;
      acc.latencyCount += m.total_count;
      return acc;
    },
    { success: 0, failure: 0, latencySum: 0, latencyCount: 0 }
  );
  const overallSuccessRate =
    totals.success + totals.failure === 0
      ? 100
      : Math.round((totals.success / (totals.success + totals.failure)) * 100);
  const overallAvgLatency =
    totals.latencyCount === 0 ? 0 : Math.round(totals.latencySum / totals.latencyCount);

  const pendingCount = backlog
    .filter((b) => b.status === 'pending')
    .reduce((sum, b) => sum + b.event_count, 0);
  const failedCount = backlog
    .filter((b) => b.status === 'failed')
    .reduce((sum, b) => sum + b.event_count, 0);

  if (loadingMetrics || loadingBacklog) {
    return <Skeleton className="h-48" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          محرّك الأحداث (Domain Events)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-3 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">{overallSuccessRate}%</p>
            <p className="text-xs text-muted-foreground">معدل النجاح</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{overallAvgLatency}ms</p>
            <p className="text-xs text-muted-foreground">متوسط الاستجابة</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <Activity className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">في الانتظار</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <AlertTriangle
              className={`h-5 w-5 mx-auto mb-1 ${failedCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
            />
            <p className="text-2xl font-bold">{failedCount}</p>
            <p className="text-xs text-muted-foreground">فاشلة</p>
          </div>
        </div>

        {/* Per-event-type table */}
        {metrics.length > 0 && (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-right">
                  <th className="p-2 font-medium">نوع الحدث</th>
                  <th className="p-2 font-medium">إجمالي</th>
                  <th className="p-2 font-medium">نجاح</th>
                  <th className="p-2 font-medium">فشل</th>
                  <th className="p-2 font-medium">معدل النجاح</th>
                  <th className="p-2 font-medium">متوسط الاستجابة</th>
                </tr>
              </thead>
              <tbody>
                {metrics.slice(0, 10).map((m, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2 font-mono text-xs">{m.event_type}</td>
                    <td className="p-2">{m.total_count}</td>
                    <td className="p-2 text-emerald-600">{m.success_count}</td>
                    <td className="p-2 text-destructive">{m.failure_count}</td>
                    <td className="p-2">
                      <Badge
                        variant={m.success_rate_pct >= 95 ? 'secondary' : 'destructive'}
                      >
                        {m.success_rate_pct}%
                      </Badge>
                    </td>
                    <td className="p-2">{Math.round(m.avg_latency_ms)}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Backlog warning */}
        {failedCount > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              توجد {failedCount} أحداث فاشلة تتطلب تدخّلاً يدوياً
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              راجع صفحة Domain Events لإعادة المحاولة أو الفحص اليدوي.
            </p>
          </div>
        )}

        {metrics.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            لا توجد بيانات أحداث مسجلة بعد. سيبدأ التسجيل بمجرد تشغيل أول دفعة.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
