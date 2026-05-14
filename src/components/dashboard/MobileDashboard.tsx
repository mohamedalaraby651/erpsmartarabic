import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  Users,
  Package,
  FileText,
  Receipt,
  ArrowLeft,
  Clock,
  CheckCircle2,
  UserPlus,
  ShoppingCart,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { ShimmerSkeleton } from '@/components/shared/ShimmerSkeleton';
import { DashboardErrorBanner } from '@/components/dashboard/DashboardErrorBanner';
import { useBusinessInsights, type BusinessInsight } from '@/hooks/useBusinessInsights';

const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  sales: 'موظف مبيعات',
  warehouse: 'أمين مخزن',
  accountant: 'محاسب',
  hr: 'موارد بشرية',
};

interface QuickActionItem {
  title: string;
  icon: React.ElementType;
  href: string;
  color: string;
  roles: string[];
}

const quickActions: QuickActionItem[] = [
  { title: 'عميل جديد', icon: UserPlus, href: '/customers?action=new', color: 'bg-primary', roles: ['admin', 'sales'] },
  { title: 'فاتورة', icon: Receipt, href: '/invoices?action=new', color: 'bg-green-500', roles: ['admin', 'sales', 'accountant'] },
  { title: 'عرض سعر', icon: FileText, href: '/quotations?action=new', color: 'bg-blue-500', roles: ['admin', 'sales'] },
  { title: 'أمر بيع', icon: ShoppingCart, href: '/sales-orders?action=new', color: 'bg-orange-500', roles: ['admin', 'sales'] },
];

