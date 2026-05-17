import React, { memo } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, FileText, Receipt, TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { DashboardStats } from '@/hooks/useDashboardData';

interface StatsWidgetProps {
  dashboardStats: DashboardStats | undefined;
}

interface StatItem {
  title: string;
  value: number;
  icon: LucideIcon;
  href: string;
  tone: string;
  change?: string;
  positive?: boolean;
}

const StatCard = memo(function StatCard({ stat }: { stat: StatItem }) {
  const navigate = useNavigate();
  const Icon = stat.icon;
  return (
    <button
      type="button"
      onClick={() => navigate(stat.href)}
      className={cn(
        'group text-right p-4 rounded-xl border bg-card',
        'transition-all hover:shadow-md hover:-translate-y-0.5',
        'focus:outline-none focus:ring-2 focus:ring-primary/40'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.title}</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums">
            {new Intl.NumberFormat('ar-EG').format(stat.value)}
          </p>
          {stat.change && (
            <div className="flex items-center gap-1 mt-2">
              {stat.positive ? (
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className={cn('text-xs font-medium', stat.positive ? 'text-success' : 'text-destructive')}>
                {stat.change}
              </span>
            </div>
          )}
        </div>
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', stat.tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
});

export const StatsWidget = memo(function StatsWidget({ dashboardStats }: StatsWidgetProps) {
  const invoiceTrend = dashboardStats?.invoiceTrend;
  const trendLabel =
    invoiceTrend !== null && invoiceTrend !== undefined
      ? `${invoiceTrend >= 0 ? '+' : ''}${invoiceTrend.toFixed(0)}%`
      : undefined;

  const stats: StatItem[] = [
    { title: 'العملاء', value: dashboardStats?.customersCount || 0, icon: Users, href: '/customers', tone: 'bg-primary/10 text-primary' },
    { title: 'المنتجات', value: dashboardStats?.productsCount || 0, icon: Package, href: '/products', tone: 'bg-success/10 text-success' },
    { title: 'عروض الأسعار', value: dashboardStats?.quotationsCount || 0, icon: FileText, href: '/quotations', tone: 'bg-accent text-accent-foreground' },
    {
      title: 'الفواتير',
      value: dashboardStats?.invoicesCount || 0,
      icon: Receipt,
      href: '/invoices',
      tone: 'bg-warning/10 text-warning',
      change: trendLabel,
      positive: invoiceTrend !== null && invoiceTrend !== undefined ? invoiceTrend >= 0 : true,
    },
  ];

  return (
    <>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">الإحصائيات</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} stat={stat} />
          ))}
        </div>
      </CardContent>
    </>
  );
});
