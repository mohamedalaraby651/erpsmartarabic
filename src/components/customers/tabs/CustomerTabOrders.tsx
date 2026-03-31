import React, { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, CheckCircle, Clock as ClockIcon } from "lucide-react";
import { EntityLink } from "@/components/shared/EntityLink";

interface SalesOrder {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  total_amount: number;
}

export const CustomerTabOrders = memo(function CustomerTabOrders({ salesOrders }: { salesOrders: SalesOrder[] }) {
  const summary = useMemo(() => {
    const total = salesOrders.length;
    const completed = salesOrders.filter(o => o.status === 'completed').length;
    const pending = salesOrders.filter(o => o.status === 'pending').length;
    const totalAmount = salesOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    return { total, completed, pending, totalAmount };
  }, [salesOrders]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>أوامر البيع</CardTitle>
        <CardDescription>سجل أوامر البيع للعميل</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Bar */}
        {salesOrders.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 rounded-lg bg-muted/50">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{summary.total}</p>
              <p className="text-[10px] text-muted-foreground">إجمالي الأوامر</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{summary.completed}</p>
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><CheckCircle className="h-3 w-3" />مكتملة</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{summary.pending}</p>
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><ClockIcon className="h-3 w-3" />معلقة</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{summary.totalAmount.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">إجمالي المبالغ (ج.م)</p>
            </div>
          </div>
        )}

        {salesOrders.length === 0 ? (
          <div className="text-center py-8"><ShoppingCart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد أوامر بيع</p></div>
        ) : (
          <div className="space-y-2">
            {salesOrders.slice(0, 50).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <EntityLink type="sales-order" id={order.id}>{order.order_number}</EntityLink>
                  <span className="text-muted-foreground mr-4 text-sm">{new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                    {order.status === 'completed' ? 'مكتمل' : order.status === 'pending' ? 'معلق' : order.status}
                  </Badge>
                  <span className="font-bold">{Number(order.total_amount).toLocaleString()} ج.م</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
