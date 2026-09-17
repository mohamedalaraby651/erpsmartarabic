import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Printer, ExternalLink, CalendarDays, UserRound, PencilLine } from "lucide-react";
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
  const issueDate = new Date(invoice.created_at).toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-border/60 px-5 py-5 pe-14 text-start sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-xl">نظرة سريعة على الفاتورة</DialogTitle>
              <DialogDescription className="mt-1 font-medium tabular-nums">
                الرقم المرجعي: <span dir="ltr">{invoice.invoice_number}</span>
              </DialogDescription>
            </div>
            <Badge className={paymentStatusColors[invoice.payment_status]}>
              {paymentStatusLabels[invoice.payment_status]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex min-h-20 items-center gap-3 rounded-lg border border-border/60 bg-muted/35 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-sm">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-muted-foreground">تاريخ الإصدار</p>
                <p className="mt-1 text-sm font-semibold">{issueDate}</p>
              </div>
            </div>
            <div className="flex min-h-20 items-center gap-3 rounded-lg border border-border/60 bg-muted/35 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-sm">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">العميل</p>
                <p className="mt-1 truncate text-sm font-semibold">{invoice.customers?.name || 'بدون عميل'}</p>
              </div>
            </div>
          </div>

          <section aria-labelledby="invoice-financial-summary">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 id="invoice-financial-summary" className="text-sm font-semibold">الملخص المالي</h3>
              <span className="text-xs text-muted-foreground">
                حالة الاعتماد: {approvalStatusLabels[invoice.approval_status || 'draft']}
              </span>
            </div>
            <dl className="grid overflow-hidden rounded-lg border border-border/60 sm:grid-cols-3">
              <div className="border-b border-border/60 px-4 py-4 sm:border-b-0 sm:border-l">
                <dt className="text-xs text-muted-foreground">الإجمالي</dt>
                <dd className="mt-1 text-lg font-bold tabular-nums">{total.toLocaleString()} ج.م</dd>
              </div>
              <div className="border-b border-border/60 px-4 py-4 sm:border-b-0 sm:border-l">
                <dt className="text-xs text-muted-foreground">المدفوع</dt>
                <dd className="mt-1 text-lg font-bold tabular-nums text-success">{paid.toLocaleString()} ج.م</dd>
              </div>
              <div className="bg-primary/5 px-4 py-4">
                <dt className="text-xs text-muted-foreground">المتبقي</dt>
                <dd className={`mt-1 text-xl font-bold tabular-nums ${remaining > 0 ? 'text-destructive' : 'text-success'}`}>
                  {remaining.toLocaleString()} ج.م
                </dd>
              </div>
            </dl>
          </section>

          <div className="flex items-start gap-3 border-t border-border/60 pt-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PencilLine className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">البنود والكميات والأسعار</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                تُعرض وتُعدّل من صفحة الفاتورة الكاملة لضمان إعادة حساب الإجماليات والتحقق من الصلاحيات.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
          {invoice.payment_status !== 'paid' && (
            <Button className="min-h-11 sm:ms-auto" onClick={() => onRecordPayment(invoice)}>
              <CreditCard className="h-4 w-4 ml-2" />تسجيل دفعة
            </Button>
          )}
          <Button variant="outline" className="min-h-11" onClick={() => onPrint(invoice.id)}>
            <Printer className="h-4 w-4 ml-2" />طباعة الفاتورة
          </Button>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenFull(invoice.id)}>
            <ExternalLink className="h-4 w-4 ml-2" />عرض وتعديل التفاصيل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
