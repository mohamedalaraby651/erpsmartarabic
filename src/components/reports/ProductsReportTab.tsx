import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProductsReportTabProps {
  topProducts: Array<{ name: string; quantity: number; revenue: number }> | undefined;
  formatCurrency: (amount: number) => string;
}

export function ProductsReportTab({ topProducts, formatCurrency }: ProductsReportTabProps) {
  const isMobile = useIsMobile();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />المنتجات الأكثر مبيعاً
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isMobile ? (
          <div className="space-y-2">
            {topProducts?.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">{index + 1}</Badge>
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-primary">{formatCurrency(item.revenue)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" name="الإيرادات" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
