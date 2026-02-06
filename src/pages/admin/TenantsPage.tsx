import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Pencil,
  Users,
  Search,
  Globe,
  Crown,
  Briefcase,
  Rocket,
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  subscription_tier: string;
  is_active: boolean;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface TenantWithCount extends Tenant {
  userCount: number;
}

const tierLabels: Record<string, string> = {
  basic: 'أساسي',
  professional: 'احترافي',
  enterprise: 'مؤسسي',
};

const tierIcons: Record<string, React.ElementType> = {
  basic: Briefcase,
  professional: Crown,
  enterprise: Rocket,
};

const tierColors: Record<string, string> = {
  basic: 'bg-slate-500/10 text-slate-600',
  professional: 'bg-blue-500/10 text-blue-600',
  enterprise: 'bg-amber-500/10 text-amber-600',
};

const initialForm = {
  name: '',
  slug: '',
  domain: '',
  subscription_tier: 'basic',
  is_active: true,
};

const TenantsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: tenantsWithCounts = [], isLoading } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => {
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id');

      const countMap: Record<string, number> = {};
      userTenants?.forEach((ut) => {
        countMap[ut.tenant_id] = (countMap[ut.tenant_id] || 0) + 1;
      });

      return (tenants as Tenant[]).map((t) => ({
        ...t,
        userCount: countMap[t.id] || 0,
      })) as TenantWithCount[];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        name: values.name,
        slug: values.slug,
        domain: values.domain || null,
        subscription_tier: values.subscription_tier,
        is_active: values.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from('tenants').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tenants').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      toast.success(editingId ? 'تم تحديث الشركة' : 'تم إنشاء الشركة');
      closeDialog();
    },
    onError: () => toast.error('حدث خطأ أثناء الحفظ'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('tenants').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      toast.success('تم تحديث حالة الشركة');
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const openEdit = (tenant: Tenant) => {
    setEditingId(tenant.id);
    setForm({
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain || '',
      subscription_tier: tenant.subscription_tier,
      is_active: tenant.is_active,
    });
    setDialogOpen(true);
  };

  const filtered = tenantsWithCounts.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: tenantsWithCounts.length,
    active: tenantsWithCounts.filter((t) => t.is_active).length,
    totalUsers: tenantsWithCounts.reduce((s, t) => s + t.userCount, 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الشركات</h1>
          <p className="text-muted-foreground">عرض وإدارة جميع الشركات المسجلة في النظام</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          شركة جديدة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">إجمالي الشركات</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Globe className="h-6 w-6 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">{stats.active}</p>
            <p className="text-xs text-muted-foreground">نشطة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{stats.totalUsers}</p>
            <p className="text-xs text-muted-foreground">إجمالي المستخدمين</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="البحث في الشركات..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Tenants List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'لا توجد نتائج مطابقة' : 'لا توجد شركات بعد'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((tenant) => {
            const TierIcon = tierIcons[tenant.subscription_tier] || Briefcase;
            return (
              <Card key={tenant.id} className={!tenant.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-2.5 rounded-xl bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{tenant.name}</h3>
                          <Badge className={tierColors[tenant.subscription_tier]}>
                            <TierIcon className="h-3 w-3 ml-1" />
                            {tierLabels[tenant.subscription_tier] || tenant.subscription_tier}
                          </Badge>
                          {!tenant.is_active && <Badge variant="secondary">معلقة</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="font-mono text-xs">{tenant.slug}</span>
                          {tenant.domain && (
                            <>
                              <span>•</span>
                              <span>{tenant.domain}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {tenant.userCount} مستخدم
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={tenant.is_active}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: tenant.id, is_active: checked })
                        }
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(tenant)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'تعديل الشركة' : 'إنشاء شركة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم الشركة</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: شركة ABC للتجارة"
              />
            </div>
            <div className="space-y-2">
              <Label>المعرف (Slug)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                placeholder="مثال: abc-trading"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>النطاق (اختياري)</Label>
              <Input
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                placeholder="مثال: abc.com"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>الباقة</Label>
              <Select value={form.subscription_tier} onValueChange={(v) => setForm({ ...form, subscription_tier: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">أساسي</SelectItem>
                  <SelectItem value="professional">احترافي</SelectItem>
                  <SelectItem value="enterprise">مؤسسي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.name.trim() || !form.slug.trim()}
            >
              {saveMutation.isPending ? 'جاري الحفظ...' : editingId ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantsPage;
