import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";

interface MonthlyData {
  month: string;
  invoice_total: number;
  payment_total: number;
}

interface CustomerPurchaseChartProps {
  monthlyData?: MonthlyData[];
}

const CustomerPurchaseChart = ({ monthlyData = [] }: CustomerPurchaseChartProps) => {
  const isMobile = useIsMobile();

  const chartData = useMemo(() => {
    if (!monthlyData.length) return [];
    return monthlyData
      .slice()
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12)
      .map(d => ({
        month: format(parseISO(d.month + '-01'), 'MMM yyyy', { locale: ar }),
        purchases: Math.round(d.invoice_total),
        payments: Math.round(d.payment_total),
      }));
  }, [monthlyData]);

  if (chartData.length === 0) {
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

  const chartHeight = isMobile ? 250 : 350;
  const margins = isMobile
    ? { top: 5, right: 8, left: 8, bottom: 5 }
    : { top: 5, right: 20, left: 20, bottom: 5 };
  const tickFontSize = isMobile ? 9 : 11;

  return (
    <Card>
      <CardHeader>
        <CardTitle className={isMobile ? 'text-base' : ''}>المشتريات والمدفوعات الشهرية (آخر 12 شهر)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={chartData} margin={margins}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" tick={{ fontSize: tickFontSize }} interval={isMobile ? 1 : 0} />
            <YAxis className="text-xs" tick={{ fontSize: tickFontSize }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={isMobile ? 35 : 50} />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value.toLocaleString()} ج.م`,
                name === 'purchases' ? 'المشتريات' : 'المدفوعات'
              ]}
              contentStyle={{ direction: 'rtl', borderRadius: '8px', fontSize: isMobile ? 12 : 14 }}
            />
            <Legend formatter={(value) => value === 'purchases' ? 'المشتريات' : 'المدفوعات'} wrapperStyle={{ fontSize: isMobile ? 11 : 14 }} />
            <Bar dataKey="purchases" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="purchases" />
            <Bar dataKey="payments" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="payments" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default CustomerPurchaseChart;
