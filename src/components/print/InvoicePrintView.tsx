import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PrintTemplate } from "./PrintTemplate";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { generateDocumentPDF } from "@/lib/pdfGeneratorLazy";
import { toast } from "sonner";
import { logErrorSafely } from "@/lib/errorHandler";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InvoicePrintViewProps {
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const paymentMethodLabels: Record<string, string> = {
  cash: "نقداً",
  bank_transfer: "تحويل بنكي",
  credit: "آجل",
  installment: "تقسيط",
  advance_payment: "دفعة مقدمة",
};

const paymentStatusLabels: Record<string, string> = {
  pending: "معلق",
  partial: "مدفوع جزئياً",
  paid: "مدفوع",
  overdue: "متأخر",
};

export function InvoicePrintView({ invoiceId, open, onOpenChange }: InvoicePrintViewProps) {
  const [downloading, setDownloading] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: invoice } = useQuery({
    queryKey: ["invoice-print", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`*, customers (name, phone, email)`)
        .eq("id", invoiceId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId && open,
  });

  const { data: items } = useQuery({
    queryKey: ["invoice-items-print", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_items")
        .select(`*, products (name)`)
        .eq("invoice_id", invoiceId);
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId && open,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoice || !items) return;
    setDownloading(true);
    try {
      await generateDocumentPDF('invoice', {
        ...invoice,
        items,
      });
      toast.success("تم تحميل ملف PDF بنجاح");
    } catch (error) {
      logErrorSafely('InvoicePrintView', error);
      toast.error("فشل في إنشاء ملف PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (!invoice || !items) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center justify-between">
            <span>معاينة الفاتورة</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadPDF} disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Download className="h-4 w-4 ml-2" />}
                تحميل PDF
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <PrintTemplate
          companyName={settings?.company_name || "شركتي"}
          companyAddress={settings?.address || undefined}
          companyPhone={settings?.phone || undefined}
          companyEmail={settings?.email || undefined}
          taxNumber={settings?.tax_number || undefined}
          logoUrl={settings?.logo_url || undefined}
          primaryColor={settings?.primary_color || undefined}
          secondaryColor={settings?.secondary_color || undefined}
          documentTitle="فاتورة"
          documentNumber={invoice.invoice_number}
          documentDate={invoice.created_at}
          dueDate={invoice.due_date || undefined}
          customerName={invoice.customers?.name}
          customerPhone={invoice.customers?.phone || undefined}
          items={items.map((item) => ({
            name: item.products?.name || "منتج",
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            discount: item.discount_percentage || 0,
            total: Number(item.total_price),
          }))}
          subtotal={Number(invoice.subtotal)}
          discount={invoice.discount_amount ? Number(invoice.discount_amount) : undefined}
          tax={invoice.tax_amount ? Number(invoice.tax_amount) : undefined}
          total={Number(invoice.total_amount)}
          notes={invoice.notes || undefined}
          paymentMethod={paymentMethodLabels[invoice.payment_method]}
          paymentStatus={paymentStatusLabels[invoice.payment_status]}
        />
      </DialogContent>
    </Dialog>
  );
}
