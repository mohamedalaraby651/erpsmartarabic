import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronLeft, Search, X, Wallet, Printer } from "lucide-react";
import { formatEGP } from "@/lib/format/money";
import { invoiceRemaining, overdueDays } from "@/lib/customers/profileMetrics";
import { customerProfileRepository } from "@/lib/repositories/customerProfileRepository";
import type { CustomerProfileV19 } from "@/hooks/customers/useCustomerProfileV19";
import { ExpandableInvoiceRow } from "./ExpandableInvoiceRow";
import { fmtDate } from "./methods";

type Doc = { key: string; kind: 'invoice' | 'return' | 'order'; id: string; number: string; date: string; total: number; remaining: number; status: string; paidPct: number | null };
const KIND_AR = { invoice: 'فاتورة بيع', return: 'مرتجع بيع', order: 'أمر بيع' };
const STATUS_AR: Record<string, string> = { paid: 'مدفوعة', partial: 'مدفوعة جزئيًا', pending: 'غير مدفوعة', overdue: 'متأخرة', cancelled: 'ملغاة', draft: 'مسودة', approved: 'معتمد', completed: 'مكتمل', confirmed: 'مؤكد' };

interface Props { profile: CustomerProfileV19; customerName: string; customerPhone?: string | null; onPay: (invoiceId?: string) => void; onPrintStatement: () => void; forceOpen?: boolean }

