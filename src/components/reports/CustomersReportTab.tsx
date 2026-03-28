import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

interface CustomersReportTabProps {
  topCustomers: Array<{ name: string; total: number; count: number }> | undefined;
  formatCurrency: (amount: number) => string;
}

export function CustomersReportTab({ topCustomers, formatCurrency }: CustomersReportTabProps) {
  const isMobile = useIsMobile();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />أفضل العملاء
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isMobile ? (
          <div className="space-y-2">
            {topCustomers?.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">{index + 1}</Badge>
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-primary">{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCustomers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="total" name="إجمالي المشتريات" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
