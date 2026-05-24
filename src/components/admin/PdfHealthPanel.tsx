import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAggregateMetrics,
  getMetricsSnapshot,
  resetPdfMetrics,
  subscribePdfMetrics,
  type PdfDocTypeMetrics,
} from '@/lib/pdf/diagnostics/telemetrySink';
import { flushPdfMetrics } from '@/lib/pdf/diagnostics/telemetryFlush';
import { isPdfEngineV2Enabled } from '@/lib/pdf/featureFlags';

/**
 * Admin-facing live view of PDF export health (success/failure counts,
 * avg duration, last error per docType). Listens to the in-memory
 * telemetry sink and can flush to the backend on demand.
 *
 * Purely presentational: no data persistence here — flushing happens
 * via `flushPdfMetrics` → `log-event` Edge Function.
 */
export function PdfHealthPanel() {
  const [snapshot, setSnapshot] = useState<PdfDocTypeMetrics[]>(getMetricsSnapshot());
  const [flushing, setFlushing] = useState(false);
  const v2 = isPdfEngineV2Enabled();
  const agg = getAggregateMetrics();

  useEffect(() => subscribePdfMetrics(setSnapshot), []);

  const handleFlush = async () => {
    setFlushing(true);
    try {
      const res = await flushPdfMetrics();
      if (res.ok) {
        toast.success(`تم إرسال ${res.flushed} سجل إلى السجل المركزي`);
      } else {
        toast.error(`فشل الإرسال: ${res.error ?? 'خطأ غير معروف'}`);
      }
    } finally {
      setFlushing(false);
    }
  };

  return (
    <Card className="card-premium">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>صحة محرك توليد PDF</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            مراقبة حية لعمليات تصدير المستندات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={v2 ? 'default' : 'secondary'}>
            {v2 ? 'محرك v2' : 'محرك v1'}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { resetPdfMetrics(); toast.message('تمت إعادة التعيين'); }}
          >
            <RefreshCw className="h-4 w-4 ml-1" />
            تصفير
          </Button>
          <Button size="sm" onClick={handleFlush} disabled={flushing || snapshot.length === 0}>
            {flushing ? (
              <Loader2 className="h-4 w-4 ml-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 ml-1" />
            )}
            إرسال إلى السجل
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="نجاحات" value={agg.totalSuccesses} tone="success" />
          <Stat label="إخفاقات" value={agg.totalFailures} tone={agg.totalFailures ? 'danger' : 'muted'} />
          <Stat label="متوسط الزمن" value={`${agg.avgDurationMs} ms`} />
          <Stat label="معدل الخطأ" value={`${(agg.errorRate * 100).toFixed(2)}%`} tone={agg.errorRate > 0.05 ? 'danger' : 'muted'} />
        </div>

        {snapshot.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            لا توجد بيانات بعد — قم بتصدير مستند لتظهر هنا.
          </p>
        ) : (
          <div className="overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-right">
                <tr>
                  <th className="px-3 py-2">النوع</th>
                  <th className="px-3 py-2">نجاح</th>
                  <th className="px-3 py-2">فشل</th>
                  <th className="px-3 py-2">آخر زمن</th>
                  <th className="px-3 py-2">آخر خطأ</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.map((m) => (
                  <tr key={m.docType} className="border-t">
                    <td className="px-3 py-2 font-medium">{m.docType}</td>
                    <td className="px-3 py-2 text-success">{m.successes}</td>
                    <td className={`px-3 py-2 ${m.failures ? 'text-destructive' : ''}`}>{m.failures}</td>
                    <td className="px-3 py-2">{Math.round(m.lastDurationMs)} ms</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[240px] truncate">
                      {m.lastErrorMessage ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone = 'muted',
}: {
  label: string;
  value: string | number;
  tone?: 'success' | 'danger' | 'muted';
}) {
  const toneCls =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-destructive'
        : 'text-foreground';
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`kpi-value ${toneCls}`}>{value}</div>
    </div>
  );
}
