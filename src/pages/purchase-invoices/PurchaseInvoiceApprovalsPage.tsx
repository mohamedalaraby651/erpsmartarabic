import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { usePurchaseInvoicesList } from "@/hooks/logistics/usePurchaseInvoices";
import { MatchingStatusBadge } from "@/components/logistics/StatusBadges";

export default function PurchaseInvoiceApprovalsPage() {
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = usePurchaseInvoicesList("");
  const pending = rows.filter((r) => r.approval_required && r.status === "posted");

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-warning" />
          فواتير مشتريات تتطلب موافقة
        </h1>
        <Button variant="outline" onClick={() => navigate("/purchase-invoices")}>
          <ArrowLeft className="h-4 w-4 ml-1" /> كل الفواتير
        </Button>
      </div>

      <Card className="p-4 bg-warning/5 border-warning/30 text-sm">
        تظهر الفواتير هنا عند تجاوز الكمية المطلوبة في أمر الشراء، أو عند غياب إيصال استلام للبضاعة.
        راجع البنود واتخذ الإجراء المناسب.
      </Card>

      <Card className="p-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جارٍ التحميل…</div>
        ) : pending.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            ✓ لا توجد فواتير معلّقة. كل المشتريات مطابِقة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b">
                <tr className="text-right">
                  <th className="p-2">الرقم</th>
                  <th className="p-2">المورد</th>
                  <th className="p-2">الإجمالي</th>
                  <th className="p-2">المطابقة</th>
                  <th className="p-2">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-2 font-mono">{r.invoice_number}</td>
                    <td className="p-2">{r.suppliers?.name ?? "—"}</td>
                    <td className="p-2 font-semibold">{Number(r.total_amount).toLocaleString()}</td>
                    <td className="p-2"><MatchingStatusBadge status={r.matching_status} /></td>
                    <td className="p-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/purchase-invoices/${r.id}`)}>
                        مراجعة
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
