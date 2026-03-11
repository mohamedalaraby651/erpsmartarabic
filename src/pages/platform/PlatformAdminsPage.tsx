import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, UserCog, CreditCard, HeadphonesIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type PlatformAdmin = Database['public']['Tables']['platform_admins']['Row'];

export default function PlatformAdminsPage() {
  const { data: admins, isLoading } = useQuery({
    queryKey: ['platform-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_admins')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const roleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Shield className="h-4 w-4 text-primary" />;
      case 'support': return <HeadphonesIcon className="h-4 w-4 text-emerald-500" />;
      case 'billing': return <CreditCard className="h-4 w-4 text-amber-500" />;
      default: return <UserCog className="h-4 w-4" />;
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'مالك المنصة';
      case 'support': return 'دعم فني';
      case 'billing': return 'إدارة مالية';
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مسؤولو المنصة</h1>
        <p className="text-muted-foreground text-sm">إدارة حسابات مسؤولي المنصة وصلاحياتهم</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المعرف</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins?.map((admin: PlatformAdmin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {admin.user_id.slice(0, 8)}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {roleIcon(admin.role)}
                      <span className="text-sm">{roleLabel(admin.role)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                      {admin.is_active ? 'نشط' : 'معطل'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(admin.created_at).toLocaleDateString('ar-EG')}
                  </TableCell>
                </TableRow>
              ))}
              {(!admins || admins.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    لا يوجد مسؤولون حالياً
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
