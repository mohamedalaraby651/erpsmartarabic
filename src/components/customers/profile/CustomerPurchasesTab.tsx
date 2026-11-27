import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Search, X, Filter, Check, Clock, AlertTriangle, RotateCcw, ArrowUpDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatEGP } from "@/lib/format/money";
import { invoiceRemaining, overdueDays } from "@/lib/customers/profileMetrics";
import { customerProfileRepository } from "@/lib/repositories/customerProfileRepository";
import type { CustomerProfileV19 } from "@/hooks/customers/useCustomerProfileV19";
import { ExpandableInvoiceRow } from "./ExpandableInvoiceRow";
import { fmtDate } from "./methods";
import { Pill, type Tone } from "./ui";
import { cn } from "@/lib/utils";

type Kind = 'invoice' | 'return' | 'order';
type Doc = { key: string; kind: Kind; id: string; number: string; subtitle: string; date: string; total: number; remaining: number; status: string; paidPct: number | null; od: number };
type SortKey = 'number' | 'date' | 'total' | 'remaining' | 'status';
const KIND_AR: Record<Kind, string> = { invoice: 'فاتورة بيع', return: 'مرتجع بيع', order: 'أمر بيع' };
const STATUS_AR: Record<string, string> = { paid: 'مدفوعة', partial: 'سداد جزئي', pending: 'غير مدفوعة', overdue: 'متأخرة', cancelled: 'ملغاة', draft: 'مسودة', approved: 'معتمد', completed: 'مكتمل', confirmed: 'مؤكد', return: 'مرتجع' };
const fmtShort = (d: string) => new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });

function look(d: Doc): { tone: Tone; bar: string; icon: LucideIcon; label: string } {
  if (d.kind === 'return') return { tone: 'primary', bar: 'bg-primary', icon: RotateCcw, label: 'مرتجع' };
  if (d.status === 'overdue') return { tone: 'destructive', bar: 'bg-destructive', icon: AlertTriangle, label: `متأخرة ${d.od} يوم` };
  if (d.status === 'paid' || d.status === 'completed') return { tone: 'success', bar: 'bg-success', icon: Check, label: STATUS_AR[d.status] ?? d.status };
  if (d.status === 'partial') return { tone: 'warning', bar: 'bg-warning', icon: Clock, label: 'سداد جزئي' };
  return { tone: 'muted', bar: 'bg-border-strong', icon: Clock, label: STATUS_AR[d.status] ?? d.status };
}

interface Props { profile: CustomerProfileV19; customerName: string; customerPhone?: string | null; onPay: (invoiceId?: string) => void; onPrintStatement: () => void; forceOpen?: boolean }

