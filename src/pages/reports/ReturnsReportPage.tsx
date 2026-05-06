import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ChevronDown, ChevronLeft, ExternalLink, Loader2, RotateCcw, FileX,
  Receipt, TrendingDown,
} from 'lucide-react';

type CreditNoteRow = {
  id: string;
  credit_note_number: string;
  invoice_id: string;
  status: string;
  amount: number;
  created_at: string;
  invoices: { invoice_number: string; total_amount: number; customer_id: string; customers: { name: string } | null } | null;
  credit_note_items: Array<{
    id: string;
    invoice_item_id: string | null;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    products: { name: string } | null;
  }>;
};

type InvoiceItemRow = {
  id: string;
  invoice_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  products: { name: string } | null;
};

interface InvoiceSummary {
  invoice_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  invoice_total: number;
  total_returned: number;
  return_count: number;
  credit_notes: Array<{ id: string; number: string; status: string; amount: number; created_at: string }>;
  items: Array<{
    invoice_item_id: string;
    product_name: string;
    original_qty: number;
    returned_qty: number;
    remaining_qty: number;
    unit_price: number;
  }>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function ReturnsReportPage() {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['returns-report', from, to],
    queryFn: async () => {
      // 1) Fetch credit notes within the date range, with items + invoice header
      const fromIso = new Date(from + 'T00:00:00').toISOString();
      const toIso = new Date(to + 'T23:59:59').toISOString();

      const { data: cns, error: cnErr } = await supabase
        .from('credit_notes')
        .select(`
          id, credit_note_number, invoice_id, status, amount, created_at,
          invoices:invoice_id ( invoice_number, total_amount, customer_id,
            customers:customer_id ( name )
          ),
          credit_note_items (
            id, invoice_item_id, product_id, quantity, unit_price, total_price,
            products:product_id ( name )
          )
        `)
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .order('created_at', { ascending: false });
      if (cnErr) throw cnErr;
      const creditNotes = (cns ?? []) as unknown as CreditNoteRow[];

      // 2) Pull all invoice items for the affected invoices (so we can show original qty + remaining)
      const invoiceIds = Array.from(new Set(creditNotes.map(c => c.invoice_id).filter(Boolean)));
      let items: InvoiceItemRow[] = [];
      if (invoiceIds.length) {
        const { data: it, error: itErr } = await supabase
          .from('invoice_items')
          .select('id, invoice_id, product_id, quantity, unit_price, products:product_id(name)')
          .in('invoice_id', invoiceIds);
        if (itErr) throw itErr;
        items = (it ?? []) as unknown as InvoiceItemRow[];
      }

      return { creditNotes, items };
    },
  });

  const summaries: InvoiceSummary[] = useMemo(() => {
    if (!data) return [];
    const { creditNotes, items } = data;

    // Items grouped by invoice
    const itemsByInvoice = new Map<string, InvoiceItemRow[]>();
    items.forEach(it => {
      const arr = itemsByInvoice.get(it.invoice_id) ?? [];
      arr.push(it);
      itemsByInvoice.set(it.invoice_id, arr);
    });

    // Sum confirmed returned qty per invoice_item_id (only confirmed credit notes count for "remaining")
    const returnedByItem = new Map<string, number>();
    creditNotes.forEach(cn => {
      if (cn.status !== 'confirmed') return;
      cn.credit_note_items.forEach(ci => {
        if (!ci.invoice_item_id) return;
        returnedByItem.set(
          ci.invoice_item_id,
          (returnedByItem.get(ci.invoice_item_id) ?? 0) + Number(ci.quantity || 0),
        );
      });
    });

    // Group credit notes by invoice
    const cnByInvoice = new Map<string, CreditNoteRow[]>();
    creditNotes.forEach(cn => {
      if (!cn.invoice_id) return;
      const arr = cnByInvoice.get(cn.invoice_id) ?? [];
      arr.push(cn);
      cnByInvoice.set(cn.invoice_id, arr);
    });

    const result: InvoiceSummary[] = [];
    cnByInvoice.forEach((cns, invoiceId) => {
      const head = cns[0]?.invoices;
      if (!head) return;
      const itemsForInv = itemsByInvoice.get(invoiceId) ?? [];

      const totalReturned = round2(
        cns
          .filter(c => c.status === 'confirmed')
          .reduce((s, c) => s + Number(c.amount || 0), 0),
      );

      result.push({
        invoice_id: invoiceId,
        invoice_number: head.invoice_number,
        customer_id: head.customer_id,
        customer_name: head.customers?.name ?? '—',
        invoice_total: Number(head.total_amount || 0),
        total_returned: totalReturned,
        return_count: cns.length,
        credit_notes: cns.map(c => ({
          id: c.id,
          number: c.credit_note_number,
          status: c.status,
          amount: Number(c.amount || 0),
          created_at: c.created_at,
        })),
        items: itemsForInv.map(it => {
          const returned = returnedByItem.get(it.id) ?? 0;
          const original = Number(it.quantity);
          return {
            invoice_item_id: it.id,
            product_name: it.products?.name ?? '—',
            original_qty: original,
            returned_qty: returned,
            remaining_qty: round2(Math.max(0, original - returned)),
            unit_price: Number(it.unit_price),
          };
        }),
      });
    });

    return result.sort((a, b) => b.total_returned - a.total_returned);
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter(s =>
      s.invoice_number.toLowerCase().includes(q) ||
      s.customer_name.toLowerCase().includes(q) ||
      s.credit_notes.some(c => c.number?.toLowerCase().includes(q)),
    );
  }, [summaries, search]);

  const totals = useMemo(() => {
    const invoices = filtered.length;
    const confirmedReturns = filtered.reduce((s, x) => s + x.total_returned, 0);
    const allCns = filtered.reduce((s, x) => s + x.return_count, 0);
    const fullyReturned = filtered.filter(x => x.items.length > 0 && x.items.every(i => i.remaining_qty === 0)).length;
    return {
      invoices,
      confirmedReturns: round2(confirmedReturns),
      allCns,
      fullyReturned,
    };
  }, [filtered]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-primary" />
            تقرير المرتجعات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ملخص مرتجعات كل فاتورة مع تفصيل البنود وروابط مباشرة.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Receipt} label="فواتير بها مرتجعات" value={totals.invoices} />
        <KpiCard icon={RotateCcw} label="إجمالي إشعارات الإرجاع" value={totals.allCns} />
        <KpiCard
          icon={TrendingDown}
          label="قيمة المرتجعات المؤكدة"
          value={`${totals.confirmedReturns.toLocaleString()} ج.م`}
          tone="destructive"
        />
        <KpiCard icon={FileX} label="فواتير مُرجَعة بالكامل" value={totals.fullyReturned} tone="warning" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">من تاريخ</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">إلى تاريخ</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">بحث (فاتورة / عميل / رقم إشعار)</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث…" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">المرتجعات حسب الفاتورة ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin inline ml-2" />
              جارِ التحميل…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              لا توجد مرتجعات في الفترة المحددة.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>الفاتورة</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead className="text-left">إجمالي الفاتورة</TableHead>
                    <TableHead className="text-left">قيمة المرتجع</TableHead>
                    <TableHead className="text-left">% المرتجع</TableHead>
                    <TableHead className="text-center">إشعارات</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => {
                    const pct = s.invoice_total > 0
                      ? round2((s.total_returned / s.invoice_total) * 100)
                      : 0;
                    const isOpen = expanded.has(s.invoice_id);
                    return (
                      <>
                        <TableRow key={s.invoice_id} className="cursor-pointer hover:bg-muted/40" onClick={() => toggle(s.invoice_id)}>
                          <TableCell>
                            {isOpen
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronLeft className="h-4 w-4" />}
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link
                              to={`/invoices/${s.invoice_id}`}
                              onClick={e => e.stopPropagation()}
                              className="hover:underline text-primary inline-flex items-center gap-1"
                            >
                              {s.invoice_number}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link
                              to={`/customers/${s.customer_id}`}
                              onClick={e => e.stopPropagation()}
                              className="hover:underline"
                            >
                              {s.customer_name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-left tabular-nums">
                            {s.invoice_total.toLocaleString()} ج.م
                          </TableCell>
                          <TableCell className="text-left tabular-nums text-destructive font-medium">
                            {s.total_returned.toLocaleString()} ج.م
                          </TableCell>
                          <TableCell className="text-left">
                            <Badge variant={pct >= 100 ? 'destructive' : pct >= 50 ? 'secondary' : 'outline'}>
                              {pct}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{s.return_count}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>

                        {isOpen && (
                          <TableRow key={`${s.invoice_id}-detail`} className="bg-muted/20">
                            <TableCell colSpan={8} className="p-4 space-y-4">
                              {/* Credit notes list */}
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-2">
                                  إشعارات الإرجاع
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {s.credit_notes.map(c => (
                                    <Link
                                      key={c.id}
                                      to={`/credit-notes/${c.id}`}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card hover:bg-accent text-xs transition-colors"
                                    >
                                      <span className="font-medium">{c.number || '—'}</span>
                                      <Badge
                                        variant={
                                          c.status === 'confirmed' ? 'default'
                                          : c.status === 'cancelled' ? 'outline'
                                          : 'secondary'
                                        }
                                        className="text-[10px] py-0"
                                      >
                                        {c.status === 'confirmed' ? 'مؤكد' : c.status === 'cancelled' ? 'ملغى' : 'مسودة'}
                                      </Badge>
                                      <span className="text-muted-foreground tabular-nums">
                                        {Number(c.amount).toLocaleString()} ج.م
                                      </span>
                                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                    </Link>
                                  ))}
                                </div>
                              </div>

                              {/* Items breakdown */}
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-2">
                                  تفصيل البنود
                                </div>
                                <div className="border rounded-md overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/40">
                                        <TableHead>المنتج</TableHead>
                                        <TableHead className="text-center">الكمية الأصلية</TableHead>
                                        <TableHead className="text-center">المُرتجعة</TableHead>
                                        <TableHead className="text-center">المتبقية</TableHead>
                                        <TableHead className="text-left">سعر الوحدة</TableHead>
                                        <TableHead className="text-center">الحالة</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {s.items.map(i => {
                                        const fully = i.original_qty > 0 && i.remaining_qty === 0;
                                        const partial = i.returned_qty > 0 && !fully;
                                        return (
                                          <TableRow key={i.invoice_item_id}>
                                            <TableCell className="text-sm">{i.product_name}</TableCell>
                                            <TableCell className="text-center tabular-nums">{i.original_qty}</TableCell>
                                            <TableCell className="text-center tabular-nums text-destructive">
                                              {i.returned_qty}
                                            </TableCell>
                                            <TableCell className="text-center tabular-nums font-medium">
                                              <span className={i.remaining_qty === 0 ? 'text-muted-foreground' : 'text-success'}>
                                                {i.remaining_qty}
                                              </span>
                                            </TableCell>
                                            <TableCell className="text-left tabular-nums">
                                              {i.unit_price.toLocaleString()} ج.م
                                            </TableCell>
                                            <TableCell className="text-center">
                                              {fully ? (
                                                <Badge variant="destructive" className="text-[10px]">مُرجع كامل</Badge>
                                              ) : partial ? (
                                                <Badge variant="secondary" className="text-[10px]">مُرجع جزئي</Badge>
                                              ) : (
                                                <Badge variant="outline" className="text-[10px]">لا يوجد</Badge>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>

                              <div className="flex justify-end">
                                <Button asChild size="sm" variant="outline">
                                  <Link to={`/invoices/${s.invoice_id}`}>
                                    فتح الفاتورة
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, tone = 'primary',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  tone?: 'primary' | 'destructive' | 'warning' | 'success';
}) {
  const toneMap: Record<string, string> = {
    primary: 'text-primary bg-primary/10',
    destructive: 'text-destructive bg-destructive/10',
    warning: 'text-warning bg-warning/10',
    success: 'text-success bg-success/10',
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-lg font-bold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