export function CustomerPurchasesTab({ profile, customerName, customerPhone, onPay, onPrintStatement, forceOpen }: Props) {
  const [q, setQ] = useState(''); const [status, setStatus] = useState('all'); const [last3, setLast3] = useState(true);
  const [open, setOpen] = useState<string | null>(null); const [sel, setSel] = useState<Set<string>>(new Set());

  const docs = useMemo<Doc[]>(() => {
    const now = Date.now();
    const inv: Doc[] = profile.invoices.map((i) => {
      const rem = invoiceRemaining(i); const tot = Number(i.total_amount ?? 0);
      const st = i.status === 'cancelled' ? 'cancelled' : rem > 0 && overdueDays(i, now) > 0 && i.due_date ? 'overdue' : (i.payment_status ?? 'pending');
      return { key: `i-${i.id}`, kind: 'invoice', id: i.id, number: i.invoice_number, date: i.created_at, total: tot, remaining: rem, status: st, paidPct: tot > 0 ? Math.round(((tot - rem) / tot) * 100) : null };
    });
    const ret: Doc[] = profile.creditNotes.map((c) => ({ key: `r-${c.id}`, kind: 'return', id: c.id, number: c.credit_note_number, date: c.created_at, total: Number(c.amount), remaining: 0, status: c.status ?? 'draft', paidPct: null }));
    const ord: Doc[] = profile.salesOrders.map((o) => ({ key: `o-${o.id}`, kind: 'order', id: o.id, number: o.order_number, date: o.created_at, total: Number(o.total_amount), remaining: 0, status: o.status, paidPct: null }));
    return [...inv, ...ret, ...ord].sort((a, b) => b.date.localeCompare(a.date));
  }, [profile.invoices, profile.creditNotes, profile.salesOrders]);

  const cutoff = Date.now() - 92 * 86400000;
  const shown = docs.filter((d) => (!last3 || new Date(d.date).getTime() >= cutoff)
    && (status === 'all' || d.status === status)
    && (!q.trim() || d.number.toLowerCase().includes(q.trim().toLowerCase())));

  const invIds = shown.filter((d) => d.kind === 'invoice').map((d) => d.id);
  const { data: counts = {} } = useQuery({ queryKey: ['invoice-item-counts', invIds], queryFn: () => customerProfileRepository.invoiceItemCounts(invIds), enabled: invIds.length > 0 });
  const selRemaining = Math.round(shown.filter((d) => sel.has(d.id)).reduce((s, d) => s + d.remaining, 0) * 100) / 100;
  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 no-print">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute end-auto start-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث في المشتريات..." className="ps-8" aria-label="بحث في المشتريات" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40" aria-label="الحالة"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {['paid', 'partial', 'pending', 'overdue', 'cancelled'].map((s) => <SelectItem key={s} value={s}>{STATUS_AR[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{last3 ? 'يعرض آخر 3 شهور' : 'يعرض كل الفترات'} · {shown.length} من {docs.length} مستند</span>
        {last3 ? (
          <Badge variant="secondary" className="gap-1">الفترة: آخر 3 شهور (افتراضي)
            <button type="button" onClick={() => setLast3(false)} aria-label="إزالة فلتر الفترة"><X className="h-3 w-3" /></button></Badge>
        ) : <Button size="sm" variant="ghost" onClick={() => setLast3(true)}>آخر 3 شهور</Button>}
      </div>

      {sel.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2 text-sm no-print">
          <span>تم تحديد {sel.size} فاتورة · إجمالي المتبقي {formatEGP(selRemaining)}</span>
          <Button size="sm" onClick={() => onPay()}><Wallet className="h-4 w-4" />تسجيل دفعة واحدة للمحدد</Button>
          <Button size="sm" variant="outline" onClick={onPrintStatement}><Printer className="h-4 w-4" />طباعة كشف</Button>
          <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>إلغاء التحديد</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border" data-h-scroll>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="w-10 p-2 no-print"><span className="sr-only">تحديد</span></th>
              <th className="p-2 text-start">رقم المستند</th><th className="p-2 text-start">النوع</th><th className="p-2 text-start">التاريخ</th>
              <th className="p-2 text-start">الأصناف</th><th className="p-2 text-start">الإجمالي</th><th className="p-2 text-start">المتبقي</th><th className="p-2 text-start">الحالة</th>
              <th className="w-8 no-print" />
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">{docs.length ? 'لا توجد مستندات مطابقة للفلاتر' : 'لا توجد مشتريات لهذا العميل'}</td></tr>}
            {shown.map((d) => {
              const isOpen = d.kind === 'invoice' && (open === d.id || !!forceOpen);
              const inv = d.kind === 'invoice' ? profile.invoices.find((i) => i.id === d.id) : undefined;
              return (
                <Fragment key={d.key}>
                  <tr className="border-t hover:bg-muted/30">
                    <td className="p-2 no-print">{d.kind === 'invoice' && <Checkbox checked={sel.has(d.id)} onCheckedChange={() => toggleSel(d.id)} aria-label={`تحديد ${d.number}`} />}</td>
                    <td className="p-2 font-medium">
                      {d.kind === 'invoice' ? (
                        <button type="button" className="inline-flex items-center gap-1 text-primary" onClick={() => setOpen(open === d.id ? null : d.id)} aria-expanded={isOpen}>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}{d.number}
                        </button>
                      ) : d.number}
                    </td>
                    <td className="p-2">{KIND_AR[d.kind]}</td>
                    <td className="p-2">{fmtDate(d.date)}</td>
                    <td className="p-2">{d.kind === 'invoice' ? (counts[d.id] ?? '—') : '—'}</td>
                    <td className="p-2">{formatEGP(d.kind === 'return' ? -d.total : d.total)}</td>
                    <td className="p-2">{d.kind === 'invoice' ? formatEGP(d.remaining) : '—'}</td>
                    <td className="p-2">
                      <Badge variant={d.status === 'overdue' ? 'destructive' : d.status === 'paid' ? 'default' : 'secondary'}>{STATUS_AR[d.status] ?? d.status}</Badge>
                      {d.paidPct !== null && d.status !== 'paid' && <span className="ms-1 text-xs text-muted-foreground">{d.paidPct}%</span>}
                    </td>
                    <td className="no-print" />
                  </tr>
                  {isOpen && inv && (
                    <tr><td colSpan={9} className="bg-muted/20 p-0">
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
    </div>
  );
}
