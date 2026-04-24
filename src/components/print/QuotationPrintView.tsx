import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PrintTemplate } from "./PrintTemplate";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { generateDocumentPDF } from "@/lib/pdfGeneratorLazy";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuotationPrintViewProps {
  quotationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuotationPrintView({ quotationId, open, onOpenChange }: QuotationPrintViewProps) {
  const [downloading, setDownloading] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: quotation } = useQuery({
    queryKey: ["quotation-print", quotationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotations").select(`*, customers (name, phone, email)`).eq("id", quotationId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!quotationId && open,
  });

  const { data: items } = useQuery({
    queryKey: ["quotation-items-print", quotationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotation_items").select(`*, products (name)`).eq("quotation_id", quotationId);
      if (error) throw error;
      return data;
    },
    enabled: !!quotationId && open,
  });

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!quotation || !items) return;
    setDownloading(true);
    try {
      await generateDocumentPDF('quotation', { ...quotation, items });
      toast.success("تم تحميل ملف PDF بنجاح");
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error("فشل في إنشاء ملف PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (!quotation || !items) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center justify-between">
            <span>معاينة عرض السعر</span>
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
          documentTitle="عرض سعر"
          documentNumber={quotation.quotation_number}
          documentDate={quotation.created_at}
          dueDate={quotation.valid_until || undefined}
          customerName={quotation.customers?.name}
          customerPhone={quotation.customers?.phone || undefined}
          items={items.map((item) => ({
            name: item.products?.name || "منتج",
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            discount: item.discount_percentage || 0,
            total: Number(item.total_price),
          }))}
          subtotal={Number(quotation.subtotal)}
          discount={quotation.discount_amount ? Number(quotation.discount_amount) : undefined}
          tax={quotation.tax_amount ? Number(quotation.tax_amount) : undefined}
          total={Number(quotation.total_amount)}
          notes={quotation.notes || undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
