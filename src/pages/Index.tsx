import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardSettings } from '@/hooks/useDashboardSettings';
import { WidgetContainer } from '@/components/dashboard/WidgetContainer';
import { WidgetConfig } from '@/components/dashboard/DraggableWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Package, 
  Receipt, 
  TrendingUp,
  FileText,
  ShoppingCart,
  ClipboardList,
  Plus,
  AlertTriangle,
  CreditCard,
  Truck,
  CheckSquare,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { widgets, updateWidgets, isSaving } = useDashboardSettings();

  // Stats queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [customers, products, invoices, salesOrders] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('id, total_amount', { count: 'exact' }),
        supabase.from('sales_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      const totalSales = invoices.data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

      return {
        customers: customers.count || 0,
        products: products.count || 0,
        invoices: invoices.count || 0,
        pendingOrders: salesOrders.count || 0,
        totalSales,
      };
    },
    enabled: !!user,
  });

  // Tasks query
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
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
    enabled: !!user,
  });

  // Activity logs query
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  // Chart data (monthly invoices)
  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['dashboard-chart'],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data } = await supabase
        .from('invoices')
        .select('created_at, total_amount')
        .gte('created_at', sixMonthsAgo.toISOString());

      // Group by month
      const monthlyData: Record<string, number> = {};
      data?.forEach((invoice) => {
        const month = format(new Date(invoice.created_at), 'MMM', { locale: ar });
        monthlyData[month] = (monthlyData[month] || 0) + (invoice.total_amount || 0);
      });

      return Object.entries(monthlyData).map(([month, total]) => ({
        month,
        total,
      }));
    },
    enabled: !!user,
  });

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    await supabase.from('tasks').update({ is_completed: !isCompleted }).eq('id', taskId);
    refetchTasks();
  };

  const quickActions = [
    { label: 'عميل جديد', icon: Users, href: '/customers', color: 'text-blue-600' },
    { label: 'فاتورة جديدة', icon: Receipt, href: '/invoices', color: 'text-green-600' },
    { label: 'منتج جديد', icon: Package, href: '/products', color: 'text-purple-600' },
    { label: 'عرض سعر', icon: FileText, href: '/quotations', color: 'text-orange-600' },
    { label: 'أمر بيع', icon: ShoppingCart, href: '/sales-orders', color: 'text-cyan-600' },
    { label: 'أمر شراء', icon: ClipboardList, href: '/purchase-orders', color: 'text-pink-600' },
  ];

  const renderWidget = (widget: WidgetConfig) => {
    switch (widget.id) {
      case 'stats':
        return (
          <CardContent className="p-4">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                الإحصائيات السريعة
              </CardTitle>
            </CardHeader>
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-blue-500/10 text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold">{stats?.customers || 0}</p>
                  <p className="text-sm text-muted-foreground">العملاء</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-500/10 text-center">
                  <Package className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                  <p className="text-2xl font-bold">{stats?.products || 0}</p>
                  <p className="text-sm text-muted-foreground">المنتجات</p>
                </div>
                <div className="p-4 rounded-lg bg-green-500/10 text-center">
                  <Receipt className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold">{stats?.invoices || 0}</p>
                  <p className="text-sm text-muted-foreground">الفواتير</p>
                </div>
                <div className="p-4 rounded-lg bg-orange-500/10 text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                  <p className="text-2xl font-bold">{stats?.totalSales?.toLocaleString() || 0}</p>
                  <p className="text-sm text-muted-foreground">إجمالي المبيعات</p>
                </div>
              </div>
            )}
          </CardContent>
        );

      case 'quick_actions':
        return (
          <CardContent className="p-4">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                الإجراءات السريعة
              </CardTitle>
            </CardHeader>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="flex-col h-auto py-4 gap-2"
                  onClick={() => navigate(action.href)}
                >
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        );

      case 'chart':
        return (
          <CardContent className="p-4">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                المبيعات الشهرية
              </CardTitle>
            </CardHeader>
            {chartLoading ? (
              <Skeleton className="h-[200px]" />
            ) : chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                لا توجد بيانات لعرضها
              </div>
            )}
          </CardContent>
        );

      case 'tasks':
        return (
          <CardContent className="p-4">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg flex items-center gap-2 justify-between">
                <span className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  المهام
                </span>
                <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
                  عرض الكل
                </Button>
              </CardTitle>
            </CardHeader>
            {tasksLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : tasks && tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={() => handleToggleTask(task.id, task.is_completed || false)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(task.due_date), 'dd MMM', { locale: ar })}
                        </p>
                      )}
                    </div>
                    {task.priority && (
                      <Badge
                        variant={
                          task.priority === 'high' ? 'destructive' :
                          task.priority === 'medium' ? 'default' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {task.priority === 'high' ? 'عاجل' : task.priority === 'medium' ? 'متوسط' : 'منخفض'}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                لا توجد مهام معلقة
              </div>
            )}
          </CardContent>
        );

      case 'activities':
        return (
          <CardContent className="p-4">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                آخر الأنشطة
              </CardTitle>
            </CardHeader>
            {activitiesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {activity.action === 'create' && <Plus className="h-4 w-4 text-green-600" />}
                      {activity.action === 'update' && <TrendingUp className="h-4 w-4 text-blue-600" />}
                      {activity.action === 'delete' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {activity.action === 'create' ? 'إنشاء' : activity.action === 'update' ? 'تعديل' : 'حذف'}{' '}
                        {activity.entity_name || activity.entity_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.created_at), 'dd MMM HH:mm', { locale: ar })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                لا توجد أنشطة حديثة
              </div>
            )}
          </CardContent>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">لوحة التحكم</h1>
           <p className="text-muted-foreground">مرحباً بك في نظرة - نظام إدارة الأعمال</p>
        </div>
      </div>

      <WidgetContainer
        widgets={widgets}
        onWidgetsChange={updateWidgets}
        renderWidget={renderWidget}
        isSaving={isSaving}
      />
    </div>
  );
};

export default Index;
