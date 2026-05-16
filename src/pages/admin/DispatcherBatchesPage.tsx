/**
 * DispatcherBatchesPage
 * Admin dashboard showing recent event-dispatcher batch runs grouped by correlation_id,
 * with processed/failed/skipped counters and per-batch latency.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw, Search, SkipForward } from 'lucide-react';
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

const fmtTime = (iso: string) => new Date(iso).toLocaleString('ar-EG', { hour12: false });

export default function DispatcherBatchesPage() {
  usePageTitle('مقاييس Event Dispatcher');
  const [search, setSearch] = useState('');

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dispatcher-batch-runs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('dispatcher_batch_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as BatchRow[];
    },
    refetchInterval: 15_000,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.correlation_id.toLowerCase().includes(q) ||
        (r.auth_mode || '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.batches++;
          acc.processed += r.processed;
          acc.failed += r.failed;
          acc.skipped += r.skipped;
          acc.totalMs += r.total_ms;
          return acc;
        },
        { batches: 0, processed: 0, failed: 0, skipped: 0, totalMs: 0 },
      ),
    [rows],
  );

  const avgMs = totals.batches ? Math.round(totals.totalMs / totals.batches) : 0;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">مقاييس Event Dispatcher</h1>
          <p className="text-sm text-muted-foreground">
            آخر 200 دفعة معالجة، محدّثة كل 15 ثانية
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ml-2 ${isFetching ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard icon={<Activity className="h-5 w-5 text-primary" />} value={totals.batches} label="إجمالي الدفعات" />
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5 text-success" />} value={totals.processed} label="ناجح" />
        <SummaryCard icon={<AlertTriangle className={`h-5 w-5 ${totals.failed > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />} value={totals.failed} label="فشل" />
        <SummaryCard icon={<SkipForward className="h-5 w-5 text-warning" />} value={totals.skipped} label="متخطّى" />
        <SummaryCard icon={<Clock className="h-5 w-5 text-info" />} value={`${avgMs}ms`} label="متوسط الزمن/دفعة" />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث بمعرّف الترابط أو طريقة المصادقة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>الدفعات الأخيرة ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              لا توجد دفعات مسجّلة بعد. سيظهر المحتوى بمجرد تشغيل المُرسِل.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-right">
                    <th className="p-2 font-medium">وقت البدء</th>
                    <th className="p-2 font-medium">معرّف الترابط</th>
                    <th className="p-2 font-medium">حجم</th>
                    <th className="p-2 font-medium">مُلتَقَط</th>
                    <th className="p-2 font-medium text-success">نجاح</th>
                    <th className="p-2 font-medium text-destructive">فشل</th>
                    <th className="p-2 font-medium text-warning">تخطّي</th>
                    <th className="p-2 font-medium">الزمن</th>
                    <th className="p-2 font-medium">المصدر</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const isSlow = r.total_ms > 5000;
                    return (
                      <tr key={r.id} className="border-t hover:bg-muted/30">
                        <td className="p-2 whitespace-nowrap text-xs text-muted-foreground">
                          {fmtTime(r.started_at)}
                        </td>
                        <td className="p-2 font-mono text-xs" title={r.correlation_id}>
                          <Link
                            to={`/admin/dispatcher-batches/${encodeURIComponent(r.correlation_id)}`}
                            className="text-primary hover:underline"
                          >
                            {r.correlation_id.slice(0, 8)}…
                          </Link>
                        </td>
                        <td className="p-2">{r.batch_size}</td>
                        <td className="p-2">{r.claimed_count}</td>
                        <td className="p-2 text-success font-medium">{r.processed}</td>
                        <td className="p-2">
                          {r.failed > 0 ? (
                            <Badge variant="destructive">{r.failed}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="p-2">
                          {r.skipped > 0 ? (
                            <Badge variant="secondary">{r.skipped}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="p-2">
                          <span className={isSlow ? 'text-warning font-medium' : ''}>
                            {r.total_ms}ms
                          </span>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {r.auth_mode || '—'}
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

function SummaryCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
