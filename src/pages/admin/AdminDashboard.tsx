import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Shield,
  Settings,
  Lock,
  Activity,
  DollarSign,
  Download,
  Database,
  AlertTriangle,
  Package,
  Receipt,
  Clock,
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id');
      if (error) throw error;
      
      const { data: roles } = await supabase
        .from('custom_roles')
        .select('id')
        .eq('is_active', true);
      
      return {
        totalUsers: profiles?.length || 0,
        activeRoles: roles?.length || 0,
      };
    },
  });

  // Fetch activity logs
  const { data: recentActivities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['admin-recent-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Fetch system alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ['admin-system-alerts'],
    queryFn: async () => {
      const alertsList: { type: string; message: string; count: number }[] = [];
      
      // Low stock products
      const { data: lowStock } = await supabase
        .from('products')
        .select('id, name, min_stock')
        .eq('is_active', true);
      
      const { data: stockData } = await supabase
        .from('product_stock')
        .select('product_id, quantity');
      
      const lowStockCount = lowStock?.filter(product => {
        const totalStock = stockData
          ?.filter(s => s.product_id === product.id)
          .reduce((sum, s) => sum + s.quantity, 0) || 0;
        return totalStock < (product.min_stock || 0);
      }).length || 0;
      
      if (lowStockCount > 0) {
        alertsList.push({
          type: 'warning',
          message: 'منتجات منخفضة المخزون',
          count: lowStockCount,
        });
      }
      
      // Overdue invoices
      const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('payment_status', 'pending')
        .lt('due_date', new Date().toISOString().split('T')[0]);
      
      if (overdueInvoices && overdueInvoices.length > 0) {
        alertsList.push({
          type: 'error',
          message: 'فواتير متأخرة',
          count: overdueInvoices.length,
        });
      }
      
      return alertsList;
    },
  });

  // Quick access sections
  const adminSections = [
    { title: 'إدارة الأدوار', icon: Lock, href: '/admin/roles', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { title: 'إدارة الصلاحيات', icon: Shield, href: '/admin/permissions', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { title: 'تخصيص الأقسام', icon: Settings, href: '/admin/customizations', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
    { title: 'إدارة المستخدمين', icon: Users, href: '/admin/users', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { title: 'سجل النشاطات', icon: Activity, href: '/admin/activity-log', color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
    { title: 'الحدود المالية', icon: DollarSign, href: '/admin/role-limits', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    { title: 'قوالب التصدير', icon: Download, href: '/admin/export-templates', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
    { title: 'النسخ الاحتياطي', icon: Database, href: '/admin/backup', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  ];

  const actionLabels: Record<string, string> = {
    create: 'إنشاء',
    update: 'تعديل',
    delete: 'حذف',
    login: 'تسجيل دخول',
    logout: 'تسجيل خروج',
    export: 'تصدير',
  };

  const entityLabels: Record<string, string> = {
    customer: 'عميل',
    invoice: 'فاتورة',
    product: 'منتج',
    supplier: 'مورد',
    quotation: 'عرض سعر',
    sales_order: 'أمر بيع',
    purchase_order: 'أمر شراء',
    payment: 'دفعة',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">لوحة تحكم الإدارة</h1>
        <p className="text-muted-foreground">إدارة النظام والمستخدمين والصلاحيات</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{userStats?.totalUsers || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Shield className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{userStats?.activeRoles || 0}</p>
                <p className="text-sm text-muted-foreground">الأدوار النشطة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recentActivities.length}</p>
                <p className="text-sm text-muted-foreground">نشاطات اليوم</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alerts.length}</p>
                <p className="text-sm text-muted-foreground">تنبيهات</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Access */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>الوصول السريع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {adminSections.map((section) => (
                <Button
                  key={section.href}
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2 hover:border-primary transition-colors"
                  onClick={() => navigate(section.href)}
                >
                  <div className={`p-2 rounded-lg ${section.bgColor}`}>
                    <section.icon className={`h-5 w-5 ${section.color}`} />
                  </div>
                  <span className="text-xs font-medium">{section.title}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              تنبيهات النظام
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                لا توجد تنبيهات
              </p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      alert.type === 'error' ? 'bg-destructive/10' : 'bg-warning/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {alert.type === 'error' ? (
                        <Receipt className="h-4 w-4 text-destructive" />
                      ) : (
                        <Package className="h-4 w-4 text-warning" />
                      )}
                      <span className="text-sm">{alert.message}</span>
                    </div>
                    <Badge variant={alert.type === 'error' ? 'destructive' : 'secondary'}>
                      {alert.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            آخر النشاطات
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/activity-log')}>
            عرض الكل
          </Button>
        </CardHeader>
        <CardContent>
          {loadingActivities ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentActivities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              لا توجد نشاطات مسجلة
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        activity.action === 'create' ? 'bg-emerald-500/10' :
                        activity.action === 'update' ? 'bg-blue-500/10' :
                        activity.action === 'delete' ? 'bg-destructive/10' :
                        'bg-muted'
                      }`}>
                        <Activity className={`h-4 w-4 ${
                          activity.action === 'create' ? 'text-emerald-500' :
                          activity.action === 'update' ? 'text-blue-500' :
                          activity.action === 'delete' ? 'text-destructive' :
                          'text-muted-foreground'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {actionLabels[activity.action] || activity.action} {entityLabels[activity.entity_type] || activity.entity_type}
                        </p>
                        {activity.entity_name && (
                          <p className="text-xs text-muted-foreground">{activity.entity_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(activity.created_at).toLocaleTimeString('ar-EG')}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
