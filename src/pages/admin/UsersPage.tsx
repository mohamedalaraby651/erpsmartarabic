import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSafeErrorMessage, logErrorSafely } from '@/lib/errorHandler';
import PageHeader from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Loader2, Shield } from 'lucide-react';

const legacyRoleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  sales: 'موظف مبيعات',
  warehouse: 'أمين مخزن',
  accountant: 'محاسب',
  hr: 'موارد بشرية',
};

export default function UsersPage() {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      // Get user roles with profiles
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          custom_role_id,
          custom_roles (
            id,
            name,
            color
          ),
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            phone
          )
        `);
      
      if (error) throw error;
      return userRoles;
    },
  });

  const { data: customRoles } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userRoleId, customRoleId }: { userRoleId: string; customRoleId: string | null }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ custom_role_id: customRoleId })
        .eq('id', userRoleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('تم تحديث الدور');
    },
    onError: (error: any) => {
      logErrorSafely('UsersPage.updateRoleMutation', error);
      toast.error(getSafeErrorMessage(error));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="إدارة المستخدمين"
        description="إدارة المستخدمين وتعيين أدوارهم"
        showBack
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            المستخدمون ({users?.length || 0})
          </CardTitle>
          <CardDescription>
            قائمة بجميع المستخدمين المسجلين في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المستخدم</TableHead>
                <TableHead>الدور الأساسي</TableHead>
                <TableHead>الدور المخصص</TableHead>
                <TableHead>الهاتف</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => {
                const profile = user.profiles as any;
                const customRole = user.custom_roles as any;
                const initials = profile?.full_name
                  ?.split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2) || '??';
                
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={profile?.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profile?.full_name || 'غير محدد'}</p>
                          <p className="text-xs text-muted-foreground">{user.user_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {legacyRoleLabels[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.custom_role_id || ''}
                        onValueChange={(value) => 
                          updateRoleMutation.mutate({
                            userRoleId: user.id,
                            customRoleId: value || null,
                          })
                        }
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="اختر دوراً مخصصاً">
                            {customRole ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: customRole.color }}
                                />
                                {customRole.name}
                              </div>
                            ) : (
                              'بدون دور مخصص'
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">بدون دور مخصص</SelectItem>
                          {customRoles?.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: role.color }}
                                />
                                {role.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {profile?.phone || '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
