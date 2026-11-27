import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router-compat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Printer, Pencil, Undo2, MessageCircle, FileDown } from "lucide-react";
import { formatEGP } from "@/lib/format/money";
import { invoiceRemaining } from "@/lib/customers/profileMetrics";
import { customerProfileRepository } from "@/lib/repositories/customerProfileRepository";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import type { Database } from "@/integrations/supabase/types";
import { PAYMENT_METHOD_AR, fmtDate } from "./methods";
import { openWhatsApp } from "./CustomerSummaryBanner";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];
type CreditNote = Database['public']['Tables']['credit_notes']['Row'];

interface Props { invoice: Invoice; customerName: string; customerPhone?: string | null; payments: Payment[]; returns: CreditNote[]; onPay: () => void }

export function ExpandableInvoiceRow({ invoice, customerName, customerPhone, payments, returns, onPay }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('items');
  const { data: lines = [], isLoading } = useQuery({ queryKey: ['invoice-lines', invoice.id], queryFn: () => customerProfileRepository.invoiceLines(invoice.id) });
  const { data: warehouse } = useQuery({ queryKey: ['warehouse-name', invoice.warehouse_id], queryFn: () => customerProfileRepository.warehouseName(invoice.warehouse_id!), enabled: !!invoice.warehouse_id });
  const remaining = invoiceRemaining(invoice);
  const paid = Math.round((Number(invoice.total_amount) - remaining) * 100) / 100;
  const days = invoice.due_date ? Math.round((new Date(invoice.due_date).getTime() - new Date(invoice.created_at).getTime()) / 86400000) : null;
  const openInvoice = () => navigate(`/invoices/${invoice.id}`);

  return (
    <div className="space-y-3 p-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0 space-y-3">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="items">الأصناف ({lines.length})</TabsTrigger>
              <TabsTrigger value="payments">المدفوعات ({payments.length})</TabsTrigger>
              <TabsTrigger value="returns">المرتجعات ({returns.length})</TabsTrigger>
              <TabsTrigger value="notes">الملاحظات ({invoice.notes ? 1 : 0})</TabsTrigger>
              <TabsTrigger value="attachments">المرفقات</TabsTrigger>
            </TabsList>
            <TabsContent value="items">
              {isLoading ? <p className="p-3 text-xs text-muted-foreground">جارٍ التحميل…</p> : lines.length === 0 ? <p className="p-3 text-xs text-muted-foreground">لا توجد أصناف</p> : (
                <table className="w-full text-sm"><thead className="text-xs text-muted-foreground"><tr>
                  <th className="p-1.5 text-start">الصنف</th><th className="p-1.5 text-start">الكمية</th><th className="p-1.5 text-start">سعر الوحدة</th><th className="p-1.5 text-start">الخصم</th><th className="p-1.5 text-start">الإجمالي</th>
                </tr></thead><tbody>
                  {lines.map((l) => <tr key={l.id} className="border-t"><td className="p-1.5">{l.product_name}</td><td className="p-1.5">{l.quantity}</td><td className="p-1.5">{formatEGP(l.unit_price)}</td><td className="p-1.5">{l.discount_percentage ? `${l.discount_percentage}%` : '—'}</td><td className="p-1.5 font-medium">{formatEGP(l.total_price)}</td></tr>)}
                </tbody></table>
              )}
            </TabsContent>
            <TabsContent value="payments">
              {payments.length === 0 ? <p className="p-3 text-xs text-muted-foreground">لا توجد مدفوعات على هذه الفاتورة</p> : (
                <ul className="divide-y text-sm">{payments.map((p) => <li key={p.id} className="flex justify-between p-1.5"><span>{p.payment_number} · {fmtDate(p.payment_date)} · {PAYMENT_METHOD_AR[p.payment_method] ?? p.payment_method}</span><b>{formatEGP(Number(p.amount))}</b></li>)}</ul>
              )}
            </TabsContent>
            <TabsContent value="returns">
              {returns.length === 0 ? <p className="p-3 text-xs text-muted-foreground">لا توجد مرتجعات</p> : (
                <ul className="divide-y text-sm">{returns.map((r) => <li key={r.id} className="flex justify-between p-1.5"><span>{r.credit_note_number} · {fmtDate(r.created_at)}{r.reason ? ` · ${r.reason}` : ''}</span><b>{formatEGP(Number(r.amount))}</b></li>)}</ul>
              )}
            </TabsContent>
            <TabsContent value="notes"><p className="p-3 text-sm">{invoice.notes || 'لا توجد ملاحظات'}</p></TabsContent>
            <TabsContent value="attachments"><AttachmentsList entityType="invoice" entityId={invoice.id} /></TabsContent>
          </Tabs>

          <section className="rounded-lg border bg-card p-3 print-card">
            <h4 className="mb-2 font-semibold">بيانات الفاتورة</h4>
            <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
              {[['رقم الفاتورة', invoice.invoice_number], ['التاريخ', fmtDate(invoice.created_at)], ['تاريخ الاستحقاق', fmtDate(invoice.due_date)],
                ['شروط الدفع', days !== null ? `${days} يوم` : '—'], ['المستودع', warehouse ?? '—'], ['الحالة', invoice.status]].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
              <div className="col-span-full"><dt className="text-xs text-muted-foreground">ملاحظات الفاتورة</dt><dd>{invoice.notes || '—'}</dd></div>
            </dl>
          </section>
        </div>

        <section className="h-fit rounded-lg border bg-card p-3 text-sm print-card">
          <h4 className="mb-2 font-semibold">ملخص المبالغ</h4>
          <dl className="space-y-1.5">
            <div className="flex justify-between"><dt>الإجمالي قبل الضريبة</dt><dd>{formatEGP(Number(invoice.subtotal))}</dd></div>
            {Number(invoice.discount_amount) > 0 && <div className="flex justify-between"><dt>الخصم</dt><dd>-{formatEGP(Number(invoice.discount_amount))}</dd></div>}
            <div className="flex justify-between"><dt>الضريبة</dt><dd>{formatEGP(Number(invoice.tax_amount ?? 0))}</dd></div>
            <div className="flex justify-between border-t pt-1.5 font-bold"><dt>الإجمالي</dt><dd>{formatEGP(Number(invoice.total_amount))}</dd></div>
            <div className="flex justify-between text-emerald-700"><dt>المدفوع ({payments.length})</dt><dd>{formatEGP(paid)}</dd></div>
            <div className="flex items-center justify-between font-bold text-destructive"><dt>المتبقي</dt>
              <dd className="flex items-center gap-1">{formatEGP(remaining)}{invoice.due_date && remaining > 0 && <Badge variant="outline">{fmtDate(invoice.due_date)}</Badge>}</dd></div>
          </dl>
        </section>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2 no-print">
        <span className="font-semibold">{invoice.invoice_number}</span>
        {remaining > 0 && <Button size="sm" onClick={onPay}><Wallet className="h-4 w-4" />تسجيل دفعة</Button>}
        <Button size="sm" variant="outline" onClick={openInvoice}><Printer className="h-4 w-4" />طباعة</Button>
        <Button size="sm" variant="outline" onClick={openInvoice}><Pencil className="h-4 w-4" />تعديل الفاتورة</Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/credit-notes', { state: { prefillInvoiceId: invoice.id } })}><Undo2 className="h-4 w-4" />مرتجع جزئي</Button>
        <Button size="sm" variant="outline" onClick={() => openWhatsApp(customerPhone, `السيد/ ${customerName}، فاتورة ${invoice.invoice_number} بقيمة ${formatEGP(Number(invoice.total_amount))}، المتبقي ${formatEGP(remaining)}.`)}><MessageCircle className="h-4 w-4" />إرسال للعميل (واتساب)</Button>
        <Button size="sm" variant="outline" onClick={openInvoice}><FileDown className="h-4 w-4" />PDF</Button>
      </div>
    </div>
  );
}
