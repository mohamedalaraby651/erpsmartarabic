import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';

type AuditLog = Database['public']['Tables']['platform_audit_logs']['Row'];

export default function PlatformReportsPage() {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['platform-audit-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const actionLabel: Record<string, string> = {
    activate_tenant: 'تفعيل شركة',
    suspend_tenant: 'تعليق شركة',
    update_subscription: 'تغيير باقة',
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تقارير المنصة</h1>
        <p className="text-muted-foreground text-sm">سجل جميع العمليات على مستوى المنصة</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            سجل العمليات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {auditLogs?.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">
                    {actionLabel[log.action] || log.action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الهدف: {log.target_type} - {log.target_id?.slice(0, 8)}...
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString('ar-EG')}
                </span>
              </div>
            ))}
            {(!auditLogs || auditLogs.length === 0) && (
              <p className="text-center text-muted-foreground py-8">لا توجد عمليات مسجلة بعد</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
