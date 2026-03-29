import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import { EntityLink } from "@/components/shared/EntityLink";

interface SalesOrder {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  total_amount: number;
}

export const CustomerTabOrders = memo(function CustomerTabOrders({ salesOrders }: { salesOrders: SalesOrder[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>أوامر البيع</CardTitle><CardDescription>سجل أوامر البيع للعميل</CardDescription></CardHeader>
      <CardContent>
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
