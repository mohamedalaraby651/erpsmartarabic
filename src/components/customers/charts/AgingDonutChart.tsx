import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const AGING_BUCKETS = [
  { key: 'bucket_0_30', label: '0-30 يوم', color: 'hsl(var(--primary))' },
  { key: 'bucket_31_60', label: '31-60 يوم', color: 'hsl(var(--warning))' },
  { key: 'bucket_61_90', label: '61-90 يوم', color: 'hsl(var(--info))' },
  { key: 'bucket_90_plus', label: '90+ يوم', color: 'hsl(var(--destructive))' },
];

interface AgingDonutChartProps {
  customerId: string;
}

export function AgingDonutChart({ customerId }: AgingDonutChartProps) {
  const { data: agingData } = useQuery({
    queryKey: ['customer-aging', customerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_customer_aging', { _customer_id: customerId });
      if (error) throw error;
      return data as Record<string, { amount: number; count: number }> & { total_outstanding: number };
    },
    enabled: !!customerId,
    staleTime: 120000,
  });

  const chartPieces = useMemo(() => {
    if (!agingData) return [];
    return AGING_BUCKETS
      .map(b => ({
        name: b.label,
        value: Math.round(Number((agingData as any)[b.key]?.amount ?? 0)),
        color: b.color,
      }))
      .filter(d => d.value > 0);
  }, [agingData]);

  if (chartPieces.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">توزيع أعمار الديون</CardTitle></CardHeader>
        <CardContent><p className="text-center py-8 text-muted-foreground text-sm">لا توجد ديون مستحقة</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">توزيع أعمار الديون</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={chartPieces} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={3}>
              {chartPieces.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v: number) => `${v.toLocaleString()} ج.م`} contentStyle={{ direction: 'rtl', borderRadius: '8px', fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
