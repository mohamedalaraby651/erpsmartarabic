import { useEffect, useMemo, useState } from 'react';
import {
  getAggregateMetrics,
  getMetricsSnapshot,
  resetPdfMetrics,
  subscribePdfMetrics,
  type PdfDocTypeMetrics,
} from '@/lib/pdf/diagnostics/telemetrySink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * DEV-only telemetry inspector for the PDF canary rollout (Phase 2).
 * Lives at `/dev/pdf-telemetry`. Shows v1 vs v2 counts, success rate,
 * average / last latency, and last error per document type — fed by the
 * in-memory telemetry sink (no network round-trip).
 */
export default function PdfTelemetryPage() {
  const [snap, setSnap] = useState<PdfDocTypeMetrics[]>(getMetricsSnapshot());
  useEffect(() => subscribePdfMetrics(setSnap), []);

  const agg = useMemo(() => getAggregateMetrics(), [snap]);
  const totalV1 = snap.reduce((s, m) => s + m.v1Successes + m.v1Failures, 0);
  const totalV2 = snap.reduce((s, m) => s + m.v2Successes + m.v2Failures, 0);
  const v2ErrRate = totalV2
    ? snap.reduce((s, m) => s + m.v2Failures, 0) / totalV2
    : 0;
  const v1ErrRate = totalV1
    ? snap.reduce((s, m) => s + m.v1Failures, 0) / totalV1
    : 0;

  return (
    <div dir="rtl" className="container mx-auto py-8 space-y-6 max-w-6xl">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">قياس محركات PDF (DEV)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            مقارنة حية بين المحرك القديم (v1) والمحرك الجديد (v2) — البيانات
            في الذاكرة فقط ولا تُرسل تلقائياً.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => resetPdfMetrics()}>
          تصفير العدّادات
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="إجمالي النجاحات" value={agg.totalSuccesses} tone="success" />
        <Stat label="إجمالي الإخفاقات" value={agg.totalFailures} tone={agg.totalFailures ? 'danger' : 'muted'} />
        <Stat label="متوسط الزمن" value={`${agg.avgDurationMs} ms`} />
        <Stat label="معدل الخطأ الكلي" value={`${(agg.errorRate * 100).toFixed(2)}%`} />
        <Stat label="استدعاءات v1" value={totalV1} />
        <Stat label="استدعاءات v2" value={totalV2} />
        <Stat
          label="معدل خطأ v1"
          value={`${(v1ErrRate * 100).toFixed(2)}%`}
          tone={v1ErrRate > 0.005 ? 'danger' : 'success'}
        />
        <Stat
          label="معدل خطأ v2"
          value={`${(v2ErrRate * 100).toFixed(2)}%`}
          tone={v2ErrRate > 0.005 ? 'danger' : 'success'}
        />
      </div>

      <Card className="card-premium">
        <CardHeader>
          <CardTitle>تفصيل حسب نوع المستند</CardTitle>
        </CardHeader>
        <CardContent>
          {snap.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              لا توجد بيانات بعد — قم بتصدير مستند لرؤية القياسات.
            </p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-right">
                  <tr>
                    <th className="px-3 py-2">النوع</th>
                    <th className="px-3 py-2">v1 ✓ / ✗</th>
                    <th className="px-3 py-2">v2 ✓ / ✗</th>
                    <th className="px-3 py-2">آخر محرك</th>
                    <th className="px-3 py-2">آخر زمن</th>
                    <th className="px-3 py-2">خط</th>
                    <th className="px-3 py-2">آخر خطأ</th>
                  </tr>
                </thead>
                <tbody>
                  {snap.map((m) => (
                    <tr key={m.docType} className="border-t align-top">
                      <td className="px-3 py-2 font-medium">{m.docType}</td>
                      <td className="px-3 py-2 tabular-nums">
                        <span className="text-success">{m.v1Successes}</span> /{' '}
                        <span className={m.v1Failures ? 'text-destructive' : ''}>{m.v1Failures}</span>
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        <span className="text-success">{m.v2Successes}</span> /{' '}
                        <span className={m.v2Failures ? 'text-destructive' : ''}>{m.v2Failures}</span>
                      </td>
                      <td className="px-3 py-2">
                        {m.lastEngine ? (
                          <Badge variant={m.lastEngine === 'v2' ? 'default' : 'secondary'}>
                            {m.lastEngine}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{Math.round(m.lastDurationMs)} ms</td>
                      <td className="px-3 py-2 text-xs">{m.lastFontCacheHit ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[280px] truncate">
                        {m.lastErrorMessage ?? '—'}
                        {m.lastErrorCode ? ` (${m.lastErrorCode})` : ''}
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

function Stat({
  label,
  value,
  tone = 'muted',
}: {
  label: string;
  value: string | number;
  tone?: 'success' | 'danger' | 'muted';
}) {
  const cls =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-destructive'
        : 'text-foreground';
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`kpi-value ${cls}`}>{value}</div>
    </div>
  );
}
