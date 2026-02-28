import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PrintTemplate } from "./PrintTemplate";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { generateDocumentPDF } from "@/lib/pdfGenerator";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SalesOrderPrintViewProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SalesOrderPrintView({ orderId, open, onOpenChange }: SalesOrderPrintViewProps) {
  const [downloading, setDownloading] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: order } = useQuery({
    queryKey: ["sales-order-print", orderId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales_orders").select(`*, customers (name, phone, email)`).eq("id", orderId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && open,
  });

  const { data: items } = useQuery({
    queryKey: ["sales-order-items-print", orderId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales_order_items").select(`*, products (name)`).eq("order_id", orderId);
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && open,
  });

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!order || !items) return;
    setDownloading(true);
    try {
      await generateDocumentPDF('sales_order', { ...order, items });
      toast.success("تم تحميل ملف PDF بنجاح");
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error("فشل في إنشاء ملف PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (!order || !items) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center justify-between">
            <span>معاينة أمر البيع</span>
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
          documentTitle="أمر بيع"
          documentNumber={order.order_number}
          documentDate={order.created_at}
          dueDate={order.delivery_date || undefined}
          customerName={order.customers?.name}
          customerPhone={order.customers?.phone || undefined}
          customerAddress={order.delivery_address || undefined}
          items={items.map((item) => ({
            name: item.products?.name || "منتج",
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            discount: item.discount_percentage || 0,
            total: Number(item.total_price),
          }))}
          subtotal={Number(order.subtotal)}
          discount={order.discount_amount ? Number(order.discount_amount) : undefined}
          tax={order.tax_amount ? Number(order.tax_amount) : undefined}
          total={Number(order.total_amount)}
          notes={order.notes || undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
