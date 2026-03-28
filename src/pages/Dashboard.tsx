import React, { forwardRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Package,
  FileText,
  Receipt,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShoppingCart,
  ClipboardList,
  Truck,
  CreditCard,
  Briefcase,
  ListChecks,
   Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
import { useBusinessInsights, type BusinessInsight } from '@/hooks/useBusinessInsights';
import { AlertTriangle, AlertCircle, Info as InfoIcon, CheckCircle } from 'lucide-react';

// Insight severity icon mapping
const insightIcons: Record<string, React.ElementType> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: InfoIcon,
  success: CheckCircle,
};

const insightColors: Record<string, string> = {
  error: 'border-destructive/30 bg-destructive/5 text-destructive',
  warning: 'border-warning/30 bg-warning/5 text-warning',
  info: 'border-info/30 bg-info/5 text-info',
  success: 'border-success/30 bg-success/5 text-success',
};

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
   const { currentTenantName, tenant } = useTenant();
  const { insights, hasAlerts } = useBusinessInsights();

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Batch fetch all counts + previous period for trends
  const { data: dashboardStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();

      const [customersRes, productsRes, invoicesRes, quotationsRes, prevInvoicesRes, prevQuotationsRes] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
        supabase.from('quotations').select('*', { count: 'exact', head: true }),
        // Current period invoices (last 30 days)
        supabase.from('invoices').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
        // Previous period invoices (30-60 days ago)
        supabase.from('invoices').select('*', { count: 'exact', head: true }).gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
      ]);

      const currentPeriodInvoices = prevInvoicesRes.count || 0;
      const previousPeriodInvoices = prevQuotationsRes.count || 0;
      const invoiceTrend = previousPeriodInvoices > 0
        ? ((currentPeriodInvoices - previousPeriodInvoices) / previousPeriodInvoices * 100)
        : null;

      return {
        customersCount: customersRes.count || 0,
        productsCount: productsRes.count || 0,
        invoicesCount: invoicesRes.count || 0,
        quotationsCount: quotationsRes.count || 0,
        invoiceTrend,
      };
    },
    staleTime: 300000,
    gcTime: 600000,
  });

  // Monthly sales data for chart (real data)
  const { data: monthlySalesData } = useQuery({
    queryKey: ['dashboard-monthly-sales'],
    queryFn: async () => {
      const months: { name: string; start: string; end: string }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        months.push({ name: monthNames[start.getMonth()], start: start.toISOString(), end: end.toISOString() });
      }
      const { data } = await supabase
        .from('invoices')
        .select('total_amount, created_at')
        .gte('created_at', months[0].start)
        .lte('created_at', months[months.length - 1].end);

      return months.map(m => {
        const sales = data?.filter(inv => inv.created_at >= m.start && inv.created_at <= m.end)
          .reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
        return { name: m.name, sales };
      });
    },
    staleTime: 300000,
  });

  const { data: tasks } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_completed', false)
        .order('due_date', { ascending: true })
        .limit(5);
      return data || [];
    },
    staleTime: 15000, // 15 seconds
  });

  const { data: recentInvoices } = useQuery({
    queryKey: ['dashboard-recent-invoices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    staleTime: 15000, // 15 seconds
  });

  // Filter quick actions based on user role
  const quickActions = allQuickActions.filter(action => 
    !userRole || action.roles.includes(userRole)
  );

  // Use mobile dashboard for mobile devices
  if (isMobile) {
    return <MobileDashboard />;
  }

  // Show loading state for desktop
  if (authLoading || widgetsLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="h-10 w-64 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء الخير';
  };

  const userName = user?.user_metadata?.full_name || 'المستخدم';

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

  const handleQuickAction = (action: QuickAction) => {
    navigate(action.href, { state: { openNew: true } });
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

      case 'quick_actions':
        return (
          <>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">الإجراءات السريعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.href + action.title}
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 hover:bg-accent"
                      onClick={() => handleQuickAction(action)}
                    >
                      <div className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-sm font-medium">{action.title}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </>
        );

      case 'chart':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-lg">المبيعات الشهرية</CardTitle>
              <CardDescription>إجمالي المبيعات خلال الأشهر الماضية</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlySalesData || []}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorSales)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </>
        );

      case 'tasks':
        return (
          <>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">المهام</CardTitle>
                <CardDescription>المهام المطلوب إنجازها</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
                عرض الكل
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {tasks && tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className={`h-2 w-2 rounded-full ${
                        task.priority === 'high' ? 'bg-destructive' :
                        task.priority === 'medium' ? 'bg-warning' : 'bg-success'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString('ar-EG')}
                          </p>
                        )}
                      </div>
                      <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                        {task.priority === 'high' ? 'عاجل' : task.priority === 'medium' ? 'متوسط' : 'منخفض'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-success" />
                  <p>لا توجد مهام معلقة</p>
                </div>
              )}
            </CardContent>
          </>
        );

      case 'activities':
        return (
          <>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">آخر الفواتير</CardTitle>
                <CardDescription>أحدث الفواتير المصدرة</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
                عرض الكل
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentInvoices && recentInvoices.length > 0 ? (
                <div className="space-y-2">
                  {recentInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Receipt className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{invoice.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {(invoice.customers as any)?.name || 'عميل'}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm">{invoice.total_amount.toLocaleString()} ج.م</p>
                        <Badge
                          variant={
                            invoice.payment_status === 'paid' ? 'default' :
                            invoice.payment_status === 'partial' ? 'secondary' : 'destructive'
                          }
                          className="text-xs"
                        >
                          {invoice.payment_status === 'paid' ? 'مدفوع' :
                           invoice.payment_status === 'partial' ? 'جزئي' : 'معلق'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>لا توجد فواتير بعد</p>
                </div>
              )}
            </CardContent>
          </>
        );

      case 'today_performance':
        return <TodayPerformanceWidget />;

      case 'low_stock':
        return <LowStockWidget />;

      case 'calendar':
        return <CalendarWidget />;

      case 'insights':
        return (
          <>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">تنبيهات ذكية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.slice(0, 5).map((insight) => {
                  const Icon = insightIcons[insight.severity] || InfoIcon;
                  return (
                    <div
                      key={insight.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:opacity-80 ${insightColors[insight.severity]}`}
                      onClick={() => insight.action && navigate(insight.action.href)}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{insight.title}</p>
                        <p className="text-xs opacity-80">{insight.message}</p>
                      </div>
                      {insight.count && (
                        <Badge variant="secondary" className="shrink-0">{insight.count}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div ref={ref} className="space-y-6 animate-fade-in" {...props}>
       {/* Welcome Banner */}
       <WelcomeBanner />
 
      {/* Welcome Section */}
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

      {/* Customizable Widgets */}
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
