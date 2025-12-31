import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

interface SupplierProductsTabProps {
  supplierId: string;
}

const SupplierProductsTab = ({ supplierId }: SupplierProductsTabProps) => {
  const { data: productStats, isLoading } = useQuery({
    queryKey: ['supplier-products', supplierId],
    queryFn: async () => {
      // Get all purchase order items for this supplier's orders
      const { data: orders, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('id')
        .eq('supplier_id', supplierId);
      
      if (ordersError) throw ordersError;
      
      if (!orders || orders.length === 0) return [];
      
      const orderIds = orders.map(o => o.id);
      
      const { data: items, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select(`
          product_id,
          quantity,
          unit_price,
          total_price,
          products (
            id,
            name,
            sku,
            image_url
          )
        `)
        .in('order_id', orderIds);
      
      if (itemsError) throw itemsError;
      
      // Aggregate by product
      const productMap = new Map<string, {
        product: any;
        totalQuantity: number;
        totalValue: number;
        averagePrice: number;
        orderCount: number;
      }>();
      
      items?.forEach(item => {
        const productId = item.product_id;
        const existing = productMap.get(productId);
        
        if (existing) {
          existing.totalQuantity += item.quantity;
          existing.totalValue += Number(item.total_price);
          existing.orderCount += 1;
          existing.averagePrice = existing.totalValue / existing.totalQuantity;
        } else {
          productMap.set(productId, {
            product: item.products,
            totalQuantity: item.quantity,
            totalValue: Number(item.total_price),
            averagePrice: Number(item.unit_price),
            orderCount: 1,
          });
        }
      });
      
      return Array.from(productMap.values()).sort((a, b) => b.totalValue - a.totalValue);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">المنتجات المرتبطة</CardTitle>
        <p className="text-sm text-muted-foreground">
          المنتجات التي تم شراؤها من هذا المورد
        </p>
      </CardHeader>
      <CardContent>
        {productStats && productStats.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المنتج</TableHead>
                <TableHead>الكود</TableHead>
                <TableHead>إجمالي الكمية</TableHead>
                <TableHead>متوسط السعر</TableHead>
                <TableHead>إجمالي القيمة</TableHead>
                <TableHead>عدد الطلبات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productStats.map((stat, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {stat.product?.name || 'منتج غير معروف'}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {stat.product?.sku || '-'}
                  </TableCell>
                  <TableCell>{stat.totalQuantity.toLocaleString()}</TableCell>
                  <TableCell>{stat.averagePrice.toLocaleString()} ج.م</TableCell>
                  <TableCell className="font-bold text-primary">
                    {stat.totalValue.toLocaleString()} ج.م
                  </TableCell>
                  <TableCell>{stat.orderCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد منتجات مرتبطة بهذا المورد</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SupplierProductsTab;