export const MobileDashboard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { insights, hasAlerts } = useBusinessInsights();

  // Filter quick actions based on role
  const filteredActions = quickActions.filter(action => 
    !userRole || action.roles.includes(userRole)
  );

  // Reuse the shared dashboard data hook so mobile + desktop share the same
  // React Query cache (eliminates duplicate count(*) queries on viewport
  // switches). Tasks/invoices are sliced down for mobile.
  const queryClient = useQueryClient();
  const { dashboardStats, isStatsLoading, tasks: allTasks, recentInvoices: allInvoices } = useDashboardData();
  const stats = dashboardStats
    ? {
        customers: dashboardStats.customersCount,
        products: dashboardStats.productsCount,
        invoices: dashboardStats.invoicesCount,
        quotations: dashboardStats.quotationsCount,
      }
    : undefined;
  const statsLoading = isStatsLoading;
  const tasks = (allTasks ?? []).slice(0, 3);
  const tasksLoading = !allTasks;
  const recentInvoices = (allInvoices ?? []).slice(0, 3);
  const invoicesLoading = !allInvoices;

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-recent-invoices'] }),
    ]);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    return 'مساء الخير';
  };

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'المستخدم';

  const statItems = [
    { title: 'العملاء', value: stats?.customers || 0, icon: Users, color: 'text-primary' },
    { title: 'المنتجات', value: stats?.products || 0, icon: Package, color: 'text-green-500' },
    { title: 'الفواتير', value: stats?.invoices || 0, icon: Receipt, color: 'text-orange-500' },
    { title: 'عروض الأسعار', value: stats?.quotations || 0, icon: FileText, color: 'text-blue-500' },
  ];

  // Show full skeleton on initial load
  if (authLoading) {
    return (
      <div className="space-y-3 pb-14 animate-fade-in">
        {/* Header skeleton */}
        <div className="px-1">
          <ShimmerSkeleton variant="text" className="h-6 w-40 mb-1.5" />
          <ShimmerSkeleton variant="rounded" className="h-5 w-24" />
        </div>
        
        {/* Stats shimmer - horizontal scroll */}
        <div className="flex gap-2.5 pb-2 px-1 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <ShimmerSkeleton key={i} variant="card" className="min-w-[120px] h-[72px] shrink-0" />
          ))}
        </div>
        
        {/* Quick actions shimmer */}
        <div className="grid grid-cols-4 gap-2 px-1">
          {[1, 2, 3, 4].map((i) => (
            <ShimmerSkeleton key={i} variant="rounded" className="h-[68px]" />
          ))}
        </div>
        
        {/* Section shimmer */}
        <div className="px-1 space-y-2.5">
          <ShimmerSkeleton variant="text" className="h-5 w-24" />
          <ShimmerSkeleton variant="card" className="h-44" />
        </div>
        
        <div className="px-1 space-y-2.5">
          <ShimmerSkeleton variant="text" className="h-5 w-28" />
          <ShimmerSkeleton variant="card" className="h-44" />
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-3 pb-14 animate-fade-in">
        {/* Welcome Header */}
        <div className="px-1">
          <h1 className="text-xl font-bold">
            {greeting()}، {userName} 👋
          </h1>
          {userRole && (
            <Badge variant="secondary" className="mt-1">
              {roleLabels[userRole]}
            </Badge>
          )}
        </div>

        {/* Stats - Horizontal Scroll */}
        {statsLoading ? (
          <div className="flex gap-2.5 pb-2 px-1 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <ShimmerSkeleton key={i} variant="card" className="min-w-[120px] h-[72px] shrink-0" />
            ))}
          </div>
        ) : (
          <ScrollArea className="w-full">
            <div className="flex gap-2.5 pb-2 px-1">
              {statItems.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.title} className="min-w-[120px] shrink-0 shadow-sm">
                    <CardContent className="p-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-lg font-bold">{stat.value}</p>
                          <p className="text-[10px] text-muted-foreground">{stat.title}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        {/* Quick Actions - Grid */}
        <div className="grid grid-cols-4 gap-1.5 px-1">
          {filteredActions.slice(0, 4).map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.title}
                variant="outline"
                className="h-auto py-2.5 px-1.5 flex-col gap-1 text-[10px] shadow-sm active:scale-95 transition-transform"
                onClick={() => navigate(action.href)}
              >
                <div className={`h-8 w-8 rounded-lg ${action.color} flex items-center justify-center`}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-medium truncate w-full text-center">{action.title}</span>
              </Button>
            );
          })}
        </div>

        {/* Smart Insights */}
        {hasAlerts && (
          <div className="space-y-1.5 px-1">
            {insights.slice(0, 3).map((insight) => {
              const iconMap: Record<string, React.ElementType> = { error: AlertCircle, warning: AlertTriangle, info: Info, success: CheckCircle2 };
              const colorMap: Record<string, string> = {
                error: 'border-destructive/30 bg-destructive/5',
                warning: 'border-warning/30 bg-warning/5',
                info: 'border-info/30 bg-info/5',
                success: 'border-success/30 bg-success/5',
              };
              const Icon = iconMap[insight.severity] || Info;
              return (
                <Card
                  key={insight.id}
                  className={`shadow-sm ${colorMap[insight.severity]} active:opacity-80`}
                  onClick={() => insight.action && navigate(insight.action.href)}
                >
                  <CardContent className="p-2.5 flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{insight.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{insight.message}</p>
                    </div>
                    {insight.count && <Badge variant="secondary" className="text-[10px] h-5">{insight.count}</Badge>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tasks Card */}
        <Card className="mx-1 shadow-sm">
          <CardHeader className="pb-1.5 flex flex-row items-center justify-between py-2.5 px-3">
            <CardTitle className="text-sm">المهام</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => navigate('/tasks')}>
              <span className="text-[10px]">عرض الكل</span>
              <ArrowLeft className="mr-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0 pb-2.5 px-3">
            {tasksLoading ? (
              <div className="space-y-1.5">
                {[1, 2, 3].map((i) => (
                  <ShimmerSkeleton key={i} variant="rounded" className="h-12" />
                ))}
              </div>
            ) : tasks && tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map((task: { id: string; title: string; priority?: string; due_date?: string | null }) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 active:bg-muted transition-colors"
                    onClick={() => navigate('/tasks')}
                  >
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      task.priority === 'high' ? 'bg-destructive' :
                      task.priority === 'medium' ? 'bg-orange-500' : 'bg-green-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString('ar-EG')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-1 text-green-500" />
                <p className="text-sm text-muted-foreground">لا توجد مهام معلقة</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices Card */}
        <Card className="mx-1 shadow-sm">
          <CardHeader className="pb-1.5 flex flex-row items-center justify-between py-2.5 px-3">
            <CardTitle className="text-sm">آخر الفواتير</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => navigate('/invoices')}>
              <span className="text-[10px]">عرض الكل</span>
              <ArrowLeft className="mr-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0 pb-2.5 px-3">
            {invoicesLoading ? (
              <div className="space-y-1.5">
                {[1, 2, 3].map((i) => (
                  <ShimmerSkeleton key={i} variant="rounded" className="h-14" />
                ))}
              </div>
            ) : recentInvoices && recentInvoices.length > 0 ? (
              <div className="space-y-2">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 active:bg-muted transition-colors"
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Receipt className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {(invoice as { customers?: { name: string } | null }).customers?.name || 'عميل'}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">{invoice.total_amount.toLocaleString()}</p>
                      <Badge
                        variant={
                          invoice.payment_status === 'paid' ? 'default' :
                          invoice.payment_status === 'partial' ? 'secondary' : 'destructive'
                        }
                        className="text-[10px] px-1.5"
                      >
                        {invoice.payment_status === 'paid' ? 'مدفوع' :
                         invoice.payment_status === 'partial' ? 'جزئي' : 'معلق'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Receipt className="h-8 w-8 mx-auto mb-1 opacity-50" />
                <p className="text-sm text-muted-foreground">لا توجد فواتير بعد</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PullToRefresh>
  );
});

MobileDashboard.displayName = 'MobileDashboard';
