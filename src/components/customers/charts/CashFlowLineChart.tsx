import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ar } from "date-fns/locale";

interface CashFlowLineChartProps {
  invoices: { total_amount: number; created_at: string }[];
  payments: { amount: number; payment_date: string }[];
}

export function CashFlowLineChart({ invoices, payments }: CashFlowLineChartProps) {
  const data = useMemo(() => {
    const now = new Date();
    let cumPurchases = 0;
    let cumPayments = 0;

    return Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(now, 11 - i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const mPurchases = invoices
        .filter(inv => isWithinInterval(new Date(inv.created_at), { start, end }))
        .reduce((s, inv) => s + Number(inv.total_amount || 0), 0);
      const mPayments = payments
        .filter(p => isWithinInterval(new Date(p.payment_date), { start, end }))
        .reduce((s, p) => s + Number(p.amount || 0), 0);

      cumPurchases += mPurchases;
      cumPayments += mPayments;

      return {
        month: format(date, 'MMM yy', { locale: ar }),
        المشتريات_التراكمية: Math.round(cumPurchases),
        المدفوعات_التراكمية: Math.round(cumPayments),
      };
    });
  }, [invoices, payments]);

  const hasData = data.some(d => d.المشتريات_التراكمية > 0 || d.المدفوعات_التراكمية > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">التدفق المالي التراكمي</CardTitle></CardHeader>
        <CardContent><p className="text-center py-8 text-muted-foreground text-sm">لا توجد بيانات كافية</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">التدفق المالي التراكمي (12 شهر)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={40} />
            <Tooltip formatter={(v: number) => `${v.toLocaleString()} ج.م`} contentStyle={{ direction: 'rtl', borderRadius: '8px', fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="المشتريات_التراكمية" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="المدفوعات_التراكمية" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
