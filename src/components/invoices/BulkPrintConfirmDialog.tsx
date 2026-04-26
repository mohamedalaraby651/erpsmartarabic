import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, Download, Receipt, Eye, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { logErrorSafely } from "@/lib/errorHandler";
import type { InvoiceWithCustomer } from "@/hooks/invoices/useInvoicesList";

interface BulkPrintConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: InvoiceWithCustomer[];
  /**
   * Some IDs may be selected but not loaded into the visible list (e.g. when
   * "select all filtered" was used). The dialog still needs the full ID list
   * to build the PDF.
   */
  selectedIds: string[];
  onDownloaded?: () => void;
}

/**
 * Pre-flight preview dialog for bulk-printing invoices to PDF.
 *
 * Flow:
 *  1. Dialog opens → builds the PDF in memory (jsPDF) and renders it in an
 *     iframe via blob URL — the user sees the actual pages BEFORE downloading.
 *  2. The header shows the real, document-reported page count.
 *  3. "Download" calls jsPDF.save() on the already-built doc (instant, no rebuild).
 */
export function BulkPrintConfirmDialog({
  open,
  onOpenChange,
  invoices,
  selectedIds,
  onDownloaded,
}: BulkPrintConfirmDialogProps) {
  const [building, setBuilding] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [fileName, setFileName] = useState<string>("");
  const [docHandle, setDocHandle] =
    useState<import("jspdf").jsPDF | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = invoices.reduce(
    (sum, inv) => sum + Number(inv.total_amount || 0),
    0
  );

  // Build the PDF whenever the dialog opens with a non-empty selection.
  useEffect(() => {
    if (!open || selectedIds.length === 0) return;
    let cancelled = false;
    let createdUrl: string | null = null;

    (async () => {
      setBuilding(true);
      setError(null);
      setPreviewUrl(null);
      setDocHandle(null);
      try {
        const { buildBulkInvoicesPDF } = await import("@/lib/bulkInvoicePdfGenerator");
        const { doc, pageCount, fileName } = await buildBulkInvoicesPDF(selectedIds);
        if (cancelled) return;
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        createdUrl = url;
        setDocHandle(doc);
        setPreviewUrl(url);
        setPageCount(pageCount);
        setFileName(fileName);
      } catch (e) {
        logErrorSafely("BulkPrintConfirmDialog.build", e);
        if (!cancelled) setError("تعذّر توليد المعاينة");
      } finally {
        if (!cancelled) setBuilding(false);
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [open, selectedIds]);

  // Cleanup blob URL when dialog closes.
  useEffect(() => {
    if (!open && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setDocHandle(null);
      setPageCount(0);
    }
  }, [open, previewUrl]);

  const handleDownload = () => {
    if (!docHandle) return;
    docHandle.save(fileName);
    onDownloaded?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !building && onOpenChange(o)}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            معاينة الطباعة الدفعية قبل التنزيل
          </DialogTitle>
          <DialogDescription>
            سيتم إنشاء ملف PDF واحد يحتوي على كل الفواتير المحددة (فاتورة لكل صفحة).
          </DialogDescription>
        </DialogHeader>

        {/* Summary chips — show real page count from jsPDF after build */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-primary/5 p-3 text-center">
            <p className="text-xs text-muted-foreground">عدد الفواتير</p>
            <p className="text-2xl font-bold text-primary">{selectedIds.length}</p>
          </div>
          <div className="rounded-lg border bg-info/5 p-3 text-center">
            <p className="text-xs text-muted-foreground">عدد الصفحات الفعلي</p>
            <p className="text-2xl font-bold text-info">
              {building ? <Loader2 className="h-5 w-5 animate-spin inline" /> : pageCount || selectedIds.length}
            </p>
          </div>
          <div className="rounded-lg border bg-success/5 p-3 text-center">
            <p className="text-xs text-muted-foreground">القيمة الإجمالية</p>
            <p className="text-base font-bold text-success">
              {totalAmount.toLocaleString()} ج.م
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center flex items-center justify-center">
            <p className="text-xs text-muted-foreground truncate" title={fileName}>
              {fileName || "—"}
            </p>
          </div>
        </div>

        {/* Side-by-side: list + live PDF preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-0">
          {/* Invoice list */}
          <div className="rounded-lg border md:col-span-1 flex flex-col min-h-0">
            <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              الفواتير المحددة
            </div>
            <ScrollArea className="flex-1 min-h-[200px]">
              <ul className="divide-y">
                {invoices.length === 0 && selectedIds.length > 0 && (
                  <li className="p-3 text-xs text-muted-foreground text-center">
                    {selectedIds.length} فاتورة محددة (غير مرئية في الصفحة الحالية)
                  </li>
                )}
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
                    <span className="shrink-0 font-bold text-xs">
                      {Number(inv.total_amount).toLocaleString()} ج.م
                    </span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>

          {/* PDF preview */}
          <div className="rounded-lg border md:col-span-2 flex flex-col min-h-[400px] bg-muted/20">
            <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              معاينة المستند
            </div>
            <div className="flex-1 min-h-0 relative">
              {building && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm">جاري إنشاء المعاينة...</p>
                </div>
              )}
              {!building && error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-destructive p-4">
                  <AlertCircle className="h-8 w-8" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
              {!building && !error && previewUrl && (
                <iframe
                  src={previewUrl}
                  title="معاينة PDF"
                  className="absolute inset-0 w-full h-full"
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={building}
          >
            إغلاق
          </Button>
          <Button
            onClick={handleDownload}
            disabled={building || !docHandle || !!error}
          >
            <Download className="h-4 w-4 ml-2" />
            تنزيل PDF ({pageCount || selectedIds.length} صفحة)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
