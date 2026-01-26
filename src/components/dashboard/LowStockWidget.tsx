import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Package, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LowStockProduct {
  id: string;
  name: string;
  sku: string | null;
  currentStock: number;
  minStock: number;
  stockPercentage: number;
}

export function LowStockWidget() {
  const navigate = useNavigate();

  const { data: lowStockProducts, isLoading } = useQuery({
    queryKey: ['low-stock-widget'],
    queryFn: async () => {
      // Get products with min_stock defined
      const { data: products } = await supabase
        .from('products')
        .select('id, name, sku, min_stock')
        .eq('is_active', true)
        .gt('min_stock', 0);

      if (!products || products.length === 0) return [];

      // Get current stock for these products
      const { data: stock } = await supabase
        .from('product_stock')
        .select('product_id, quantity')
        .in('product_id', products.map(p => p.id));

      // Calculate stock per product
      const stockMap = new Map<string, number>();
      (stock || []).forEach(s => {
        const current = stockMap.get(s.product_id) || 0;
        stockMap.set(s.product_id, current + (s.quantity || 0));
      });

      // Filter low stock products
      const lowStock: LowStockProduct[] = products
        .map(p => {
          const currentStock = stockMap.get(p.id) || 0;
          const minStock = p.min_stock || 0;
          const stockPercentage = minStock > 0 ? (currentStock / minStock) * 100 : 100;
          return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            currentStock,
            minStock,
            stockPercentage,
          };
        })
        .filter(p => p.stockPercentage < 100)
        .sort((a, b) => a.stockPercentage - b.stockPercentage);

      return lowStock;
    },
    staleTime: 60000,
    gcTime: 120000,
  });

  const getStockLevel = (percentage: number) => {
    if (percentage === 0) return { label: 'نفذ', color: 'destructive' as const };
    if (percentage < 25) return { label: 'حرج', color: 'destructive' as const };
    if (percentage < 50) return { label: 'منخفض', color: 'default' as const };
    return { label: 'قريب', color: 'secondary' as const };
  };

  if (isLoading) {
    return (
      <>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            تنبيهات المخزون
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            تنبيهات المخزون
          </CardTitle>
          <CardDescription>المنتجات التي تحتاج إعادة طلب</CardDescription>
        </div>
        {lowStockProducts && lowStockProducts.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
            عرض الكل
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {lowStockProducts && lowStockProducts.length > 0 ? (
          <div className="space-y-3 max-h-[280px] overflow-y-auto">
            {lowStockProducts.slice(0, 6).map((product) => {
              const stockLevel = getStockLevel(product.stockPercentage);
              return (
                <div
                  key={product.id}
                  className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm truncate max-w-[150px]">
                        {product.name}
                      </span>
                    </div>
                    <Badge variant={stockLevel.color} className="text-xs">
                      {stockLevel.label}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>الحالي: {product.currentStock}</span>
                      <span>الحد الأدنى: {product.minStock}</span>
                    </div>
                    <Progress 
                      value={Math.min(product.stockPercentage, 100)} 
                      className="h-2"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 text-success opacity-70" />
            <p className="font-medium text-success">جميع المنتجات في المستوى الآمن</p>
          </div>
        )}
      </CardContent>
    </>
  );
}
