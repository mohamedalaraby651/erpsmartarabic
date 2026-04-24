import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSafeErrorMessage, logErrorSafely } from '@/lib/errorHandler';
import PageHeader from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Users, Loader2, Shield, Search, Download, UserCheck, UserX } from 'lucide-react';
import { AdminPageSkeleton } from '@/components/shared/AdminPageSkeleton';
// xlsx loaded dynamically inside handlers (perf: tree-shaken from main bundle)

const legacyRoleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  sales: 'موظف مبيعات',
  warehouse: 'أمين مخزن',
  accountant: 'محاسب',
  hr: 'موارد بشرية',
};

const legacyRoleColors: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive',
  sales: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  warehouse: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  accountant: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  hr: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
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
    onError: (error: unknown) => {
      logErrorSafely('UsersPage.updateRoleMutation', error);
      toast.error(getSafeErrorMessage(error));
    },
  });

  const updatePrimaryRoleMutation = useMutation({
    mutationFn: async ({ userRoleId, role }: { userRoleId: string; role: 'admin' | 'sales' | 'warehouse' | 'accountant' | 'hr' }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('id', userRoleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('تم تحديث الدور الأساسي');
    },
    onError: (error: unknown) => {
      logErrorSafely('UsersPage.updatePrimaryRoleMutation', error);
      toast.error(getSafeErrorMessage(error));
    },
  });

  // Stats
  const roleStats = useMemo(() => {
    if (!users) return {};
    const counts: Record<string, number> = {};
    users.forEach(u => {
      counts[u.role] = (counts[u.role] || 0) + 1;
    });
    return counts;
  }, [users]);

  const withCustomRole = useMemo(() => users?.filter(u => u.custom_role_id)?.length || 0, [users]);
  const withoutCustomRole = useMemo(() => users?.filter(u => !u.custom_role_id)?.length || 0, [users]);

  // Filtering
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(user => {
      const profile = user.profiles as { full_name?: string; avatar_url?: string; phone?: string } | null;
      const matchesSearch = !searchQuery || 
        profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        profile?.phone?.includes(searchQuery);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const exportToExcel = () => {
    if (!users) return;
    const data = users.map(user => {
      const profile = user.profiles as { full_name?: string; phone?: string } | null;
      const customRole = user.custom_roles as { name?: string } | null;
      return {
        'الاسم': profile?.full_name || 'غير محدد',
        'الهاتف': profile?.phone || '-',
        'الدور الأساسي': legacyRoleLabels[user.role] || user.role,
        'الدور المخصص': customRole?.name || 'بدون',
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المستخدمون');
    XLSX.writeFile(wb, 'users_export.xlsx');
    toast.success('تم تصدير القائمة');
  };

  if (isLoading) {
    return <AdminPageSkeleton variant="table" rows={5} columns={4} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة المستخدمين"
        description="إدارة المستخدمين وتعيين أدوارهم"
        showBack
        actions={
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="h-4 w-4 ml-2" />
            تصدير Excel
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Object.entries(legacyRoleLabels).map(([key, label]) => (
          <Card key={key}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-lg font-bold">{roleStats[key] || 0}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{withoutCustomRole}</p>
                <p className="text-xs text-muted-foreground">بدون دور مخصص</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="فلتر بالدور" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأدوار</SelectItem>
            {Object.entries(legacyRoleLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            المستخدمون ({filteredUsers.length})
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
              {filteredUsers.map((user) => {
                const profile = user.profiles as { full_name?: string; avatar_url?: string; phone?: string; id?: string } | null;
                const customRole = user.custom_roles as { id?: string; name?: string; color?: string } | null;
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
                          <p className="text-xs text-muted-foreground">{user.user_id?.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value) =>
                          updatePrimaryRoleMutation.mutate({
                            userRoleId: user.id,
                            role: value as 'admin' | 'sales' | 'warehouse' | 'accountant' | 'hr',
                          })
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue>
                            <Badge className={legacyRoleColors[user.role] || ''}>
                              {legacyRoleLabels[user.role] || user.role}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(legacyRoleLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
