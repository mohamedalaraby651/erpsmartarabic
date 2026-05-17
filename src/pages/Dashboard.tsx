import React, { forwardRef, lazy, Suspense, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Users, Package, FileText, Receipt, ShoppingCart,
  ClipboardList, Truck, CreditCard, Briefcase, ListChecks, Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WidgetContainer } from '@/components/dashboard/WidgetContainer';
import { useDashboardSettings } from '@/hooks/useDashboardSettings';
import { WidgetConfig } from '@/components/dashboard/DraggableWidget';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/useTenant';
import { LowStockWidget } from '@/components/dashboard/LowStockWidget';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
const TodayPerformanceWidget = lazyWithRetry(() =>
  import('@/components/dashboard/TodayPerformanceWidget').then(m => ({ default: m.TodayPerformanceWidget }))
);
const CalendarWidget = lazyWithRetry(() =>
  import('@/components/dashboard/CalendarWidget').then(m => ({ default: m.CalendarWidget }))
);
import { useBusinessInsights } from '@/hooks/useBusinessInsights';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime';
import { FinancialKPIRow } from '@/components/dashboard/FinancialKPIRow';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardErrorBanner } from '@/components/dashboard/DashboardErrorBanner';
import { AlertsBell } from '@/components/dashboard/AlertsBell';
import { WidgetErrorBoundary } from '@/components/dashboard/WidgetErrorBoundary';

import { StatsWidget } from '@/components/dashboard/StatsWidget';
import { QuickActionsWidget } from '@/components/dashboard/QuickActionsWidget';
const SalesChartWidget = lazy(() =>
  import('@/components/dashboard/SalesChartWidget').then(m => ({ default: m.SalesChartWidget }))
);
import { TasksWidget } from '@/components/dashboard/TasksWidget';
import { RecentInvoicesWidget } from '@/components/dashboard/RecentInvoicesWidget';
import { InsightsWidget } from '@/components/dashboard/InsightsWidget';

const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  sales: 'موظف مبيعات',
  warehouse: 'أمين مخزن',
  accountant: 'محاسب',
  hr: 'موارد بشرية',
};

interface QuickAction {
  title: string;
  icon: React.ElementType;
  href: string;
  tone: string;
  roles: string[];
}

// Semantic tone classes — uses design tokens, not raw Tailwind colors.
const allQuickActions: QuickAction[] = [
  { title: 'عميل جديد', icon: Users, href: '/customers', tone: 'bg-primary/10 text-primary', roles: ['admin', 'sales'] },
  { title: 'منتج جديد', icon: Package, href: '/products', tone: 'bg-success/10 text-success', roles: ['admin', 'warehouse'] },
  { title: 'عرض سعر', icon: FileText, href: '/quotations', tone: 'bg-accent text-accent-foreground', roles: ['admin', 'sales'] },
  { title: 'فاتورة جديدة', icon: Receipt, href: '/invoices', tone: 'bg-warning/10 text-warning', roles: ['admin', 'sales', 'accountant'] },
  { title: 'أمر بيع', icon: ShoppingCart, href: '/sales-orders', tone: 'bg-primary/10 text-primary', roles: ['admin', 'sales'] },
  { title: 'أمر شراء', icon: ClipboardList, href: '/purchase-orders', tone: 'bg-success/10 text-success', roles: ['admin', 'warehouse'] },
  { title: 'مورد جديد', icon: Truck, href: '/suppliers', tone: 'bg-success/10 text-success', roles: ['admin', 'warehouse'] },
  { title: 'تحصيل جديد', icon: CreditCard, href: '/payments', tone: 'bg-primary/10 text-primary', roles: ['admin', 'accountant'] },
  { title: 'موظف جديد', icon: Briefcase, href: '/employees', tone: 'bg-warning/10 text-warning', roles: ['admin', 'hr'] },
  { title: 'مهمة جديدة', icon: ListChecks, href: '/tasks', tone: 'bg-destructive/10 text-destructive', roles: ['admin', 'sales', 'warehouse', 'accountant', 'hr'] },
];

const greetingText = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'صباح الخير';
  if (hour < 18) return 'مساء الخير';
  return 'مساء النور';
};

