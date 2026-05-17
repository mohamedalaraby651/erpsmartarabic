import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Receipt, CreditCard, FileText, ShoppingCart } from 'lucide-react';
import { DashboardChip, type ChipTone } from './_shared/DashboardChip';

export function TodayPerformanceWidget() {
  const { data: todayStats, isLoading } = useQuery({
    queryKey: ['today-performance'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString();

      const [
        todayInvoicesRes,
        yesterdayInvoicesRes,
        todayPaymentsRes,
        yesterdayPaymentsRes,
        todayQuotationsRes,
        todayOrdersRes,
      ] = await Promise.all([
        supabase
          .from('invoices')
          .select('total_amount')
          .gte('created_at', todayStr),
        supabase
          .from('invoices')
          .select('total_amount')
          .gte('created_at', yesterdayStr)
          .lt('created_at', todayStr),
        supabase
          .from('payments')
          .select('amount')
          .gte('created_at', todayStr),
        supabase
          .from('payments')
          .select('amount')
          .gte('created_at', yesterdayStr)
          .lt('created_at', todayStr),
        supabase
          .from('quotations')
          .select('id')
          .gte('created_at', todayStr),
        supabase
          .from('sales_orders')
          .select('id')
          .gte('created_at', todayStr),
      ]);

      const todayInvoicesTotal = (todayInvoicesRes.data || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const yesterdayInvoicesTotal = (yesterdayInvoicesRes.data || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const todayPaymentsTotal = (todayPaymentsRes.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const yesterdayPaymentsTotal = (yesterdayPaymentsRes.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);

      const invoicesChange = yesterdayInvoicesTotal > 0 
        ? ((todayInvoicesTotal - yesterdayInvoicesTotal) / yesterdayInvoicesTotal) * 100 
        : todayInvoicesTotal > 0 ? 100 : 0;

      const paymentsChange = yesterdayPaymentsTotal > 0 
        ? ((todayPaymentsTotal - yesterdayPaymentsTotal) / yesterdayPaymentsTotal) * 100 
        : todayPaymentsTotal > 0 ? 100 : 0;

      return {
        invoicesTotal: todayInvoicesTotal,
        invoicesCount: todayInvoicesRes.data?.length || 0,
        invoicesChange,
        paymentsTotal: todayPaymentsTotal,
        paymentsCount: todayPaymentsRes.data?.length || 0,
        paymentsChange,
        quotationsCount: todayQuotationsRes.data?.length || 0,
        ordersCount: todayOrdersRes.data?.length || 0,
      };
    },
    staleTime: 30000,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <>
        <CardHeader className="px-3 pt-2.5 pb-1.5 sm:px-6 sm:pt-6">
          <CardTitle className="text-[13px] sm:text-lg">أداء اليوم</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-[68px] sm:h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </>
    );
  }

  if (!todayStats) return null;

  const stats = [
    {
      title: 'الفواتير',
      value: todayStats.invoicesTotal,
      count: todayStats.invoicesCount,
      change: todayStats.invoicesChange,
      icon: Receipt,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'التحصيلات',
      value: todayStats.paymentsTotal,
      count: todayStats.paymentsCount,
      change: todayStats.paymentsChange,
      icon: CreditCard,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'عروض الأسعار',
      value: null,
      count: todayStats.quotationsCount,
      change: null,
      icon: FileText,
      color: 'text-accent-foreground',
      bgColor: 'bg-accent',
    },
    {
      title: 'أوامر البيع',
      value: null,
      count: todayStats.ordersCount,
      change: null,
      icon: ShoppingCart,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <>
      <CardHeader className="px-3 pt-2.5 pb-1.5 sm:px-6 sm:pt-6">
        <CardTitle className="text-[13px] sm:text-lg">أداء اليوم</CardTitle>
        <CardDescription className="text-[10px] sm:text-sm leading-tight">
          {new Date().toLocaleDateString('ar-EG', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
        <div className="grid grid-cols-2 gap-2 sm:gap-4 animate-fade-in">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.title} className="p-2 sm:p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <div className={`h-7 w-7 sm:h-9 sm:w-9 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.color}`} />
                  </div>
                  {stat.change !== null && (
                    <div className={`flex items-center gap-0.5 text-[9px] sm:text-xs ${
                      stat.change >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {stat.change >= 0 ? (
                        <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      ) : (
                        <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      )}
                      <span className="tabular-nums">{Math.abs(stat.change).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{stat.title}</p>
                {stat.value !== null ? (
                  <p className="text-sm sm:text-lg font-bold mt-0.5 sm:mt-1 tabular-nums truncate leading-tight">
                    {stat.value.toLocaleString('ar-EG')} ج.م
                  </p>
                ) : (
                  <p className="text-sm sm:text-lg font-bold mt-0.5 sm:mt-1 tabular-nums leading-tight">{stat.count}</p>
                )}
                {stat.value !== null && (
                  <p className="text-[9px] sm:text-xs text-muted-foreground leading-tight">{stat.count} عملية</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </>
  );
}
