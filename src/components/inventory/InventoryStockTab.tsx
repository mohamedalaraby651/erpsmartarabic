import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Package } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DataCard } from "@/components/mobile/DataCard";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";

interface ProductStock {
  id: string;
  product_id: string;
  quantity: number;
  product: { id: string; name: string; sku: string | null; min_stock: number | null; image_url: string | null } | null;
  warehouse: { id: string; name: string } | null;
  variant: { id: string; name: string } | null;
}

interface InventoryStockTabProps {
  stock: ProductStock[];
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function InventoryStockTab({ stock, isLoading, searchTerm, onSearchChange }: InventoryStockTabProps) {
  const isMobile = useIsMobile();

  const filteredStock = stock.filter((item) =>
    item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.warehouse?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="بحث في المخزون..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} className="pr-10" />
      </div>

      {isLoading ? (
        isMobile ? <MobileListSkeleton count={5} /> : (
          <Card className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </Card>
        )
      ) : filteredStock.length === 0 ? (
        <EmptyState icon={Package} title="لا توجد بيانات مخزون" description="ابدأ بإضافة منتجات إلى المستودعات" />
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredStock.map((item) => {
            const isLowStock = item.product?.min_stock && item.quantity <= item.product.min_stock;
            return (
              <DataCard
                key={item.id}
                title={item.product?.name || "منتج غير معروف"}
                subtitle={`${item.warehouse?.name || ""} ${item.variant?.name ? `• ${item.variant.name}` : ""}`}
                avatar={item.product?.image_url}
                avatarFallback={item.product?.name?.charAt(0) || "م"}
                badge={isLowStock ? { text: "نقص مخزون", variant: "destructive" } : { text: "متوفر", variant: "default" }}
                fields={[
                  { label: "الكمية", value: item.quantity.toLocaleString() },
                  { label: "الحد الأدنى", value: item.product?.min_stock || "-" },
                  { label: "SKU", value: item.product?.sku || "-" },
                ]}
              />
            );
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المنتج</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>المتغير</TableHead>
                <TableHead>المستودع</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>الحد الأدنى</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStock.map((item) => {
                const isLowStock = item.product?.min_stock && item.quantity <= item.product.min_stock;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product?.name}</TableCell>
                    <TableCell>{item.product?.sku || "-"}</TableCell>
                    <TableCell>{item.variant?.name || "-"}</TableCell>
                    <TableCell>{item.warehouse?.name}</TableCell>
                    <TableCell>{item.quantity.toLocaleString()}</TableCell>
                    <TableCell>{item.product?.min_stock || "-"}</TableCell>
                    <TableCell>
                      {isLowStock ? <Badge variant="destructive">نقص مخزون</Badge> : <Badge variant="default">متوفر</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
