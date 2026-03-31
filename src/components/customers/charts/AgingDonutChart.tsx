import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { differenceInDays } from "date-fns";

interface Invoice {
  id: string;
  total_amount: number;
  paid_amount: number | null;
  due_date: string | null;
  created_at: string;
  payment_status: string;
}

const AGING_BUCKETS = [
  { key: '0-30', label: '0-30 يوم', color: 'hsl(var(--primary))' },
  { key: '31-60', label: '31-60 يوم', color: 'hsl(45 93% 47%)' },
  { key: '61-90', label: '61-90 يوم', color: 'hsl(25 95% 53%)' },
  { key: '90+', label: '90+ يوم', color: 'hsl(0 84% 60%)' },
];

export function AgingDonutChart({ invoices }: { invoices: Invoice[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const buckets: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };

    invoices
      .filter(i => i.payment_status !== 'paid')
      .forEach(inv => {
        const remaining = Number(inv.total_amount) - Number(inv.paid_amount || 0);
        if (remaining <= 0) return;
        const ref = inv.due_date || inv.created_at;
        const days = differenceInDays(now, new Date(ref));
        if (days <= 30) buckets['0-30'] += remaining;
        else if (days <= 60) buckets['31-60'] += remaining;
        else if (days <= 90) buckets['61-90'] += remaining;
        else buckets['90+'] += remaining;
      });

    return AGING_BUCKETS.map(b => ({ name: b.label, value: Math.round(buckets[b.key]), color: b.color })).filter(d => d.value > 0);
  }, [invoices]);

  if (data.length === 0) {
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
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={3}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v: number) => `${v.toLocaleString()} ج.م`} contentStyle={{ direction: 'rtl', borderRadius: '8px', fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
