import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ar } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];

interface SupplierPurchasesChartProps {
  purchaseOrders: PurchaseOrder[];
}

const SupplierPurchasesChart = ({ purchaseOrders }: SupplierPurchasesChartProps) => {
  // Generate last 12 months data
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), 11 - i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    const monthOrders = purchaseOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= monthStart && orderDate <= monthEnd;
    });
    
    const total = monthOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const count = monthOrders.length;
    
    return {
      month: format(date, "MMM", { locale: ar }),
      fullMonth: format(date, "MMMM yyyy", { locale: ar }),
      total,
      count,
    };
  });

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value?: number; payload?: { fullMonth?: string; count?: number } }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{payload[0]?.payload?.fullMonth}</p>
          <p className="text-sm text-muted-foreground">
            المشتريات: <span className="font-medium text-primary">{payload[0]?.value?.toLocaleString()} ج.م</span>
          </p>
          <p className="text-sm text-muted-foreground">
            عدد الطلبات: <span className="font-medium">{payload[0]?.payload?.count}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">المشتريات الشهرية</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupplierPurchasesChart;
