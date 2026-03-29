import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DataCard } from "@/components/mobile/DataCard";
import { EmptyState } from "@/components/shared/EmptyState";

interface LowStockItem {
  id: string;
  quantity: number;
  product: { id: string; name: string; min_stock: number | null } | null;
  warehouse: { id: string; name: string } | null;
}

interface InventoryAlertsTabProps {
  items: LowStockItem[];
}

export function InventoryAlertsTab({ items }: InventoryAlertsTabProps) {
  const isMobile = useIsMobile();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          تنبيهات نقص المخزون
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="لا توجد تنبيهات" description="جميع المنتجات في مستوى آمن" />
        ) : isMobile ? (
          <div className="space-y-3">
            {items.map((item) => (
              <DataCard
                key={item.id}
                title={item.product?.name || "منتج غير معروف"}
                subtitle={item.warehouse?.name || "مستودع غير معروف"}
                icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
                badge={{ text: "نقص", variant: "destructive" }}
                fields={[
                  { label: "الكمية الحالية", value: <span className="text-destructive font-bold">{item.quantity}</span> },
                  { label: "الحد الأدنى", value: item.product?.min_stock },
                  { label: "النقص", value: <span className="text-destructive">{(item.product!.min_stock! - item.quantity).toLocaleString()}</span> },
                ]}
              />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المنتج</TableHead>
                <TableHead>المستودع</TableHead>
                <TableHead>الكمية الحالية</TableHead>
                <TableHead>الحد الأدنى</TableHead>
                <TableHead>النقص</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product?.name}</TableCell>
                  <TableCell>{item.warehouse?.name}</TableCell>
                  <TableCell className="text-destructive font-bold">{item.quantity.toLocaleString()}</TableCell>
                  <TableCell>{item.product?.min_stock}</TableCell>
                  <TableCell className="text-destructive">{(item.product!.min_stock! - item.quantity).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
