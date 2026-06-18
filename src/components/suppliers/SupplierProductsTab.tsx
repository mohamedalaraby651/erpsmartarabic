import { useQuery } from "@tanstack/react-query";
import { supplierQueryService } from "@/lib/queries/supplierQueryService";
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
    queryFn: () => supplierQueryService.listAggregatedProducts(supplierId),
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
