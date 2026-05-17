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
        <div className="sm:hidden flex items-center justify-between px-3 pt-2.5 pb-1.5">
          <h3 className="text-base font-bold">أداء اليوم</h3>
        </div>
        <CardHeader className="hidden sm:block px-6 pt-6 pb-1.5">
          <CardTitle className="text-lg">أداء اليوم</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
          <div className="sm:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9 w-[120px] rounded-lg shrink-0" />)}
          </div>
          <div className="hidden sm:grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        </CardContent>
      </>
    );
  }

  if (!todayStats) return null;

  const stats: Array<{
    title: string;
    value: number | null;
    count: number;
    change: number | null;
    icon: typeof Receipt;
    color: string;
    bgColor: string;
    chipTone: ChipTone;
  }> = [
    {
      title: 'الفواتير',
      value: todayStats.invoicesTotal,
      count: todayStats.invoicesCount,
      change: todayStats.invoicesChange,
      icon: Receipt,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      chipTone: 'primary',
    },
    {
      title: 'التحصيلات',
      value: todayStats.paymentsTotal,
      count: todayStats.paymentsCount,
      change: todayStats.paymentsChange,
      icon: CreditCard,
      color: 'text-success',
      bgColor: 'bg-success/10',
      chipTone: 'success',
    },
    {
      title: 'عروض الأسعار',
      value: null,
      count: todayStats.quotationsCount,
      change: null,
      icon: FileText,
      color: 'text-accent-foreground',
      bgColor: 'bg-accent',
      chipTone: 'info',
    },
    {
      title: 'أوامر البيع',
      value: null,
      count: todayStats.ordersCount,
      change: null,
      icon: ShoppingCart,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      chipTone: 'warning',
    },
  ];

  const fmtChipValue = (s: typeof stats[number]) => {
    if (s.value !== null) {
      // Compact currency for chips
      const v = s.value;
      if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}ك`;
      return v.toLocaleString('ar-EG');
    }
    return s.count.toLocaleString('ar-EG');
  };

  return (
    <>
      {/* Mobile compact header */}
      <div className="sm:hidden flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <h3 className="text-base font-bold">أداء اليوم</h3>
        <span className="text-[10px] text-muted-foreground">
          {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'short' })}
        </span>
      </div>

      {/* Desktop header */}
      <CardHeader className="hidden sm:block px-6 pt-6 pb-1.5">
        <CardTitle className="text-lg">أداء اليوم</CardTitle>
        <CardDescription className="text-sm leading-tight">
          {new Date().toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
        {/* Mobile: chip strip */}
        <div className="sm:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3 animate-fade-in">
          {stats.map((s) => (
            <DashboardChip
              key={s.title}
              label={s.title}
              value={fmtChipValue(s)}
              icon={s.icon}
              tone={s.chipTone}
              trend={s.change}
            />
          ))}
        </div>

        {/* Desktop: original 2x2 grid */}
        <div className="hidden sm:grid grid-cols-2 gap-4 animate-fade-in">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.title} className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className={`h-9 w-9 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  {stat.change !== null && (
                    <div className={`flex items-center gap-0.5 text-xs ${
                      stat.change >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {stat.change >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span className="tabular-nums">{Math.abs(stat.change).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-tight">{stat.title}</p>
                {stat.value !== null ? (
                  <p className="text-lg font-bold mt-1 tabular-nums truncate leading-tight">
                    {stat.value.toLocaleString('ar-EG')} ج.م
                  </p>
                ) : (
                  <p className="text-lg font-bold mt-1 tabular-nums leading-tight">{stat.count}</p>
                )}
                {stat.value !== null && (
                  <p className="text-xs text-muted-foreground leading-tight">{stat.count} عملية</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </>
  );
}
