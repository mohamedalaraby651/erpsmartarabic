import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ar } from "date-fns/locale";

interface Invoice {
  id: string;
  total_amount: number;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
}

interface CustomerPurchaseChartProps {
  invoices: Invoice[];
  payments: Payment[];
}

const CustomerPurchaseChart = ({ invoices, payments }: CustomerPurchaseChartProps) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(now, 11 - i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const monthInvoices = invoices.filter(inv =>
        isWithinInterval(new Date(inv.created_at), { start, end })
      );
      const monthPayments = payments.filter(pay =>
        isWithinInterval(new Date(pay.payment_date), { start, end })
      );

      return {
        month: format(date, 'MMM yyyy', { locale: ar }),
        purchases: monthInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
        payments: monthPayments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0),
      };
    });
    return months;
  }, [invoices, payments]);

  const hasData = chartData.some(d => d.purchases > 0 || d.payments > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>المشتريات والمدفوعات الشهرية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            لا توجد بيانات كافية لعرض الرسم البياني
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>المشتريات والمدفوعات الشهرية (آخر 12 شهر)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
            <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value.toLocaleString()} ج.م`,
                name === 'purchases' ? 'المشتريات' : 'المدفوعات'
              ]}
              contentStyle={{ direction: 'rtl', borderRadius: '8px' }}
            />
            <Legend formatter={(value) => value === 'purchases' ? 'المشتريات' : 'المدفوعات'} />
            <Bar dataKey="purchases" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="purchases" />
            <Bar dataKey="payments" fill="hsl(var(--success, 142 71% 45%))" radius={[4, 4, 0, 0]} name="payments" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default CustomerPurchaseChart;
