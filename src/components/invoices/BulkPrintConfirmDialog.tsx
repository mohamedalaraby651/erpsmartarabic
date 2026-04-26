import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, Printer, Receipt } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { InvoiceWithCustomer } from "@/hooks/invoices/useInvoicesList";

interface BulkPrintConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: InvoiceWithCustomer[];
  onConfirm: () => void;
  isProcessing: boolean;
}

/**
 * Pre-flight confirmation dialog for bulk-printing invoices to PDF.
 * Shows the user exactly which invoices will be exported, the resulting page
 * count (1 invoice = 1 page), and the combined total amount before kicking
 * off the heavy PDF generation.
 */
export function BulkPrintConfirmDialog({
  open,
  onOpenChange,
  invoices,
  onConfirm,
  isProcessing,
}: BulkPrintConfirmDialogProps) {
  const count = invoices.length;
  const totalAmount = invoices.reduce(
    (sum, inv) => sum + Number(inv.total_amount || 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !isProcessing && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            معاينة الطباعة الدفعية
          </DialogTitle>
          <DialogDescription>
            راجع الفواتير المحددة قبل توليد ملف PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="rounded-lg border bg-primary/5 p-3 text-center">
            <p className="text-xs text-muted-foreground">عدد الفواتير</p>
            <p className="text-2xl font-bold text-primary">{count}</p>
          </div>
          <div className="rounded-lg border bg-info/5 p-3 text-center">
            <p className="text-xs text-muted-foreground">عدد الصفحات</p>
            <p className="text-2xl font-bold text-info">{count}</p>
          </div>
          <div className="rounded-lg border bg-success/5 p-3 text-center">
            <p className="text-xs text-muted-foreground">القيمة الإجمالية</p>
            <p className="text-base font-bold text-success">
              {totalAmount.toLocaleString()} ج.م
            </p>
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
            الفواتير المحددة
          </div>
          <ScrollArea className="h-[240px]">
            <ul className="divide-y">
              {invoices.map((inv, idx) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="shrink-0">
                      {idx + 1}
                    </Badge>
                    <Receipt className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {inv.customers?.name || "بدون عميل"}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 font-bold">
                    {Number(inv.total_amount).toLocaleString()} ج.م
                  </span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            إلغاء
          </Button>
          <Button onClick={onConfirm} disabled={isProcessing || count === 0}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري التوليد...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 ml-2" />
                تأكيد وتنزيل PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
