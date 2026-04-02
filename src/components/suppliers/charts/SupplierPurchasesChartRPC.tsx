import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ChartErrorBoundary } from "@/components/shared/ChartErrorBoundary";

interface MonthlyData {
  month: string;
  purchase_total: number;
  purchase_count: number;
  payment_total: number;
  payment_count: number;
}

interface TopProduct {
  product_name: string;
  total_quantity: number;
  total_cost: number;
}

interface SupplierPurchasesChartRPCProps {
  chartData?: {
    monthly_data: MonthlyData[];
    top_products: TopProduct[];
  };
}

const formatMonth = (month: string) => {
  try {
    const d = new Date(month + '-01');
    return format(d, 'MMM', { locale: ar });
  } catch {
    return month;
  }
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value?: number; name?: string; color?: string; payload?: { month?: string } }> }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3">
      <p className="font-medium text-foreground mb-1">{payload[0]?.payload?.month}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm" style={{ color: p.color }}>
          {p.name}: <span className="font-medium">{(p.value || 0).toLocaleString()} ج.م</span>
        </p>
      ))}
    </div>
  );
};

const SupplierPurchasesChartRPC = ({ chartData }: SupplierPurchasesChartRPCProps) => {
  const monthlyData = (chartData?.monthly_data || [])
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)
    .map(d => ({
      ...d,
      monthLabel: formatMonth(d.month),
    }));

  const topProducts = chartData?.top_products?.slice(0, 8) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartErrorBoundary title="المشتريات الشهرية">
        <Card>
          <CardHeader><CardTitle className="text-base">المشتريات والمدفوعات الشهرية</CardTitle></CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="supplierPurchaseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="supplierPaymentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="monthLabel" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="purchase_total" name="المشتريات" stroke="hsl(var(--primary))" fill="url(#supplierPurchaseGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="payment_total" name="المدفوعات" stroke="hsl(var(--success))" fill="url(#supplierPaymentGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </ChartErrorBoundary>

      <ChartErrorBoundary title="أعلى المنتجات المشتراة">
        <Card>
          <CardHeader><CardTitle className="text-base">أعلى المنتجات المشتراة</CardTitle></CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="product_name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={120} />
                    <Tooltip formatter={(v: number) => [`${v.toLocaleString()} ج.م`, 'القيمة']} />
                    <Bar dataKey="total_cost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </ChartErrorBoundary>
    </div>
  );
};

export default SupplierPurchasesChartRPC;
