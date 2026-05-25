/**
 * Dev-only dashboard for `pdf_export_jobs` with filters (status, date range,
 * id search) and a details drawer showing the full row payload + timeline.
 * Polls every 5s and lets the developer enqueue a sample render via the
 * `render-pdf` edge function.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Loader2, RefreshCw, Send, X, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEnqueuePdfExport } from '@/hooks/useEnqueuePdfExport';

interface PdfJobRow {
  id: string;
  doc_type: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  file_url: string | null;
  error_message: string | null;
  payload: unknown;
  delivered_to_email: string | null;
  requested_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

type StatusFilter = 'all' | PdfJobRow['status'];

const STATUS_TONE: Record<PdfJobRow['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  queued: 'secondary',
  running: 'default',
  done: 'outline',
  failed: 'destructive',
};

const STATUS_LABEL: Record<PdfJobRow['status'], string> = {
  queued: 'قائمة الانتظار',
  running: 'قيد التنفيذ',
  done: 'منجزة',
  failed: 'فاشلة',
};

function durationMs(a: string | null, b: string | null): string {
  if (!a || !b) return '—';
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export default function PdfJobsPage() {
  const [rows, setRows] = useState<PdfJobRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [idQuery, setIdQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selected, setSelected] = useState<PdfJobRow | null>(null);
  const enqueue = useEnqueuePdfExport();

  const refresh = async () => {
    setLoading(true);
    let q = supabase
      .from('pdf_export_jobs')
      .select(
        'id, doc_type, status, file_url, error_message, payload, delivered_to_email, requested_by, created_at, started_at, completed_at',
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (docTypeFilter !== 'all') q = q.eq('doc_type', docTypeFilter);
    if (fromDate) q = q.gte('created_at', new Date(fromDate).toISOString());
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      q = q.lte('created_at', end.toISOString());
    }

    const { data } = await q;
    setRows((data ?? []) as PdfJobRow[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, docTypeFilter, fromDate, toDate]);

  const docTypes = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.doc_type));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = idQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.id.toLowerCase().includes(q));
  }, [rows, idQuery]);

  const counts = useMemo(() => {
    const c = { queued: 0, running: 0, done: 0, failed: 0 };
    rows.forEach((r) => { c[r.status] += 1; });
    return c;
  }, [rows]);

  const clearFilters = () => {
    setStatusFilter('all');
    setDocTypeFilter('all');
    setIdQuery('');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <Card className="card-premium">
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>مهام تصدير PDF</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              قائمة الانتظار والمهام المكتملة — تحديث تلقائي كل 5 ثوانٍ
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
              مهمة تجريبية
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="قائمة الانتظار" value={counts.queued} tone="muted" />
            <Stat label="قيد التنفيذ" value={counts.running} tone="muted" />
            <Stat label="منجزة" value={counts.done} tone="success" />
            <Stat label="فاشلة" value={counts.failed} tone={counts.failed ? 'danger' : 'muted'} />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 rounded-md border bg-muted/30 p-3">
            <div className="space-y-1">
              <Label className="text-xs">الحالة</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="queued">{STATUS_LABEL.queued}</SelectItem>
                  <SelectItem value="running">{STATUS_LABEL.running}</SelectItem>
                  <SelectItem value="done">{STATUS_LABEL.done}</SelectItem>
                  <SelectItem value="failed">{STATUS_LABEL.failed}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نوع المستند</Label>
              <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {docTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">من تاريخ</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">إلى تاريخ</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">المعرّف</Label>
              <div className="flex gap-1">
                <Input
                  placeholder="بحث بالمعرّف..."
                  value={idQuery}
                  onChange={(e) => setIdQuery(e.target.value)}
                />
                <Button size="icon" variant="ghost" onClick={clearFilters} title="مسح الفلاتر">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              لا توجد مهام مطابقة
            </p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-right">
                  <tr>
                    <th className="px-3 py-2">المعرّف</th>
                    <th className="px-3 py-2">النوع</th>
                    <th className="px-3 py-2">الحالة</th>
                    <th className="px-3 py-2">المدّة</th>
                    <th className="px-3 py-2">أُنشئت</th>
                    <th className="px-3 py-2">رابط/خطأ</th>
                    <th className="px-3 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{r.id.slice(0, 8)}…</td>
                      <td className="px-3 py-2">{r.doc_type}</td>
                      <td className="px-3 py-2">
                        <Badge variant={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">{durationMs(r.started_at, r.completed_at)}</td>
                      <td className="px-3 py-2 text-xs">{new Date(r.created_at).toLocaleString('ar')}</td>
                      <td className="px-3 py-2 text-xs max-w-[260px] truncate">
                        {r.file_url ? (
                          <a href={r.file_url} target="_blank" rel="noreferrer" className="text-primary underline">
                            تحميل
                          </a>
                        ) : (
                          <span className="text-destructive">{r.error_message ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Button size="icon" variant="ghost" onClick={() => setSelected(r)} title="تفاصيل">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="left" className="w-full sm:max-w-xl overflow-y-auto" dir="rtl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>تفاصيل المهمة</SheetTitle>
                <SheetDescription className="font-mono text-xs">{selected.id}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <KV label="النوع" value={selected.doc_type} />
                  <KV label="الحالة" value={STATUS_LABEL[selected.status]} />
                  <KV label="بريد التسليم" value={selected.delivered_to_email ?? '—'} />
                  <KV label="طلبها" value={selected.requested_by?.slice(0, 8) ?? '—'} />
                </div>

                <div className="rounded-md border">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-medium">الجدول الزمني</div>
                  <div className="p-3 space-y-2 text-xs">
                    <TimelineRow label="أُنشئت" ts={selected.created_at} />
                    <TimelineRow label="بدأت" ts={selected.started_at} />
                    <TimelineRow label="اكتملت" ts={selected.completed_at} />
                    <div className="pt-2 border-t flex justify-between">
                      <span className="text-muted-foreground">المدّة الكلية</span>
                      <span className="font-medium">{durationMs(selected.started_at, selected.completed_at)}</span>
                    </div>
                  </div>
                </div>

                {selected.error_message && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
                    <div className="text-xs font-medium text-destructive mb-1">رسالة الخطأ</div>
                    <pre className="text-xs whitespace-pre-wrap break-words">{selected.error_message}</pre>
                  </div>
                )}

                {selected.file_url && (
                  <a
                    href={selected.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-sm text-primary underline"
                  >
                    تحميل الملف الناتج
                  </a>
                )}

                <div className="rounded-md border">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-medium">الحمولة (Payload)</div>
                  <pre className="p-3 text-xs whitespace-pre-wrap break-words max-h-80 overflow-auto">
                    {JSON.stringify(selected.payload ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'muted',
}: {
  label: string;
  value: number;
  tone?: 'success' | 'danger' | 'muted';
}) {
  const cls =
    tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`kpi-value ${cls}`}>{value}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium truncate">{value}</div>
    </div>
  );
}

function TimelineRow({ label, ts }: { label: string; ts: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{ts ? new Date(ts).toLocaleString('ar') : '—'}</span>
    </div>
  );
}
