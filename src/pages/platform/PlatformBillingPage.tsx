import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, TrendingUp, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function PlatformBillingPage() {
  const { data: stats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_stats');
      if (error) throw error;
      return data as Record<string, number>;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الاشتراكات والفوترة</h1>
        <p className="text-muted-foreground text-sm">إدارة اشتراكات الشركات ومتابعة الإيرادات</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الشركات</p>
                <p className="text-xl font-bold">{stats?.total_tenants ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إيرادات الشهر</p>
                <p className="text-xl font-bold">{(stats?.monthly_revenue ?? 0).toLocaleString('ar-EG')} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">فواتير الشهر</p>
                <p className="text-xl font-bold">{stats?.monthly_invoices ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">تفاصيل الباقات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: 'الباقة الأساسية', count: stats?.basic_tier ?? 0, color: 'bg-muted-foreground' },
              { label: 'الباقة الاحترافية', count: stats?.professional_tier ?? 0, color: 'bg-primary' },
              { label: 'الباقة المؤسسية', count: stats?.enterprise_tier ?? 0, color: 'bg-violet-500' },
            ].map((tier) => (
              <div key={tier.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${tier.color}`} />
                  <span className="text-sm">{tier.label}</span>
                </div>
                <span className="font-medium">{tier.count} شركة</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
