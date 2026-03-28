import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface InventoryReportTabProps {
  lowStockProducts: Array<{ name: string; currentStock: number; minStock: number }> | undefined;
}

export function InventoryReportTab({ lowStockProducts }: InventoryReportTabProps) {
  const isMobile = useIsMobile();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          المنتجات منخفضة المخزون
          {lowStockProducts && lowStockProducts.length > 0 && (
            <Badge variant="destructive">{lowStockProducts.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lowStockProducts && lowStockProducts.length > 0 ? (
          <div className="space-y-2">
            {lowStockProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className={`text-${isMobile ? 'xs' : 'sm'} text-muted-foreground`}>الحد الأدنى: {product.minStock}</p>
                </div>
                {isMobile ? (
                  <Badge variant="destructive">{product.currentStock}</Badge>
                ) : (
                  <div className="text-right">
                    <p className="text-lg font-bold text-amber-600">{product.currentStock}</p>
                    <p className="text-xs text-muted-foreground">الكمية الحالية</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">جميع المنتجات في مستوى آمن</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
