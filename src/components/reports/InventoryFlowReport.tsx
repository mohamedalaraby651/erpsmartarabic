import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Package, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface InventoryFlowReportProps {
  startDate: Date;
  endDate: Date;
}

export function InventoryFlowReport({ startDate, endDate }: InventoryFlowReportProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-flow-report', startDate, endDate],
    queryFn: async () => {
      const startStr = startDate.toISOString();
      const endStr = endDate.toISOString();

      const [movementsRes, productsRes, stockRes] = await Promise.all([
        supabase
          .from('stock_movements')
          .select(`
            id,
            product_id,
            quantity,
            movement_type,
            created_at,
            products(name)
          `)
          .gte('created_at', startStr)
          .lte('created_at', endStr)
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('id, name, min_stock, is_active')
          .eq('is_active', true),
        supabase
          .from('product_stock')
          .select('product_id, quantity'),
      ]);

      return {
        movements: movementsRes.data || [],
        products: productsRes.data || [],
        stock: stockRes.data || [],
      };
    },
    staleTime: 60000,
  });

  const stats = useMemo(() => {
    if (!data) return null;

    const incoming = data.movements
      .filter(m => m.movement_type === 'in')
      .reduce((sum, m) => sum + (m.quantity || 0), 0);

    const outgoing = data.movements
      .filter(m => m.movement_type === 'out')
      .reduce((sum, m) => sum + (m.quantity || 0), 0);

    const transfers = data.movements
      .filter(m => m.movement_type === 'transfer')
      .reduce((sum, m) => sum + (m.quantity || 0), 0);

    // Calculate low stock products
    const stockMap = new Map<string, number>();
    data.stock.forEach(s => {
      const current = stockMap.get(s.product_id) || 0;
      stockMap.set(s.product_id, current + (s.quantity || 0));
    });

    const lowStockProducts = data.products.filter(p => {
      const currentStock = stockMap.get(p.id) || 0;
      return currentStock < (p.min_stock || 0);
    });

    return {
      incoming,
      outgoing,
      transfers,
      netFlow: incoming - outgoing,
      totalMovements: data.movements.length,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
    };
  }, [data]);

  const flowChartData = useMemo(() => {
    if (!data) return [];

    const dailyData: Record<string, { date: string; in: number; out: number }> = {};

    data.movements.forEach(m => {
      const date = new Date(m.created_at).toLocaleDateString('ar-EG', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (!dailyData[date]) {
        dailyData[date] = { date, in: 0, out: 0 };
      }

      if (m.movement_type === 'in') {
        dailyData[date].in += m.quantity || 0;
      } else if (m.movement_type === 'out') {
        dailyData[date].out += m.quantity || 0;
      }
    });

    return Object.values(dailyData).reverse();
  }, [data]);

  const topProducts = useMemo(() => {
    if (!data) return [];

    const productMovements: Record<string, { name: string; in: number; out: number }> = {};

    data.movements.forEach(m => {
      const productName = (m as { products?: { name: string } | null }).products?.name || 'منتج غير معروف';
      if (!productMovements[m.product_id]) {
        productMovements[m.product_id] = { name: productName, in: 0, out: 0 };
      }

      if (m.movement_type === 'in') {
        productMovements[m.product_id].in += m.quantity || 0;
      } else if (m.movement_type === 'out') {
        productMovements[m.product_id].out += m.quantity || 0;
      }
    });

    return Object.values(productMovements)
      .sort((a, b) => (b.in + b.out) - (a.in + a.out))
      .slice(0, 10);
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: 'الوارد',
      value: stats.incoming,
      icon: ArrowDownCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'الصادر',
      value: stats.outgoing,
      icon: ArrowUpCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: 'التحويلات',
      value: stats.transfers,
      icon: ArrowLeftRight,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'مخزون منخفض',
      value: stats.lowStockCount,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      suffix: 'منتج',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">
                      {stat.value.toLocaleString('ar-EG')} {stat.suffix || 'وحدة'}
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>حركة المخزون اليومية</CardTitle>
          <CardDescription>الوارد والصادر على مدار الفترة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flowChartData}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="in"
                  name="الوارد"
                  stroke="hsl(var(--success))"
                  fillOpacity={1}
                  fill="url(#colorIn)"
                />
                <Area
                  type="monotone"
                  dataKey="out"
                  name="الصادر"
                  stroke="hsl(var(--destructive))"
                  fillOpacity={1}
                  fill="url(#colorOut)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>أكثر المنتجات حركة</CardTitle>
            <CardDescription>المنتجات ذات أعلى معدل دوران</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="in" name="وارد" fill="hsl(var(--success))" stackId="a" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="out" name="صادر" fill="hsl(var(--destructive))" stackId="a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              تنبيهات المخزون المنخفض
            </CardTitle>
            <CardDescription>المنتجات التي تحتاج إعادة طلب</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.lowStockProducts.length > 0 ? (
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {stats.lowStockProducts.map((product) => (
                  <div 
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-warning" />
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <Badge variant="outline" className="text-warning border-warning">
                      أقل من {product.min_stock}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>جميع المنتجات في المستوى الآمن</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
