import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface TopProduct {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

interface TopProductsChartProps {
  topProducts?: TopProduct[];
}

export function TopProductsChart({ topProducts = [] }: TopProductsChartProps) {
  const chartData = useMemo(() => {
    return topProducts.slice(0, 10).map(p => ({
      name: p.product_name.length > 20 ? p.product_name.slice(0, 20) + '…' : p.product_name,
      المبلغ: Math.round(p.total_revenue),
      الكمية: p.total_quantity,
    }));
  }, [topProducts]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">أكثر المنتجات شراءً</CardTitle></CardHeader>
        <CardContent><p className="text-center py-8 text-muted-foreground text-sm">لا توجد بيانات منتجات</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">أكثر 10 منتجات شراءً</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
            <Tooltip formatter={(v: number, name: string) => [`${v.toLocaleString()}${name === 'المبلغ' ? ' ج.م' : ''}`, name]} contentStyle={{ direction: 'rtl', borderRadius: '8px', fontSize: 12 }} />
            <Bar dataKey="المبلغ" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
