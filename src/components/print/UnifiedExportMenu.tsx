import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { logErrorSafely } from "@/lib/errorHandler";
import { generateDocumentPDF, generatePDF } from "@/lib/pdfGeneratorLazy";

/**
 * Unified Export & Print Menu
 * ----------------------------------------------------------------
 * One button that exposes (when applicable):
 *   - 🖨️  Direct print (browser native, uses RTL print template if rendered)
 *   - 📄 PDF (Arabic + RTL via jsPDF)
 *   - 📊 Excel (.xlsx)
 *   - 📋 CSV (UTF-8 BOM)
 *
 * Two modes:
 * 1) Document mode  → pass `documentType` + `documentData` (uses generateDocumentPDF)
 * 2) Report mode    → pass `reportTitle` + `rows` + `columns` (tabular data)
 */

export type DocumentType =
  | "invoice"
  | "quotation"
  | "sales_order"
  | "purchase_order"
  | "payment_receipt"
  | "expense_receipt"
  | "credit_note";

interface ColumnDef {
  key: string;
  label: string;
}

interface UnifiedExportMenuProps {
  // Document mode
  documentType?: DocumentType;
  documentData?: Record<string, unknown> & { items?: unknown[] };

  // Report / table mode
  reportTitle?: string;
  rows?: Record<string, unknown>[];
  columns?: ColumnDef[];
  orientation?: "portrait" | "landscape";

  // Direct print (renders an existing print dialog/template)
  onPrint?: () => void;

  // UI
  filename?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  align?: "start" | "end" | "center";
  disabled?: boolean;
}

export function UnifiedExportMenu({
  documentType,
  documentData,
  reportTitle,
  rows,
  columns,
  orientation = "landscape",
  onPrint,
  filename = "export",
  label = "تصدير وطباعة",
  variant = "outline",
  size = "default",
  align = "end",
  disabled,
}: UnifiedExportMenuProps) {
  const [busy, setBusy] = useState<string | null>(null);

  const isDocumentMode = !!documentType && !!documentData;
  const isReportMode = !!reportTitle && !!rows && !!columns;

  const safeFilename = filename.replace(/[^\p{L}\p{N}_\-]/gu, "_");
  const datedName = `${safeFilename}_${new Date().toISOString().split("T")[0]}`;

  const handlePdf = async () => {
    setBusy("pdf");
    try {
      if (isDocumentMode) {
        await generateDocumentPDF(documentType!, documentData as any);
      } else if (isReportMode) {
        await generatePDF({
          title: reportTitle!,
          data: rows!,
          columns: columns!,
          orientation,
        });
      } else {
        toast.error("لا توجد بيانات للتصدير");
        return;
      }
      toast.success("تم تحميل ملف PDF بنجاح");
    } catch (e) {
      logErrorSafely("UnifiedExportMenu.pdf", e);
      toast.error("فشل في إنشاء ملف PDF");
    } finally {
      setBusy(null);
    }
  };

  const buildExportData = () => {
    if (isReportMode) {
      const headers: Record<string, string> = {};
      columns!.forEach((c) => (headers[c.key] = c.label));
      return rows!.map((row) => {
        const out: Record<string, unknown> = {};
        columns!.forEach((c) => {
          const v = row[c.key];
          out[c.label] = v === null || v === undefined ? "" : v;
        });
        return out;
      });
    }
    // Document mode → flatten items into rows
    if (isDocumentMode && Array.isArray(documentData!.items)) {
      return (documentData!.items as any[]).map((it, i) => ({
        "#": i + 1,
        المنتج: it?.products?.name ?? it?.name ?? "-",
        الكمية: it?.quantity ?? "",
        "سعر الوحدة": it?.unit_price ?? "",
        الإجمالي: it?.total_price ?? it?.total ?? "",
      }));
    }
    return [];
  };

  const handleExcel = async () => {
    setBusy("xlsx");
    try {
      const data = buildExportData();
      if (!data.length) {
        toast.error("لا توجد بيانات للتصدير");
        return;
      }
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(data);
      ws["!cols"] = Object.keys(data[0]).map((k) => ({
        wch: Math.max(k.length, 15),
      }));
      // RTL workbook view
      if (!ws["!views"]) ws["!views"] = [{ RTL: true }];
      const wb = XLSX.utils.book_new();
      wb.Workbook = { Views: [{ RTL: true }] };
      XLSX.utils.book_append_sheet(wb, ws, "البيانات");
      XLSX.writeFile(wb, `${datedName}.xlsx`);
      toast.success("تم تصدير ملف Excel");
    } catch (e) {
      logErrorSafely("UnifiedExportMenu.xlsx", e);
      toast.error("فشل تصدير Excel");
    } finally {
      setBusy(null);
    }
  };

  const handleCsv = async () => {
    setBusy("csv");
    try {
      const data = buildExportData();
      if (!data.length) {
        toast.error("لا توجد بيانات للتصدير");
        return;
      }
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob(["\ufeff" + csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${datedName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تصدير ملف CSV");
    } catch (e) {
      logErrorSafely("UnifiedExportMenu.csv", e);
      toast.error("فشل تصدير CSV");
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const isBusy = busy !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled || isBusy}>
          {isBusy ? (
            <Loader2 className="h-4 w-4 animate-spin ml-2" />
          ) : (
            <Share2 className="h-4 w-4 ml-2" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[200px]">
        <DropdownMenuLabel>طباعة وتصدير</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handlePrint} disabled={isBusy}>
          <Printer className="h-4 w-4 ml-2" />
          طباعة مباشرة
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePdf} disabled={isBusy}>
          {busy === "pdf" ? (
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 ml-2" />
          )}
          تحميل PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExcel} disabled={isBusy}>
          {busy === "xlsx" ? (
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 ml-2" />
          )}
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCsv} disabled={isBusy}>
          {busy === "csv" ? (
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 ml-2" />
          )}
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
