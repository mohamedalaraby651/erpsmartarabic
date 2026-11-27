import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router-compat";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Printer, Pencil, MessageCircle, FileText, Banknote, MoreHorizontal } from "lucide-react";
import { formatEGP } from "@/lib/format/money";
import { invoiceRemaining } from "@/lib/customers/profileMetrics";
import { customerProfileRepository } from "@/lib/repositories/customerProfileRepository";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import type { Database } from "@/integrations/supabase/types";
import { PAYMENT_METHOD_AR, fmtDate } from "./methods";
import { openWhatsApp } from "./CustomerSummaryBanner";
import { TintedIcon } from "./ui";
import { cn } from "@/lib/utils";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];
type CreditNote = Database['public']['Tables']['credit_notes']['Row'];
const STATUS_AR: Record<string, string> = { paid: 'مدفوعة', partial: 'سداد جزئي', pending: 'غير مدفوعة', overdue: 'متأخرة', cancelled: 'ملغاة', draft: 'مسودة', approved: 'معتمدة', posted: 'مرحّلة' };

interface Props { invoice: Invoice; customerName: string; customerPhone?: string | null; payments: Payment[]; returns: CreditNote[]; onPay: () => void }

export function ExpandableInvoiceRow({ invoice, customerName, customerPhone, payments, returns, onPay }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'items' | 'payments' | 'returns' | 'notes' | 'attachments'>('items');
  const { data: lines = [], isLoading } = useQuery({ queryKey: ['invoice-lines', invoice.id], queryFn: () => customerProfileRepository.invoiceLines(invoice.id) });
  const { data: warehouse } = useQuery({ queryKey: ['warehouse-name', invoice.warehouse_id], queryFn: () => customerProfileRepository.warehouseName(invoice.warehouse_id!), enabled: !!invoice.warehouse_id });
  const remaining = invoiceRemaining(invoice);
  const paid = Math.round((Number(invoice.total_amount) - remaining) * 100) / 100;
  const days = invoice.due_date ? Math.round((new Date(invoice.due_date).getTime() - new Date(invoice.created_at).getTime()) / 86400000) : null;
  const openInvoice = () => navigate(`/invoices/${invoice.id}`);
  const payStatus = remaining <= 0 ? 'paid' : paid > 0 ? 'partial' : (invoice.payment_status ?? 'pending');

  const tabs = [
    { id: 'items', label: `الأصناف (${lines.length})` }, { id: 'payments', label: `المدفوعات (${payments.length})` },
    { id: 'returns', label: `المرتجعات (${returns.length})` }, { id: 'notes', label: `الملاحظات (${invoice.notes ? 1 : 0})` },
    { id: 'attachments', label: 'المرفقات' },
  ] as const;
  const th = "p-2 text-start text-xs font-semibold text-muted-foreground";
  const btn = "inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs font-bold hover:bg-muted";

  return (
    <div className="space-y-3 bg-primary/[0.03] p-3">
      <div role="tablist" aria-label="تفاصيل الفاتورة" className="flex gap-5 border-b border-border px-2 no-print">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("-mb-px border-b-2 px-2 pb-2 text-[13px] font-semibold", tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-card">
        {tab === 'items' && (isLoading ? <p className="p-3 text-xs text-muted-foreground">جارٍ التحميل…</p> : lines.length === 0 ? <p className="p-3 text-xs text-muted-foreground">لا توجد أصناف</p> : (
          <table className="w-full text-[13px]"><thead className="border-b border-border"><tr>
            <th className={th}>الصنف</th><th className={th}>الكمية</th><th className={th}>سعر الوحدة</th><th className={th}>الخصم</th><th className={th}>الإجمالي</th>
          </tr></thead><tbody>
            {lines.map((l) => <tr key={l.id} className="border-b border-border last:border-0"><td className="p-2">{l.product_name}</td><td className="p-2">{l.quantity}</td><td className="p-2">{formatEGP(l.unit_price)}</td><td className="p-2">{l.discount_percentage ? `${l.discount_percentage}%` : '—'}</td><td className="p-2">{formatEGP(l.total_price)}</td></tr>)}
          </tbody></table>
        ))}
        {tab === 'payments' && (payments.length === 0 ? <p className="p-3 text-xs text-muted-foreground">لا توجد مدفوعات على هذه الفاتورة</p> : (
          <ul className="divide-y divide-border text-[13px]">{payments.map((p) => <li key={p.id} className="flex justify-between p-2"><span>{p.payment_number} · {fmtDate(p.payment_date)} · {PAYMENT_METHOD_AR[p.payment_method] ?? p.payment_method}</span><b className="text-success">{formatEGP(Number(p.amount))}</b></li>)}</ul>
        ))}
        {tab === 'returns' && (returns.length === 0 ? <p className="p-3 text-xs text-muted-foreground">لا توجد مرتجعات</p> : (
          <ul className="divide-y divide-border text-[13px]">{returns.map((r) => <li key={r.id} className="flex justify-between p-2"><span>{r.credit_note_number} · {fmtDate(r.created_at)}{r.reason ? ` · ${r.reason}` : ''}</span><b>{formatEGP(Number(r.amount))}</b></li>)}</ul>
        ))}
        {tab === 'notes' && <p className="p-3 text-[13px]">{invoice.notes || 'لا توجد ملاحظات'}</p>}
        {tab === 'attachments' && <div className="p-2"><AttachmentsList entityType="invoice" entityId={invoice.id} /></div>}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-border bg-card p-3 print-card">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-[15px] font-bold"><TintedIcon icon={FileText} tone="primary" />بيانات الفاتورة</h4>
            <button type="button" onClick={openInvoice} aria-label="تعديل الفاتورة" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted no-print"><Pencil className="h-3.5 w-3.5" /></button>
          </div>
          <dl className="grid grid-cols-2 text-[13px]">
            {[['رقم الفاتورة', invoice.invoice_number], ['التاريخ', fmtDate(invoice.created_at)], ['الاستحقاق', fmtDate(invoice.due_date)],
              ['طريقة الدفع', days !== null && days > 0 ? `آجل · ${days} يوم` : 'نقدي'], ['المخزن', warehouse ?? '—'], ['الحالة', STATUS_AR[payStatus] ?? payStatus]].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2 border-b border-border px-1 py-2.5 odd:me-4 [&:nth-last-child(-n+2)]:border-0">
                <dt className="text-muted-foreground">{k}</dt><dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 rounded-lg border border-border px-3 py-2 text-xs"><b className="text-primary">ملاحظات الفاتورة</b> <span className="ms-2">{invoice.notes || '—'}</span></p>
        </section>

        <section className="h-fit rounded-xl border border-border bg-card p-3 text-[13px] print-card">
          <h4 className="mb-2 flex items-center gap-2 text-[15px] font-bold"><TintedIcon icon={Banknote} tone="success" />ملخص المبالغ</h4>
          <dl className="space-y-2">
            <div className="flex justify-between"><dt className="text-muted-foreground">الإجمالي الفرعي</dt><dd className="font-bold">{formatEGP(Number(invoice.subtotal))}</dd></div>
            {Number(invoice.discount_amount) > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">الخصم</dt><dd className="font-bold">-{formatEGP(Number(invoice.discount_amount))}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted-foreground">ضريبة القيمة المضافة</dt><dd className="font-bold">{formatEGP(Number(invoice.tax_amount ?? 0))}</dd></div>
            <div className="flex justify-between text-base font-bold"><dt>الإجمالي</dt><dd>{formatEGP(Number(invoice.total_amount))}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">مدفوع ({payments.length} دفعات)</dt><dd className="font-bold text-success">{formatEGP(paid)}</dd></div>
            <div className="flex justify-between font-bold"><dt>المتبقي{invoice.due_date && remaining > 0 ? ` · يستحق ${fmtDate(invoice.due_date)}` : ''}</dt><dd className={remaining > 0 ? 'text-warning' : ''}>{formatEGP(remaining)}</dd></div>
          </dl>
        </section>
      </div>

      <div className="sticky bottom-2 z-10 rounded-xl border border-border bg-card p-2.5 shadow-md no-print">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">{invoice.invoice_number}</span>
          {remaining > 0 && <button type="button" onClick={onPay} className="h-8 rounded-full bg-success px-4 text-xs font-bold text-success-foreground hover:bg-success/90">تسجيل دفعة</button>}
          <button type="button" className={btn} onClick={openInvoice}><Printer className="h-3.5 w-3.5" />طباعة</button>
          <button type="button" className={btn} onClick={openInvoice}><Pencil className="h-3.5 w-3.5" />تعديل الفاتورة</button>
          <button type="button" className={btn} onClick={() => navigate('/credit-notes', { state: { prefillInvoiceId: invoice.id } })}>مرتجع جزئي</button>
          <button type="button" className={cn(btn, "border-2 border-success text-success hover:bg-success/10")}
            onClick={() => openWhatsApp(customerPhone, `السيد/ ${customerName}، فاتورة ${invoice.invoice_number} بقيمة ${formatEGP(Number(invoice.total_amount))}، المتبقي ${formatEGP(remaining)}.`)}>
            <MessageCircle className="h-3.5 w-3.5" />إرسال للعميل
          </button>
          <button type="button" className={btn} onClick={openInvoice}>PDF</button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button type="button" className={btn}>المزيد<MoreHorizontal className="h-3.5 w-3.5" /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openInvoice}>فتح الفاتورة</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(invoice.invoice_number)}>نسخ رقم الفاتورة</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">شريط إجراءات ثابت أثناء التمرير</p>
      </div>
    </div>
  );
}
