import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Printer, ExternalLink } from "lucide-react";
import type { InvoiceWithCustomer } from "@/hooks/invoices/useInvoicesList";

interface InvoiceQuickViewProps {
  invoice: InvoiceWithCustomer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFull: (id: string) => void;
  onPrint: (id: string) => void;
  onRecordPayment: (invoice: InvoiceWithCustomer) => void;
  paymentStatusLabels: Record<string, string>;
  paymentStatusColors: Record<string, string>;
  approvalStatusLabels: Record<string, string>;
}

/**
 * Read-only quick look at an invoice row.
 * Uses data already present in the list — it issues no extra queries and
 * performs no financial mutation; writes go through the existing dialogs.
 */
export const InvoiceQuickView = ({
  invoice,
  open,
  onOpenChange,
  onOpenFull,
  onPrint,
  onRecordPayment,
  paymentStatusLabels,
  paymentStatusColors,
  approvalStatusLabels,
}: InvoiceQuickViewProps) => {
  if (!invoice) return null;

  const total = Number(invoice.total_amount || 0);
  const paid = Number(invoice.paid_amount || 0);
  const remaining = total - paid;
  const rows: { label: string; value: string; className?: string }[] = [
    { label: 'العميل', value: invoice.customers?.name || 'بدون عميل' },
    { label: 'التاريخ', value: new Date(invoice.created_at).toLocaleDateString('ar-EG') },
    { label: 'الإجمالي', value: `${total.toLocaleString()} ج.م`, className: 'font-bold' },
    { label: 'المدفوع', value: `${paid.toLocaleString()} ج.م`, className: 'text-success' },
    { label: 'المتبقي', value: `${remaining.toLocaleString()} ج.م`, className: remaining > 0 ? 'text-destructive' : '' },
    { label: 'حالة الاعتماد', value: approvalStatusLabels[invoice.approval_status || 'draft'] },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md">
        <SheetHeader className="text-start">
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {invoice.invoice_number}
            <Badge className={paymentStatusColors[invoice.payment_status]}>
              {paymentStatusLabels[invoice.payment_status]}
            </Badge>
          </SheetTitle>
          <SheetDescription>نظرة سريعة على الفاتورة دون مغادرة القائمة.</SheetDescription>
        </SheetHeader>

        <dl className="mt-4 divide-y divide-border/60 rounded-lg border border-border/60">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 px-3 py-2.5">
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className={`text-sm tabular-nums ${row.className ?? ''}`}>{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-col gap-2">
          {invoice.payment_status !== 'paid' && (
            <Button className="min-h-11 justify-start" onClick={() => onRecordPayment(invoice)}>
              <CreditCard className="h-4 w-4 ml-2" />تسجيل دفعة
            </Button>
          )}
          <Button variant="outline" className="min-h-11 justify-start" onClick={() => onPrint(invoice.id)}>
            <Printer className="h-4 w-4 ml-2" />طباعة الفاتورة
          </Button>
          <Button variant="outline" className="min-h-11 justify-start" onClick={() => onOpenFull(invoice.id)}>
            <ExternalLink className="h-4 w-4 ml-2" />فتح الصفحة الكاملة
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
