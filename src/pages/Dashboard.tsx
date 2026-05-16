import React, { forwardRef, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Package, FileText, Receipt, ShoppingCart, ClipboardList, Truck, CreditCard, Briefcase, ListChecks, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WidgetContainer } from '@/components/dashboard/WidgetContainer';
import { MobileDashboard } from '@/components/dashboard/MobileDashboard';
import { useDashboardSettings } from '@/hooks/useDashboardSettings';
import { WidgetConfig } from '@/components/dashboard/DraggableWidget';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/useTenant';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { TodayPerformanceWidget } from '@/components/dashboard/TodayPerformanceWidget';
import { LowStockWidget } from '@/components/dashboard/LowStockWidget';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import { useBusinessInsights } from '@/hooks/useBusinessInsights';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime';
import { FinancialKPIRow } from '@/components/dashboard/FinancialKPIRow';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardErrorBanner } from '@/components/dashboard/DashboardErrorBanner';

// Widget components
import { StatsWidget } from '@/components/dashboard/StatsWidget';
import { QuickActionsWidget } from '@/components/dashboard/QuickActionsWidget';
// SalesChartWidget pulls in `recharts` (~90KB gz). Lazy-load it so it
// doesn't block the dashboard's first paint.
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
  color: string;
  roles: string[];
}

const allQuickActions: QuickAction[] = [
  { title: 'عميل جديد', icon: Users, href: '/customers', color: 'bg-blue-500', roles: ['admin', 'sales'] },
  { title: 'منتج جديد', icon: Package, href: '/products', color: 'bg-green-500', roles: ['admin', 'warehouse'] },
  { title: 'عرض سعر', icon: FileText, href: '/quotations', color: 'bg-purple-500', roles: ['admin', 'sales'] },
  { title: 'فاتورة جديدة', icon: Receipt, href: '/invoices', color: 'bg-orange-500', roles: ['admin', 'sales', 'accountant'] },
  { title: 'أمر بيع', icon: ShoppingCart, href: '/sales-orders', color: 'bg-indigo-500', roles: ['admin', 'sales'] },
  { title: 'أمر شراء', icon: ClipboardList, href: '/purchase-orders', color: 'bg-teal-500', roles: ['admin', 'warehouse'] },
  { title: 'مورد جديد', icon: Truck, href: '/suppliers', color: 'bg-emerald-500', roles: ['admin', 'warehouse'] },
  { title: 'تحصيل جديد', icon: CreditCard, href: '/payments', color: 'bg-cyan-500', roles: ['admin', 'accountant'] },
  { title: 'موظف جديد', icon: Briefcase, href: '/employees', color: 'bg-amber-500', roles: ['admin', 'hr'] },
  { title: 'مهمة جديدة', icon: ListChecks, href: '/tasks', color: 'bg-rose-500', roles: ['admin', 'sales', 'warehouse', 'accountant', 'hr'] },
];

const Dashboard = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Dashboard(props, ref) {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { widgets, updateWidgets, isSaving, isLoading: widgetsLoading } = useDashboardSettings();
  const { currentTenantName } = useTenant();
  const { insights } = useBusinessInsights();
  const {
    dashboardStats,
    isStatsLoading,
    overviewError,
    isOverviewFetching,
    refetchOverview,
    monthlySalesData,
    tasks,
    recentInvoices,
  } = useDashboardData();

  const quickActions = allQuickActions.filter(action =>
    !userRole || action.roles.includes(userRole)
  );

  if (isMobile) {
    return <MobileDashboard />;
  }

  // Only block on auth + widget preferences (needed to render the layout).
  // Stats/chart loading is handled with partial skeletons so the rest of
  // the page (welcome banner, quick actions, tasks, invoices) stays interactive.
  if ((authLoading || widgetsLoading) && !dashboardStats) {
    return <DashboardSkeleton />;
  }

  const statsLoading = isStatsLoading && !dashboardStats;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    return 'مساء الخير';
  };

  const userName = user?.user_metadata?.full_name || 'المستخدم';

  const handleQuickAction = (action: QuickAction) => {
    navigate(action.href + '?action=new');
  };

  const handleWidgetsChange = (newWidgets: WidgetConfig[]) => {
    updateWidgets(newWidgets, {
      onSuccess: () => {
        toast({ title: 'تم حفظ ترتيب لوحة التحكم' });
      },
      onError: () => {
        toast({ title: 'فشل في حفظ الترتيب', variant: 'destructive' });
      },
    });
  };

  const renderWidget = (widget: WidgetConfig) => {
    switch (widget.id) {
      case 'stats':
        if (statsLoading) {
          return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border bg-card p-5 space-y-3">
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
        return <StatsWidget dashboardStats={dashboardStats} />;
      case 'quick_actions':
        return <QuickActionsWidget quickActions={quickActions} onAction={handleQuickAction} />;
      case 'chart':
        if (statsLoading) {
          return <div className="h-[260px] bg-muted/30 rounded-md animate-pulse" aria-busy="true" />;
        }
        return (
          <Suspense fallback={<div className="h-[260px] bg-muted/30 rounded-md animate-pulse" />}>
            <SalesChartWidget data={monthlySalesData} />
          </Suspense>
        );
      case 'tasks':
        return <TasksWidget tasks={tasks} />;
      case 'activities':
        return <RecentInvoicesWidget invoices={recentInvoices} />;
      case 'today_performance':
        return <TodayPerformanceWidget />;
      case 'low_stock':
        return <LowStockWidget />;
      case 'calendar':
        return <CalendarWidget />;
      case 'insights':
        return <InsightsWidget insights={insights} />;
      default:
        return null;
    }
  };

  return (
    <div ref={ref} className="space-y-6 animate-fade-in" {...props}>
      <WelcomeBanner />

      {overviewError && (
        <DashboardErrorBanner
          error={overviewError}
          onRetry={() => refetchOverview()}
          isRetrying={isOverviewFetching}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {greeting()}، {userName} 👋
          </h1>
          <div className="text-muted-foreground mt-1 flex items-center gap-2">
            <span>مرحباً بك في لوحة التحكم</span>
            {currentTenantName && (
              <Badge variant="outline" className="gap-1">
                <Building2 className="h-3 w-3" />
                {currentTenantName}
              </Badge>
            )}
            {userRole && (
              <Badge variant="secondary">
                {roleLabels[userRole]}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {quickActions.slice(0, 2).map((action) => (
            <Button
              key={action.href}
              onClick={() => handleQuickAction(action)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {action.title}
            </Button>
          ))}
        </div>
      </div>

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
