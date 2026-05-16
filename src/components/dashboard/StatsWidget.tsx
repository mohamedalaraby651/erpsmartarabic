import React, { memo } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, FileText, Receipt, TrendingUp, TrendingDown } from 'lucide-react';
import type { DashboardStats } from '@/hooks/useDashboardData';

interface StatsWidgetProps {
  dashboardStats: DashboardStats | undefined;
}

export const StatsWidget = memo(function StatsWidget({ dashboardStats }: StatsWidgetProps) {
  const invoiceTrend = dashboardStats?.invoiceTrend;
  const trendLabel = invoiceTrend !== null && invoiceTrend !== undefined
    ? `${invoiceTrend >= 0 ? '+' : ''}${invoiceTrend.toFixed(0)}%`
    : '—';

  const stats = [
    { title: 'العملاء', value: dashboardStats?.customersCount || 0, icon: Users, change: '', positive: true },
    { title: 'المنتجات', value: dashboardStats?.productsCount || 0, icon: Package, change: '', positive: true },
    { title: 'عروض الأسعار', value: dashboardStats?.quotationsCount || 0, icon: FileText, change: '', positive: true },
    { title: 'الفواتير', value: dashboardStats?.invoicesCount || 0, icon: Receipt, change: trendLabel, positive: invoiceTrend !== null && invoiceTrend !== undefined ? invoiceTrend >= 0 : true },
  ];

  return (
    <>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">الإحصائيات</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.title} className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    {stat.change && stat.change !== '—' && (
                      <div className="flex items-center gap-1 mt-2">
                        {stat.positive ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                        <span className={`text-sm ${stat.positive ? 'text-success' : 'text-destructive'}`}>
                          {stat.change}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </>
  );
});
