import { useAuth } from '@/hooks/useAuth';
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
  AlertCircle,
  Warehouse,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Sample chart data
const salesData = [
  { name: 'يناير', sales: 4000 },
  { name: 'فبراير', sales: 3000 },
  { name: 'مارس', sales: 5000 },
  { name: 'أبريل', sales: 4500 },
  { name: 'مايو', sales: 6000 },
  { name: 'يونيو', sales: 5500 },
];

const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  sales: 'موظف مبيعات',
  warehouse: 'أمين مخزن',
  accountant: 'محاسب',
  hr: 'موارد بشرية',
};

export default function Dashboard() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  // Fetch stats
  const { data: customersCount } = useQuery({
    queryKey: ['customers-count'],
    queryFn: async () => {
      const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: productsCount } = useQuery({
    queryKey: ['products-count'],
    queryFn: async () => {
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: invoicesCount } = useQuery({
    queryKey: ['invoices-count'],
    queryFn: async () => {
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: quotationsCount } = useQuery({
    queryKey: ['quotations-count'],
    queryFn: async () => {
      const { count } = await supabase.from('quotations').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_completed', false)
        .order('due_date', { ascending: true })
        .limit(5);
      return data || [];
    },
  });

  const { data: recentInvoices } = useQuery({
    queryKey: ['recent-invoices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء الخير';
  };

  const userName = user?.user_metadata?.full_name || 'المستخدم';

  const quickActions = [
    { title: 'عميل جديد', icon: Users, href: '/customers/new', color: 'bg-blue-500' },
    { title: 'منتج جديد', icon: Package, href: '/products/new', color: 'bg-green-500' },
    { title: 'عرض سعر', icon: FileText, href: '/quotations/new', color: 'bg-purple-500' },
    { title: 'فاتورة جديدة', icon: Receipt, href: '/invoices/new', color: 'bg-orange-500' },
  ];

  const stats = [
    { title: 'العملاء', value: customersCount || 0, icon: Users, change: '+12%', positive: true },
    { title: 'المنتجات', value: productsCount || 0, icon: Package, change: '+5%', positive: true },
    { title: 'عروض الأسعار', value: quotationsCount || 0, icon: FileText, change: '+18%', positive: true },
    { title: 'الفواتير', value: invoicesCount || 0, icon: Receipt, change: '+8%', positive: true },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {greeting()}، {userName} 👋
          </h1>
          <div className="text-muted-foreground mt-1 flex items-center gap-2">
            <span>مرحباً بك في لوحة التحكم</span>
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
              onClick={() => navigate(action.href)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {action.title}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="relative overflow-hidden">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl md:text-3xl font-bold mt-1">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.positive ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm ${stat.positive ? 'text-green-500' : 'text-red-500'}`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">الإجراءات السريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.href}
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 hover:bg-accent"
                  onClick={() => navigate(action.href)}
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
      </Card>

      {/* Charts and Tasks Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">المبيعات الشهرية</CardTitle>
            <CardDescription>إجمالي المبيعات خلال الأشهر الماضية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
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
        </Card>

        {/* Tasks */}
        <Card>
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
              <div className="space-y-3">
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
                    <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                      {task.priority === 'high' ? 'عاجل' : task.priority === 'medium' ? 'متوسط' : 'منخفض'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success" />
                <p>لا توجد مهام معلقة</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
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
            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {(invoice.customers as any)?.name || 'عميل'}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold">{invoice.total_amount.toLocaleString()} ج.م</p>
                    <Badge
                      variant={
                        invoice.payment_status === 'paid' ? 'default' :
                        invoice.payment_status === 'partial' ? 'secondary' : 'destructive'
                      }
                    >
                      {invoice.payment_status === 'paid' ? 'مدفوع' :
                       invoice.payment_status === 'partial' ? 'جزئي' : 'معلق'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد فواتير بعد</p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => navigate('/invoices/new')}
              >
                إنشاء فاتورة جديدة
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
