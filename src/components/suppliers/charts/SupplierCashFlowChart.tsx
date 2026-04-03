import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";

interface MonthlyData {
  month: string;
  purchase_total: number;
  payment_total: number;
}

interface SupplierCashFlowChartProps {
  monthlyData?: MonthlyData[];
}

export function SupplierCashFlowChart({ monthlyData = [] }: SupplierCashFlowChartProps) {
  const data = useMemo(() => {
    if (!monthlyData.length) return [];
    const sorted = monthlyData.slice().sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
    let cumPurchases = 0;
    let cumPayments = 0;

    return sorted.map(d => {
      cumPurchases += d.purchase_total;
      cumPayments += d.payment_total;
      return {
        month: format(parseISO(d.month + '-01'), 'MMM yy', { locale: ar }),
        المشتريات_التراكمية: Math.round(cumPurchases),
        المدفوعات_التراكمية: Math.round(cumPayments),
      };
    });
  }, [monthlyData]);

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
            <Line type="monotone" dataKey="المدفوعات_التراكمية" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
