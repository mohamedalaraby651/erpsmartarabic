import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  FileText,
  TrendingUp,
  CheckCircle2,
  PauseCircle,
  Crown,
  Briefcase,
  Zap,
  ArrowUpLeft,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface PlatformStats {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  total_users: number;
  basic_tier: number;
  professional_tier: number;
  enterprise_tier: number;
  monthly_invoices: number;
  monthly_revenue: number;
}

export default function PlatformDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_stats');
      if (error) throw error;
      return data as unknown as PlatformStats;
    },
  });

  const { data: recentTenants } = useQuery({
    queryKey: ['platform-recent-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_tenants_admin');
      if (error) throw error;
      return (data as Array<{ id: string; name: string; slug: string; subscription_tier: string; is_active: boolean; user_count: number }>)?.slice(0, 5) ?? [];
    },
  });

  const tierData = stats
    ? [
        { name: 'أساسي', value: stats.basic_tier, color: 'hsl(var(--muted-foreground))' },
        { name: 'احترافي', value: stats.professional_tier, color: 'hsl(var(--primary))' },
        { name: 'مؤسسي', value: stats.enterprise_tier, color: 'hsl(262 83% 58%)' },
      ]
    : [];

  const statCards = [
    {
      label: 'إجمالي الشركات',
      value: stats?.total_tenants ?? 0,
      icon: Building2,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'الشركات النشطة',
      value: stats?.active_tenants ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'إجمالي المستخدمين',
      value: stats?.total_users ?? 0,
      icon: Users,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'فواتير الشهر',
      value: stats?.monthly_invoices ?? 0,
      icon: FileText,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">لوحة تحكم المنصة</h1>
          <p className="text-muted-foreground text-sm">نظرة عامة على أداء المنصة والشركات</p>
        </div>
        <Button onClick={() => navigate('/platform/tenants')}>
          <Building2 className="h-4 w-4 ml-2" />
          إدارة الشركات
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value.toLocaleString('ar-EG')}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">توزيع الباقات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tierData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {tierData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {[
                  { label: 'أساسي', value: stats?.basic_tier ?? 0, icon: Briefcase, color: 'text-muted-foreground' },
                  { label: 'احترافي', value: stats?.professional_tier ?? 0, icon: Zap, color: 'text-primary' },
                  { label: 'مؤسسي', value: stats?.enterprise_tier ?? 0, icon: Crown, color: 'text-violet-500' },
                ].map((tier) => (
                  <div key={tier.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <tier.icon className={`h-4 w-4 ${tier.color}`} />
                      <span className="text-sm">{tier.label}</span>
                    </div>
                    <Badge variant="secondary">{tier.value}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الإيرادات الشهرية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <span className="text-3xl font-bold">
                  {(stats?.monthly_revenue ?? 0).toLocaleString('ar-EG')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">ج.م - آخر 30 يوم</p>
              <p className="text-sm text-muted-foreground mt-1">
                من {stats?.monthly_invoices ?? 0} فاتورة
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tenants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">آخر الشركات المسجلة</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/platform/tenants')}>
            عرض الكل
            <ArrowUpLeft className="h-4 w-4 mr-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {recentTenants?.map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                    {tenant.is_active ? 'نشط' : 'معلق'}
                  </Badge>
                  <Badge variant="outline">{tenant.subscription_tier}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {tenant.user_count} مستخدم
                  </span>
                </div>
              </div>
            ))}
            {(!recentTenants || recentTenants.length === 0) && (
              <p className="text-center text-muted-foreground py-6">لا توجد شركات مسجلة بعد</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
