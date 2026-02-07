import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Play,
  Pause,
  Eye,
  Settings,
  Users,
  Crown,
  Briefcase,
  Zap,
} from 'lucide-react';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  subscription_tier: string;
  is_active: boolean;
  created_at: string;
  user_count: number;
}

export default function TenantsManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: '', slug: '', subscription_tier: 'basic' });

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_tenants_admin');
      if (error) throw error;
      return (data as unknown as TenantRow[]) ?? [];
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ tenantId, isActive }: { tenantId: string; isActive: boolean }) => {
      const { error } = await supabase.rpc('toggle_tenant_status', {
        _tenant_id: tenantId,
        _is_active: isActive,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      toast.success('تم تحديث حالة الشركة');
    },
    onError: () => toast.error('فشل تحديث حالة الشركة'),
  });

  const updateTierMutation = useMutation({
    mutationFn: async ({ tenantId, tier }: { tenantId: string; tier: string }) => {
      const { error } = await supabase.rpc('update_tenant_subscription', {
        _tenant_id: tenantId,
        _tier: tier,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      toast.success('تم تحديث الباقة');
    },
    onError: () => toast.error('فشل تحديث الباقة'),
  });

  const createTenantMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tenants').insert({
        name: newTenant.name,
        slug: newTenant.slug,
        subscription_tier: newTenant.subscription_tier,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      setShowCreateDialog(false);
      setNewTenant({ name: '', slug: '', subscription_tier: 'basic' });
      toast.success('تم إنشاء الشركة بنجاح');
    },
    onError: () => toast.error('فشل إنشاء الشركة'),
  });

  const filtered = (tenants ?? []).filter((t) => {
    const matchSearch = !search || t.name.includes(search) || t.slug.includes(search);
    const matchTier = filterTier === 'all' || t.subscription_tier === filterTier;
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && t.is_active) ||
      (filterStatus === 'suspended' && !t.is_active);
    return matchSearch && matchTier && matchStatus;
  });

  const tierIcon = (tier: string) => {
    switch (tier) {
      case 'enterprise': return <Crown className="h-3.5 w-3.5" />;
      case 'professional': return <Zap className="h-3.5 w-3.5" />;
      default: return <Briefcase className="h-3.5 w-3.5" />;
    }
  };

  const tierLabel = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'مؤسسي';
      case 'professional': return 'احترافي';
      default: return 'أساسي';
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الشركات</h1>
          <p className="text-muted-foreground text-sm">
            {tenants?.length ?? 0} شركة مسجلة
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 ml-2" />
              إنشاء شركة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء شركة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم الشركة</Label>
                <Input
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  placeholder="اسم الشركة"
                />
              </div>
              <div className="space-y-2">
                <Label>المعرف (Slug)</Label>
                <Input
                  value={newTenant.slug}
                  onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })}
                  placeholder="company-slug"
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="space-y-2">
                <Label>الباقة</Label>
                <Select
                  value={newTenant.subscription_tier}
                  onValueChange={(v) => setNewTenant({ ...newTenant, subscription_tier: v })}
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
              <Button
                className="w-full"
                onClick={() => createTenantMutation.mutate()}
                disabled={!newTenant.name || !newTenant.slug || createTenantMutation.isPending}
              >
                {createTenantMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء الشركة'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو المعرف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="الباقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الباقات</SelectItem>
                <SelectItem value="basic">أساسي</SelectItem>
                <SelectItem value="professional">احترافي</SelectItem>
                <SelectItem value="enterprise">مؤسسي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="suspended">معلق</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الشركة</TableHead>
                <TableHead>الباقة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>المستخدمين</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={tenant.subscription_tier}
                      onValueChange={(tier) =>
                        updateTierMutation.mutate({ tenantId: tenant.id, tier })
                      }
                    >
                      <SelectTrigger className="w-[120px] h-8">
                        <div className="flex items-center gap-1.5">
                          {tierIcon(tenant.subscription_tier)}
                          <span className="text-xs">{tierLabel(tenant.subscription_tier)}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">أساسي</SelectItem>
                        <SelectItem value="professional">احترافي</SelectItem>
                        <SelectItem value="enterprise">مؤسسي</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                      {tenant.is_active ? 'نشط' : 'معلق'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{tenant.user_count}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(tenant.created_at).toLocaleDateString('ar-EG')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/platform/tenants/${tenant.id}`)}
                        title="عرض التفاصيل"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          toggleStatusMutation.mutate({
                            tenantId: tenant.id,
                            isActive: !tenant.is_active,
                          })
                        }
                        title={tenant.is_active ? 'تعليق' : 'تفعيل'}
                      >
                        {tenant.is_active ? (
                          <Pause className="h-4 w-4 text-amber-500" />
                        ) : (
                          <Play className="h-4 w-4 text-emerald-500" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    لا توجد شركات مطابقة
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