const Dashboard = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Dashboard(props, ref) {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { widgets, updateWidgets, isSaving, isLoading: widgetsLoading } = useDashboardSettings();
  const { currentTenantName, tenantId } = useTenant();
  const { insights } = useBusinessInsights();
  const {
    dashboardStats,
    financialKPIs,
    isStatsLoading,
    overviewError,
    isOverviewFetching,
    refetchOverview,
    monthlySalesData,
    tasks,
    recentInvoices,
  } = useDashboardData();

  useDashboardRealtime(tenantId);

  const quickActions = useMemo(
    () => allQuickActions.filter(a => !userRole || a.roles.includes(userRole)),
    [userRole],
  );

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      navigate(action.href + '?action=new');
    },
    [navigate],
  );

  const handleWidgetsChange = useCallback(
    (newWidgets: WidgetConfig[]) => {
      updateWidgets(newWidgets, {
        onSuccess: () => toast({ title: 'تم حفظ ترتيب لوحة التحكم' }),
        onError: () => toast({ title: 'فشل في حفظ الترتيب', variant: 'destructive' }),
      });
    },
    [updateWidgets, toast],
  );

  const handleRetry = useCallback(() => refetchOverview(), [refetchOverview]);

  const statsLoading = isStatsLoading && !dashboardStats;
  const userName = user?.user_metadata?.full_name || 'المستخدم';

  // Shimmer skeleton with a fixed min-height matching the loaded widget,
  // so there's NO layout shift when data arrives. Heights are tuned per
  // widget across breakpoints (mobile / tablet / desktop).
  const skeleton = (cls: string) => (
    <div
      aria-busy="true"
      className={cn(
        'rounded-lg bg-gradient-to-l from-muted/40 via-muted/60 to-muted/40 bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite]',
        cls,
      )}
    />
  );

  const renderWidget = useCallback((widget: WidgetConfig) => {
    const wrap = (node: React.ReactNode) => (
      <WidgetErrorBoundary name={widget.id}>{node}</WidgetErrorBoundary>
    );
    switch (widget.id) {
      case 'stats':
        if (statsLoading) {
          return wrap(
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 min-h-[372px] sm:min-h-[184px] lg:min-h-[124px]" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border bg-card p-5 space-y-3 h-[124px]">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                  </div>
                  <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          );
        }
        return wrap(<StatsWidget dashboardStats={dashboardStats} />);
      case 'quick_actions':
        return wrap(<QuickActionsWidget quickActions={quickActions} onAction={handleQuickAction} />);
      case 'chart':
        if (statsLoading) {
          return wrap(skeleton('h-[280px] sm:h-[320px] lg:h-[340px]'));
        }
        return wrap(
          <Suspense fallback={skeleton('h-[280px] sm:h-[320px] lg:h-[340px]')}>
            <SalesChartWidget data={monthlySalesData} />
          </Suspense>
        );
      case 'tasks':
        return wrap(<TasksWidget tasks={tasks} />);
      case 'activities':
        return wrap(<RecentInvoicesWidget invoices={recentInvoices} />);
      case 'today_performance':
        return wrap(
          <Suspense fallback={skeleton('h-[240px] sm:h-[220px] lg:h-[220px]')}>
            <TodayPerformanceWidget />
          </Suspense>
        );
      case 'low_stock':
        return wrap(<LowStockWidget />);
      case 'calendar':
        return wrap(
          <Suspense fallback={skeleton('h-[300px] sm:h-[340px] lg:h-[360px]')}>
            <CalendarWidget />
          </Suspense>
        );
      case 'insights':
        return wrap(<InsightsWidget insights={insights} />);
      default:
        return null;
    }
  }, [statsLoading, dashboardStats, quickActions, handleQuickAction, monthlySalesData, tasks, recentInvoices, insights]);

  // Block initial render only until auth + widget prefs are ready.
  if ((authLoading || widgetsLoading) && !dashboardStats) {
    return <DashboardSkeleton />;
  }

  return (
    <div ref={ref} className="space-y-5 sm:space-y-6 animate-fade-in" {...props}>
      {/* Unified responsive hero */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-l from-primary/10 via-accent/30 to-transparent p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4 sm:flex-row sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold truncate">
              {greetingText()}، {userName} 👋
            </h1>
            <div className="text-muted-foreground mt-1 sm:mt-1.5 flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <span className="hidden sm:inline">مرحباً بك في لوحة التحكم</span>
              {currentTenantName && (
                <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate max-w-[120px] sm:max-w-none">{currentTenantName}</span>
                </Badge>
              )}
              {userRole && (
                <Badge variant="secondary" className="text-[10px] sm:text-xs">
                  {roleLabels[userRole]}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AlertsBell insights={insights} />
            {quickActions.slice(0, 1).map((action) => (
              <Button
                key={action.href}
                onClick={() => handleQuickAction(action)}
                size="icon"
                className="sm:hidden h-10 w-10"
                aria-label={action.title}
              >
                <Plus className="h-4 w-4" />
              </Button>
            ))}
            <div className="hidden sm:flex items-center gap-2">
              {quickActions.slice(0, 2).map((action) => (
                <Button
                  key={action.href}
                  onClick={() => handleQuickAction(action)}
                  className="gap-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>{action.title}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {overviewError && (
        <DashboardErrorBanner
          error={overviewError}
          onRetry={handleRetry}
          isRetrying={isOverviewFetching}
        />
      )}

      <FinancialKPIRow data={financialKPIs} isLoading={statsLoading} />

      <WidgetContainer
        widgets={widgets}
        onWidgetsChange={handleWidgetsChange}
        renderWidget={renderWidget}
        isSaving={isSaving}
      />
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
