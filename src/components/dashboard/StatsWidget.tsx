import React, { memo } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, FileText, Receipt, TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { DashboardStats } from '@/hooks/useDashboardData';
import { DashboardChip, type ChipTone } from './_shared/DashboardChip';

interface StatsWidgetProps {
  dashboardStats: DashboardStats | undefined;
}

interface StatItem {
  title: string;
  value: number;
  icon: LucideIcon;
  href: string;
  tone: string;
  chipTone: ChipTone;
  change?: string;
  positive?: boolean;
  trend?: number | null;
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
        'transition-all active:scale-[0.98] md:hover:shadow-md md:hover:-translate-y-0.5',
        'focus:outline-none focus:ring-2 focus:ring-primary/40'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground truncate leading-tight">{stat.title}</p>
          <p className="text-3xl font-bold mt-1 tabular-nums leading-none">
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
    { title: 'العملاء', value: dashboardStats?.customersCount || 0, icon: Users, href: '/customers', tone: 'bg-primary/10 text-primary', chipTone: 'primary' },
    { title: 'المنتجات', value: dashboardStats?.productsCount || 0, icon: Package, href: '/products', tone: 'bg-success/10 text-success', chipTone: 'success' },
    { title: 'عروض الأسعار', value: dashboardStats?.quotationsCount || 0, icon: FileText, href: '/quotations', tone: 'bg-accent text-accent-foreground', chipTone: 'info' },
    {
      title: 'الفواتير',
      value: dashboardStats?.invoicesCount || 0,
      icon: Receipt,
      href: '/invoices',
      tone: 'bg-warning/10 text-warning',
      chipTone: 'warning',
      change: trendLabel,
      positive: invoiceTrend !== null && invoiceTrend !== undefined ? invoiceTrend >= 0 : true,
      trend: invoiceTrend ?? null,
    },
  ];

  return (
    <>
      {/* Mobile: chip strip (matches CustomerStatsBar) */}
      <div className="sm:hidden px-3 pt-2.5 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-base font-bold">الإحصائيات</h3>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3">
          {stats.map((s) => (
            <DashboardChip
              key={s.title}
              label={s.title}
              value={new Intl.NumberFormat('ar-EG').format(s.value)}
              icon={s.icon}
              tone={s.chipTone}
              href={s.href}
              trend={s.trend}
            />
          ))}
        </div>
      </div>

      {/* Desktop: original grid */}
      <div className="hidden sm:block">
        <CardHeader className="pb-1.5 px-6 pt-6">
          <CardTitle className="text-lg">الإحصائيات</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <StatCard key={stat.title} stat={stat} />
            ))}
          </div>
        </CardContent>
      </div>
    </>
  );
});
