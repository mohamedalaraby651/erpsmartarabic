import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, ShoppingCart, Receipt, Truck } from "lucide-react";
import {
  useConvertOrderToInvoice,
  useConvertInvoiceToDelivery,
} from "@/hooks/sales-cycle/useQuotes";
import { useNavigate } from "react-router-dom";

export default function SalesPipelinePage() {
  const navigate = useNavigate();
  const convertOI = useConvertOrderToInvoice();
  const convertID = useConvertInvoiceToDelivery();

  const [tab, setTab] = useState<"orders" | "invoices">("orders");

  const orders = useQuery({
    queryKey: ["pipeline-orders"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sales_orders")
        .select("id, order_number, total_amount, status, created_at, customers(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: tab === "orders",
  });

  const invoices = useQuery({
    queryKey: ["pipeline-invoices"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("invoices")
        .select("id, invoice_number, total_amount, status, payment_status, created_at, customers(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: tab === "invoices",
  });

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          مسار دورة المبيعات
        </h1>
        <p className="text-sm text-muted-foreground">
          تحويل سريع بين مراحل الدورة: عرض → أمر بيع → فاتورة → إذن تسليم
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card
          className="p-4 text-center cursor-pointer hover:border-primary"
          onClick={() => navigate("/quotes")}
        >
          <FileText className="h-6 w-6 mx-auto mb-2 text-info" />
          <div className="font-semibold">عروض الأسعار</div>
        </Card>
        <Card
          className={`p-4 text-center cursor-pointer hover:border-primary ${
            tab === "orders" ? "border-primary" : ""
          }`}
          onClick={() => setTab("orders")}
        >
          <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-warning" />
          <div className="font-semibold">أوامر البيع</div>
        </Card>
        <Card
          className={`p-4 text-center cursor-pointer hover:border-primary ${
            tab === "invoices" ? "border-primary" : ""
          }`}
          onClick={() => setTab("invoices")}
        >
          <Receipt className="h-6 w-6 mx-auto mb-2 text-destructive" />
          <div className="font-semibold">الفواتير</div>
        </Card>
        <Card
          className="p-4 text-center cursor-pointer hover:border-primary"
          onClick={() => navigate("/delivery-notes")}
        >
          <Truck className="h-6 w-6 mx-auto mb-2 text-success" />
          <div className="font-semibold">إذونات التسليم</div>
        </Card>
      </div>

      <Card className="p-4">
        {tab === "orders" ? (
          <>
            <h2 className="font-semibold mb-3">أوامر بيع جاهزة للتحويل لفاتورة</h2>
            {orders.isLoading ? (
              <div className="text-center py-6 text-muted-foreground">جارٍ التحميل…</div>
            ) : (orders.data ?? []).length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">لا توجد أوامر بيع.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground border-b">
                    <tr className="text-right">
                      <th className="p-2">الرقم</th>
                      <th className="p-2">العميل</th>
                      <th className="p-2">الإجمالي</th>
                      <th className="p-2">الحالة</th>
                      <th className="p-2">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(orders.data ?? []).map((o: any) => (
                      <tr key={o.id} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-mono">{o.order_number}</td>
                        <td className="p-2">{o.customers?.name ?? "—"}</td>
                        <td className="p-2 font-medium">{Number(o.total_amount).toFixed(2)}</td>
                        <td className="p-2">
                          <Badge variant="outline">{o.status}</Badge>
                        </td>
                        <td className="p-2">
                          {o.status !== "invoiced" && o.status !== "cancelled" && (
                            <Button
                              size="sm"
                              onClick={() => convertOI.mutate(o.id)}
                              disabled={convertOI.isPending}
                            >
                              <ArrowLeft className="h-4 w-4 ml-1" /> تحويل لفاتورة
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="font-semibold mb-3">فواتير جاهزة لإصدار إذن تسليم</h2>
            {invoices.isLoading ? (
              <div className="text-center py-6 text-muted-foreground">جارٍ التحميل…</div>
            ) : (invoices.data ?? []).length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">لا توجد فواتير.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground border-b">
                    <tr className="text-right">
                      <th className="p-2">الرقم</th>
                      <th className="p-2">العميل</th>
                      <th className="p-2">الإجمالي</th>
                      <th className="p-2">الحالة</th>
                      <th className="p-2">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoices.data ?? []).map((i: any) => (
                      <tr key={i.id} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-mono">{i.invoice_number}</td>
                        <td className="p-2">{i.customers?.name ?? "—"}</td>
                        <td className="p-2 font-medium">{Number(i.total_amount).toFixed(2)}</td>
                        <td className="p-2">
                          <Badge variant="outline">{i.payment_status}</Badge>
                        </td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            onClick={() => convertID.mutate({ invoiceId: i.id })}
                            disabled={convertID.isPending}
                          >
                            <ArrowLeft className="h-4 w-4 ml-1" /> إنشاء إذن تسليم
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
