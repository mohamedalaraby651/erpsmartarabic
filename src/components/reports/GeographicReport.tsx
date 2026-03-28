import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MapPin, Users, TrendingUp } from 'lucide-react';

export function GeographicReport() {
  const { data: customers, isLoading } = useQuery({
    queryKey: ['geographic-report'],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, name, governorate, current_balance, is_active');
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: invoices } = useQuery({
    queryKey: ['geographic-invoices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('total_amount, customer_id, customers(governorate)');
      return data || [];
    },
    staleTime: 60000,
  });

  const chartData = useMemo(() => {
    if (!customers) return [];
    const govMap = new Map<string, { count: number; balance: number; sales: number }>();

    customers.forEach(c => {
      const gov = c.governorate || 'غير محدد';
      const entry = govMap.get(gov) || { count: 0, balance: 0, sales: 0 };
      entry.count++;
      entry.balance += Number(c.current_balance || 0);
      govMap.set(gov, entry);
    });

    invoices?.forEach(inv => {
      const gov = (inv as { customers?: { governorate?: string } | null }).customers?.governorate || 'غير محدد';
      const entry = govMap.get(gov) || { count: 0, balance: 0, sales: 0 };
      entry.sales += Number(inv.total_amount || 0);
      govMap.set(gov, entry);
    });

    return Array.from(govMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [customers, invoices]);

  if (isLoading) {
    return <div className="space-y-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-64" />
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{chartData.length}</p>
                <p className="text-sm text-muted-foreground">محافظة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{customers?.length || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي العملاء</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {chartData.reduce((s, d) => s + d.sales, 0).toLocaleString('ar-EG')} ج.م
                </p>
                <p className="text-sm text-muted-foreground">إجمالي المبيعات</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>توزيع العملاء حسب المحافظة</CardTitle>
          <CardDescription>عدد العملاء وإجمالي مبيعاتهم لكل محافظة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'count') return [value, 'العملاء'];
                    return [value.toLocaleString('ar-EG') + ' ج.م', 'المبيعات'];
                  }}
                />
                <Bar dataKey="count" name="count" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المبيعات حسب المحافظة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value.toLocaleString('ar-EG') + ' ج.م', 'المبيعات']}
                />
                <Bar dataKey="sales" name="المبيعات" fill="hsl(var(--chart-2))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
