import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowRight,
  Building2,
  Users,
  FileText,
  Package,
  ShoppingCart,
  Play,
  Pause,
  Calendar,
  Globe,
} from 'lucide-react';

export default function TenantDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  interface TenantRow {
    id: string;
    name: string;
    slug: string;
    domain: string;
    subscription_tier: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    user_count: number;
  }

  const { data: allTenants, isLoading } = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_tenants_admin');
      if (error) throw error;
      return data as TenantRow[];
    },
  });

  const tenant = allTenants?.find((t) => t.id === id);

  const toggleStatusMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const { error } = await supabase.rpc('toggle_tenant_status', {
        _tenant_id: id!,
        _is_active: isActive,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      toast.success('تم تحديث حالة الشركة');
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: async (tier: string) => {
      const { error } = await supabase.rpc('update_tenant_subscription', {
        _tenant_id: id!,
        _tier: tier,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      toast.success('تم تحديث الباقة');
    },
  });

  // Fetch audit logs for this tenant
  const { data: auditLogs } = useQuery({
    queryKey: ['platform-audit-logs', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_audit_logs')
        .select('*')
        .eq('target_id', id!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">لم يتم العثور على الشركة</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/platform/tenants')}>
          العودة للقائمة
        </Button>
      </div>
    );
  }

  const actionLabel: Record<string, string> = {
    activate_tenant: 'تفعيل',
    suspend_tenant: 'تعليق',
    update_subscription: 'تغيير الباقة',
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/platform/tenants')}>
        <ArrowRight className="h-4 w-4 ml-2" />
        العودة لقائمة الشركات
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tenant.name}</h1>
            <p className="text-muted-foreground text-sm">{tenant.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={tenant.is_active ? 'default' : 'secondary'} className="text-sm">
            {tenant.is_active ? 'نشط' : 'معلق'}
          </Badge>
          <Button
            variant={tenant.is_active ? 'outline' : 'default'}
            size="sm"
            onClick={() => toggleStatusMutation.mutate(!tenant.is_active)}
          >
            {tenant.is_active ? (
              <>
                <Pause className="h-4 w-4 ml-2" />
                تعليق
              </>
            ) : (
              <>
                <Play className="h-4 w-4 ml-2" />
                تفعيل
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">معلومات عامة</TabsTrigger>
          <TabsTrigger value="activity">سجل النشاط</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">معلومات الشركة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">الاسم</span>
                  <span className="font-medium">{tenant.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">المعرف</span>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{tenant.slug}</code>
                </div>
                {tenant.domain && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">النطاق</span>
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" />
                      <span className="text-sm">{tenant.domain}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">تاريخ التسجيل</span>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(tenant.created_at).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">المستخدمين</span>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{tenant.user_count}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">الاشتراك</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">الباقة الحالية</label>
                  <Select
                    value={tenant.subscription_tier}
                    onValueChange={(tier) => updateTierMutation.mutate(tier)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">أساسي</SelectItem>
                      <SelectItem value="professional">احترافي</SelectItem>
                      <SelectItem value="enterprise">مؤسسي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">سجل النشاط</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {auditLogs?.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">
                        {actionLabel[log.action] || log.action}
                      </p>
                      {log.details && (
                        <p className="text-xs text-muted-foreground">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('ar-EG')}
                    </span>
                  </div>
                ))}
                {(!auditLogs || auditLogs.length === 0) && (
                  <p className="text-center text-muted-foreground py-6">لا توجد سجلات</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
