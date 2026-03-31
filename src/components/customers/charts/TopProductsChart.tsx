import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface TopProductsChartProps {
  customerId: string;
}

export function TopProductsChart({ customerId }: TopProductsChartProps) {
  const { data: items = [] } = useQuery({
    queryKey: ['customer-top-products', customerId],
    queryFn: async () => {
      // Get invoice IDs for this customer
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('customer_id', customerId);

      if (!invoices?.length) return [];

      const invoiceIds = invoices.map(i => i.id);

      const { data } = await supabase
        .from('invoice_items')
        .select('product_id, quantity, total_price, products(name)')
        .in('invoice_id', invoiceIds);

      return data || [];
    },
    staleTime: 60000,
  });

  const chartData = useMemo(() => {
    const map = new Map<string, { name: string; total: number; qty: number }>();
    items.forEach((item: any) => {
      const name = item.products?.name || 'غير معروف';
      const existing = map.get(item.product_id) || { name, total: 0, qty: 0 };
      existing.total += Number(item.total_price || 0);
      existing.qty += Number(item.quantity || 0);
      map.set(item.product_id, existing);
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(p => ({ name: p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name, المبلغ: Math.round(p.total), الكمية: p.qty }));
  }, [items]);

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
