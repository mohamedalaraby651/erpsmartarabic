import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Minus, Percent } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface ProfitabilityReportProps {
  startDate: Date;
  endDate: Date;
}

export function ProfitabilityReport({ startDate, endDate }: ProfitabilityReportProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['profitability-report', startDate, endDate],
    queryFn: async () => {
      const startStr = startDate.toISOString();
      const endStr = endDate.toISOString();

      const [invoicesRes, purchasesRes, expensesRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('total_amount, created_at, payment_status')
          .gte('created_at', startStr)
          .lte('created_at', endStr),
        supabase
          .from('purchase_orders')
          .select('total_amount, created_at, status')
          .gte('created_at', startStr)
          .lte('created_at', endStr),
        supabase
          .from('expenses')
          .select('amount, expense_date, status')
          .gte('expense_date', startStr.split('T')[0])
          .lte('expense_date', endStr.split('T')[0]),
      ]);

      return {
        invoices: invoicesRes.data || [],
        purchases: purchasesRes.data || [],
        expenses: expensesRes.data || [],
      };
    },
    staleTime: 60000,
  });

  const stats = useMemo(() => {
    if (!data) return null;

    const totalSales = data.invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalPurchases = data.purchases.reduce((sum, po) => sum + (po.total_amount || 0), 0);
    const totalExpenses = data.expenses
      .filter(exp => exp.status === 'approved')
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    const grossProfit = totalSales - totalPurchases;
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    return {
      totalSales,
      totalPurchases,
      totalExpenses,
      grossProfit,
      netProfit,
      profitMargin,
    };
  }, [data]);

  const chartData = useMemo(() => {
    if (!data) return [];

    const monthlyData: Record<string, { sales: number; purchases: number; expenses: number }> = {};

    data.invoices.forEach(inv => {
      const month = new Date(inv.created_at).toLocaleDateString('ar-EG', { month: 'short' });
      if (!monthlyData[month]) monthlyData[month] = { sales: 0, purchases: 0, expenses: 0 };
      monthlyData[month].sales += inv.total_amount || 0;
    });

    data.purchases.forEach(po => {
      const month = new Date(po.created_at).toLocaleDateString('ar-EG', { month: 'short' });
      if (!monthlyData[month]) monthlyData[month] = { sales: 0, purchases: 0, expenses: 0 };
      monthlyData[month].purchases += po.total_amount || 0;
    });

    data.expenses.forEach(exp => {
      const month = new Date(exp.expense_date).toLocaleDateString('ar-EG', { month: 'short' });
      if (!monthlyData[month]) monthlyData[month] = { sales: 0, purchases: 0, expenses: 0 };
      monthlyData[month].expenses += exp.amount || 0;
    });

    return Object.entries(monthlyData).map(([month, values]) => ({
      month,
      ...values,
      profit: values.sales - values.purchases - values.expenses,
    }));
  }, [data]);

  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'المشتريات', value: stats.totalPurchases, color: 'hsl(var(--destructive))' },
      { name: 'المصروفات', value: stats.totalExpenses, color: 'hsl(var(--warning))' },
      { name: 'صافي الربح', value: Math.max(0, stats.netProfit), color: 'hsl(var(--success))' },
    ];
  }, [stats]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
        <Skeleton className="h-64 rounded-lg md:col-span-2" />
        <Skeleton className="h-64 rounded-lg md:col-span-2" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: 'إجمالي المبيعات',
      value: stats.totalSales,
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'إجمالي المشتريات',
      value: stats.totalPurchases,
      icon: ShoppingCart,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: 'إجمالي المصروفات',
      value: stats.totalExpenses,
      icon: Minus,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'صافي الربح',
      value: stats.netProfit,
      icon: stats.netProfit >= 0 ? TrendingUp : TrendingDown,
      color: stats.netProfit >= 0 ? 'text-success' : 'text-destructive',
      bgColor: stats.netProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10',
      suffix: `(${stats.profitMargin.toFixed(1)}%)`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">
                      {stat.value.toLocaleString('ar-EG')} ج.م
                    </p>
                    {stat.suffix && (
                      <p className={`text-sm ${stat.color} mt-1`}>{stat.suffix}</p>
                    )}
                  </div>
                  <div className={`h-12 w-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>الأداء الشهري</CardTitle>
            <CardDescription>مقارنة المبيعات والمشتريات والأرباح</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => value.toLocaleString('ar-EG') + ' ج.م'}
                  />
                  <Bar dataKey="sales" name="المبيعات" fill="hsl(var(--primary))" radius={4} />
                  <Bar dataKey="purchases" name="المشتريات" fill="hsl(var(--destructive))" radius={4} />
                  <Bar dataKey="profit" name="الربح" fill="hsl(var(--success))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>توزيع المصاريف</CardTitle>
            <CardDescription>نسبة توزيع التكاليف من إجمالي المبيعات</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => value.toLocaleString('ar-EG') + ' ج.م'}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
