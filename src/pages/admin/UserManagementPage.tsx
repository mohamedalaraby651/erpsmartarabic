import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSafeErrorMessage, logErrorSafely } from '@/lib/errorHandler';
import PageHeader from '@/components/navigation/PageHeader';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Users, Shield, Search, UserCheck, UserX, KeyRound, Check, X } from 'lucide-react';
import { AdminPageSkeleton } from '@/components/shared/AdminPageSkeleton';
import { useAuth } from '@/hooks/useAuth';

const legacyRoleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  sales: 'مبيعات',
  warehouse: 'مخزن',
  accountant: 'محاسب',
  hr: 'موارد بشرية',
};

type UserRow = {
  id: string;
  user_id: string;
  role: string;
  custom_role_id: string | null;
  custom_roles: { id: string; name: string; color: string } | null;
  profiles: { id: string; full_name: string; avatar_url: string | null; phone: string | null; is_active: boolean } | null;
};

const SECTIONS = [
  { key: 'customers', label: 'العملاء' },
  { key: 'suppliers', label: 'الموردين' },
  { key: 'products', label: 'المنتجات' },
  { key: 'invoices', label: 'الفواتير' },
  { key: 'payments', label: 'المدفوعات' },
  { key: 'expenses', label: 'المصروفات' },
  { key: 'reports', label: 'التقارير' },
  { key: 'inventory', label: 'المخزون' },
];

export default function UserManagementPage() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'disabled'>('all');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-user-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id, user_id, role, custom_role_id,
          custom_roles ( id, name, color ),
          profiles:user_id ( id, full_name, avatar_url, phone, is_active )
        `);
      if (error) throw error;
      return (data ?? []) as unknown as UserRow[];
    },
  });

  const { data: customRoles } = useQuery({
    queryKey: ['custom-roles-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('id,name,color,is_active')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rolePerms } = useQuery({
    queryKey: ['role-section-permissions-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_section_permissions')
        .select('role_id, section, can_view, can_create, can_edit, can_delete');
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const { error } = await supabase.rpc('admin_set_user_active', {
        _user_id: userId, _active: active,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-user-management'] });
      toast.success(v.active ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم');
    },
    onError: (e) => {
      logErrorSafely('UserManagementPage.toggleActive', e);
      toast.error(getSafeErrorMessage(e));
    },
  });

  const updatePrimaryRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: role as 'admin' | 'sales' | 'warehouse' | 'accountant' | 'hr' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user-management'] });
      toast.success('تم تحديث الدور');
    },
    onError: (e) => toast.error(getSafeErrorMessage(e)),
  });

  const updateCustomRole = useMutation({
    mutationFn: async ({ id, customRoleId }: { id: string; customRoleId: string | null }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ custom_role_id: customRoleId })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user-management'] });
      toast.success('تم تحديث الدور المخصص');
    },
    onError: (e) => toast.error(getSafeErrorMessage(e)),
  });

  const filtered = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      const p = u.profiles;
      const matchSearch = !search ||
        p?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        p?.phone?.includes(search);
      const isActive = p?.is_active !== false;
      const matchStatus = status === 'all' || (status === 'active' ? isActive : !isActive);
      return matchSearch && matchStatus;
    });
  }, [users, search, status]);

  const stats = useMemo(() => {
    const total = users?.length ?? 0;
    const active = users?.filter(u => u.profiles?.is_active !== false).length ?? 0;
    return { total, active, disabled: total - active };
  }, [users]);

  if (isLoading) return <AdminPageSkeleton variant="table" rows={6} columns={5} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة المستخدمين والصلاحيات"
        description="لوحة مركزية لإدارة المستخدمين وأدوارهم وصلاحياتهم"
        showBack
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="إجمالي المستخدمين" value={stats.total} />
        <StatCard icon={<UserCheck className="h-4 w-4 text-emerald-500" />} label="نشطون" value={stats.active} />
        <StatCard icon={<UserX className="h-4 w-4 text-destructive" />} label="معطّلون" value={stats.disabled} />
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users"><Users className="h-4 w-4 ml-2" />المستخدمون</TabsTrigger>
          <TabsTrigger value="matrix"><KeyRound className="h-4 w-4 ml-2" />مصفوفة الصلاحيات</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-3 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">النشطون فقط</SelectItem>
                <SelectItem value="disabled">المعطّلون فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>الدور المخصص</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(u => {
                    const p = u.profiles;
                    const isActive = p?.is_active !== false;
                    const initials = p?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??';
                    const isMe = u.user_id === me?.id;
                    return (
                      <TableRow key={u.id} className={!isActive ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={p?.avatar_url ?? undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                {p?.full_name || 'غير محدد'}
                                {isMe && <Badge variant="outline" className="text-xs">أنت</Badge>}
                              </p>
                              <p className="text-xs text-muted-foreground">{u.user_id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(v) => updatePrimaryRole.mutate({ id: u.id, role: v })}
                          >
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(legacyRoleLabels).map(([k, l]) => (
                                <SelectItem key={k} value={k}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.custom_role_id ?? '__none__'}
                            onValueChange={(v) => updateCustomRole.mutate({
                              id: u.id,
                              customRoleId: v === '__none__' ? null : v,
                            })}
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="بدون">
                                {u.custom_roles ? (
                                  <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: u.custom_roles.color }} />
                                    {u.custom_roles.name}
                                  </div>
                                ) : 'بدون'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">بدون</SelectItem>
                              {customRoles?.map(r => (
                                <SelectItem key={r.id} value={r.id}>
                                  <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                                    {r.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p?.phone || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={isActive}
                              disabled={isMe || toggleActive.isPending}
                              onCheckedChange={(checked) =>
                                toggleActive.mutate({ userId: u.user_id, active: checked })
                              }
                            />
                            <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                              {isActive ? 'نشط' : 'معطّل'}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        لا يوجد مستخدمون مطابقون
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-3 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5" />
                مصفوفة الصلاحيات حسب الدور المخصص
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-32">الدور</TableHead>
                    {SECTIONS.map(s => (
                      <TableHead key={s.key} className="text-center">{s.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customRoles?.map(role => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: role.color }} />
                          <span className="font-medium">{role.name}</span>
                        </div>
                      </TableCell>
                      {SECTIONS.map(s => {
                        const p = rolePerms?.find(rp => rp.role_id === role.id && rp.section === s.key);
                        return (
                          <TableCell key={s.key} className="text-center">
                            <PermCell perm={p} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  {(!customRoles || customRoles.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={SECTIONS.length + 1} className="text-center py-8 text-muted-foreground">
                        لا توجد أدوار مخصصة
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PermCell({ perm }: { perm?: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }) {
  if (!perm) return <span className="text-muted-foreground text-xs">—</span>;
  const flags = [
    { k: 'V', on: perm.can_view },
    { k: 'C', on: perm.can_create },
    { k: 'E', on: perm.can_edit },
    { k: 'D', on: perm.can_delete },
  ];
  return (
    <div className="flex items-center justify-center gap-1">
      {flags.map(f => (
        <span
          key={f.k}
          title={f.k}
          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
            f.on ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'
          }`}
        >
          {f.on ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
        </span>
      ))}
    </div>
  );
}