export function CustomerPurchasesTab({ profile, customerName, customerPhone, onPay, onPrintStatement, forceOpen }: Props) {
  const [q, setQ] = useState(''); const [status, setStatus] = useState('all'); const [kind, setKind] = useState<'all' | Kind>('all');
  const [last3, setLast3] = useState(true); const [showFilters, setShowFilters] = useState(false);
  const [open, setOpen] = useState<string | null>(null); const [sel, setSel] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'date', dir: -1 });

  const docs = useMemo<Doc[]>(() => {
    const now = Date.now();
    const inv: Doc[] = profile.invoices.map((i) => {
      const rem = invoiceRemaining(i); const tot = Number(i.total_amount ?? 0); const od = rem > 0 && i.due_date ? overdueDays(i, now) : 0;
      const st = i.status === 'cancelled' ? 'cancelled' : rem <= 0 && tot > 0 ? 'paid' : od > 0 ? 'overdue' : (i.payment_status ?? 'pending');
      return { key: `i-${i.id}`, kind: 'invoice', id: i.id, number: i.invoice_number, subtitle: i.notes?.split('\n')[0] || (i.due_date ? `يستحق ${fmtDate(i.due_date)}` : ''), date: i.created_at, total: tot, remaining: rem, status: st, paidPct: tot > 0 ? Math.round(((tot - rem) / tot) * 100) : null, od };
    });
    const ret: Doc[] = profile.creditNotes.map((c) => ({ key: `r-${c.id}`, kind: 'return', id: c.id, number: c.credit_note_number, subtitle: c.reason || 'مرتجع', date: c.created_at, total: Number(c.amount), remaining: 0, status: c.status ?? 'draft', paidPct: null, od: 0 }));
    const ord: Doc[] = profile.salesOrders.map((o) => ({ key: `o-${o.id}`, kind: 'order', id: o.id, number: o.order_number, subtitle: STATUS_AR[o.status] ?? o.status, date: o.created_at, total: Number(o.total_amount), remaining: 0, status: o.status, paidPct: null, od: 0 }));
    return [...inv, ...ret, ...ord];
  }, [profile.invoices, profile.creditNotes, profile.salesOrders]);

  const cutoff = Date.now() - 92 * 86400000;
  const shown = docs.filter((d) => (!last3 || new Date(d.date).getTime() >= cutoff)
    && (status === 'all' || d.status === status) && (kind === 'all' || d.kind === kind)
    && (!q.trim() || d.number.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => {
      const k = sort.key; const av = a[k]; const bv = b[k];
      return (typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))) * sort.dir;
    });

  const invIds = shown.filter((d) => d.kind === 'invoice').map((d) => d.id);
  const { data: counts = {} } = useQuery({ queryKey: ['invoice-item-counts', invIds], queryFn: () => customerProfileRepository.invoiceItemCounts(invIds), enabled: invIds.length > 0 });
  const selectable = shown.filter((d) => d.kind === 'invoice');
  const selRemaining = Math.round(shown.filter((d) => sel.has(d.id)).reduce((s, d) => s + d.remaining, 0) * 100) / 100;
  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSel = selectable.length > 0 && selectable.every((d) => sel.has(d.id));
  const clearAll = () => { setQ(''); setStatus('all'); setKind('all'); setLast3(false); };

  const Th = ({ k, children }: { k?: SortKey; children: React.ReactNode }) => (
    <th className="p-2.5 text-start font-semibold" aria-sort={k && sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
      {k ? (
        <button type="button" className={cn("inline-flex items-center gap-1", sort.key === k && "text-primary")} onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : -1 }))}>
          {children}{sort.key === k ? (sort.dir === 1 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
        </button>
      ) : children}
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث في المشتريات" className="h-9 rounded-lg ps-8 text-[13px]" aria-label="بحث في المشتريات" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-36 rounded-lg text-[13px]" aria-label="الحالة">
              <span className="text-muted-foreground">الحالة:</span><b>{status === 'all' ? 'الكل' : STATUS_AR[status]}</b>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {['paid', 'partial', 'pending', 'overdue', 'cancelled'].map((s) => <SelectItem key={s} value={s}>{STATUS_AR[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <button type="button" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border-2 border-primary px-3 text-[13px] font-bold text-primary hover:bg-primary/5">
            <Filter className="h-3.5 w-3.5" />تصفية
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{last3 ? 'يعرض آخر 3 شهور' : 'يعرض كل الفترات'} · {shown.length} من {docs.length} مستند</span>
          <button type="button" onClick={() => setLast3(false)} className="h-8 rounded-full border border-primary/40 px-3 text-xs font-bold text-primary hover:bg-primary/5">عرض الكل ({docs.length})</button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs no-print" role="group" aria-label="نوع المستند">
          <span className="text-muted-foreground">النوع:</span>
          {(['all', 'invoice', 'return', 'order'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
              className={cn("h-7 rounded-full border px-3 font-semibold", kind === k ? "border-primary bg-primary/10 text-primary" : "border-border")}>
              {k === 'all' ? 'الكل' : KIND_AR[k]}
            </button>
          ))}
        </div>
      )}

      {(last3 || status !== 'all' || kind !== 'all' || q) && (
        <div className="flex flex-wrap items-center gap-2 text-xs no-print">
          <span className="text-muted-foreground">الفلاتر النشطة:</span>
          {last3 && <Pill tone="primary">الفترة: آخر 3 شهور (افتراضي)<button type="button" onClick={() => setLast3(false)} aria-label="إزالة فلتر الفترة"><X className="h-3 w-3" /></button></Pill>}
          {status !== 'all' && <Pill tone="primary">الحالة: {STATUS_AR[status]}<button type="button" onClick={() => setStatus('all')} aria-label="إزالة فلتر الحالة"><X className="h-3 w-3" /></button></Pill>}
          {kind !== 'all' && <Pill tone="primary">النوع: {KIND_AR[kind]}<button type="button" onClick={() => setKind('all')} aria-label="إزالة فلتر النوع"><X className="h-3 w-3" /></button></Pill>}
          <button type="button" onClick={clearAll} className="font-bold text-destructive hover:underline">مسح الكل</button>
        </div>
      )}

      {sel.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-[13px] no-print">
          <span className="flex items-center gap-2"><Check className="h-4 w-4 rounded bg-primary p-0.5 text-primary-foreground" />تم تحديد <b className="text-primary">{sel.size} فاتورة</b> · إجمالي المتبقي <b className="text-primary">{formatEGP(selRemaining)}</b></span>
          <span className="flex gap-2">
            <button type="button" onClick={() => onPay()} className="h-8 rounded-full bg-success px-4 text-xs font-bold text-success-foreground hover:bg-success/90">تسجيل دفعة واحدة للمحدد</button>
            <button type="button" onClick={onPrintStatement} className="h-8 rounded-full border border-border bg-card px-4 text-xs font-bold hover:bg-muted">طباعة كشف</button>
            <button type="button" onClick={() => setSel(new Set())} className="h-8 px-2 text-xs font-bold text-destructive hover:underline">إلغاء التحديد</button>
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full table-fixed text-[13px]">
          <colgroup><col className="w-11" /><col className="w-[19%]" /><col /><col /><col /><col /><col /><col className="w-[17%]" /><col className="w-10" /></colgroup>
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="p-2.5 no-print"><Checkbox checked={allSel} onCheckedChange={() => setSel(allSel ? new Set() : new Set(selectable.map((d) => d.id)))} aria-label="تحديد الكل" /></th>
              <Th k="number">رقم المستند</Th><Th>النوع</Th><Th k="date">التاريخ</Th><Th>الأصناف</Th>
              <Th k="total">الإجمالي</Th><Th k="remaining">المتبقي</Th><Th k="status">الحالة</Th>
              <th className="no-print"><span className="sr-only">توسيع</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">{docs.length ? 'لا توجد مستندات مطابقة للفلاتر' : 'لا توجد مشتريات لهذا العميل'}</td></tr>}
            {shown.map((d) => {
              const isOpen = d.kind === 'invoice' && (open === d.id || !!forceOpen);
              const inv = d.kind === 'invoice' ? profile.invoices.find((i) => i.id === d.id) : undefined;
              const lk = look(d); const Icon = lk.icon;
              const items = d.kind === 'invoice' ? counts[d.id] : undefined;
              return (
                <Fragment key={d.key}>
                  <tr className={cn("border-b border-border", d.status === 'overdue' ? "bg-destructive/5" : isOpen ? "bg-primary/5" : "hover:bg-muted/30")}>
                    <td className="relative p-2.5 no-print">
                      <span className={cn("absolute inset-y-0 start-0 w-1", lk.bar)} aria-hidden />
                      {d.kind === 'invoice' && <Checkbox checked={sel.has(d.id)} onCheckedChange={() => toggleSel(d.id)} aria-label={`تحديد ${d.number}`} />}
                    </td>
                    <td className="p-2.5"><div className="truncate font-bold tabular-nums">{d.number}</div>{d.subtitle && <div className="truncate text-[11px] text-muted-foreground">{d.subtitle}</div>}</td>
                    <td className="p-2.5">{KIND_AR[d.kind]}</td>
                    <td className="p-2.5">{fmtShort(d.date)}</td>
                    <td className="p-2.5">{items !== undefined ? `${items} ${items === 1 ? 'صنف' : 'أصناف'}` : '—'}</td>
                    <td className="whitespace-nowrap p-2.5 text-[12.5px] font-bold tabular-nums">{formatEGP(d.total)}</td>
                    <td className={cn("whitespace-nowrap p-2.5 text-[12.5px] font-bold tabular-nums", d.remaining > 0 ? (d.status === 'overdue' ? 'text-destructive' : 'text-warning') : '')}>
                      {d.kind === 'invoice' ? (d.remaining > 0 ? formatEGP(d.remaining) : '0') : '—'}
                    </td>
                    <td className="p-2.5">
                      <Pill tone={lk.tone}><Icon className="h-3 w-3" />{lk.label}</Pill>
                      {d.paidPct !== null ? (
                        <div className="mt-1 w-20">
                          <div className="h-1 overflow-hidden rounded-full bg-muted"><div className={cn("h-full", lk.bar)} style={{ width: `${d.paidPct}%` }} /></div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">مدفوع {d.paidPct}%</div>
                        </div>
                      ) : <div className={cn("mt-1 h-1 w-20 rounded-full", lk.bar)} />}
                    </td>
                    <td className="p-2.5 no-print">
                      {d.kind === 'invoice' && (
                        <button type="button" onClick={() => setOpen(open === d.id ? null : d.id)} aria-expanded={isOpen} aria-label={`${isOpen ? 'طي' : 'توسيع'} ${d.number}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && inv && (
                    <tr className="border-b-2 border-primary"><td colSpan={9} className="p-0">
                      <ExpandableInvoiceRow invoice={inv} customerName={customerName} customerPhone={customerPhone} payments={profile.payments.filter((p) => p.invoice_id === inv.id)}
                        returns={profile.creditNotes.filter((c) => c.invoice_id === inv.id)} onPay={() => onPay(inv.id)} />
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {last3 && shown.length < docs.length && (
        <div className="text-center no-print"><button type="button" onClick={() => setLast3(false)} className="text-[13px] font-bold text-primary hover:underline">عرض كل المستندات ({docs.length})</button></div>
      )}
    </div>
  );
}
