import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  CheckCircle,
  Plus,
  Pencil,
  Trash2,
  Receipt,
  CircleDollarSign,
  ShoppingCart,
  BookOpenCheck,
} from 'lucide-react';

interface ApprovalChain {
  id: string;
  entity_type: string;
  amount_threshold: number;
  required_approvers: number;
  approver_roles: string[];
  escalation_hours: number | null;
  is_active: boolean;
  created_at: string;
}

const entityTypeLabels: Record<string, string> = {
  invoice: 'الفواتير',
  expense: 'المصروفات',
  purchase_order: 'أوامر الشراء',
  journal: 'القيود اليومية',
};

const entityTypeIcons: Record<string, React.ElementType> = {
  invoice: Receipt,
  expense: CircleDollarSign,
  purchase_order: ShoppingCart,
  journal: BookOpenCheck,
};

const roleLabels: Record<string, string> = {
  admin: 'مدير',
  accountant: 'محاسب',
  sales: 'مبيعات',
  warehouse: 'مخازن',
  hr: 'موارد بشرية',
};

const initialForm = {
  entity_type: 'invoice',
  amount_threshold: 0,
  required_approvers: 1,
  approver_roles: ['admin'],
  escalation_hours: 24,
  is_active: true,
};

const ApprovalChainsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  const { data: chains = [], isLoading } = useQuery({
    queryKey: ['approval-chains-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_chains')
        .select('*')
        .order('entity_type')
        .order('amount_threshold', { ascending: true });
      if (error) throw error;
      return data as ApprovalChain[];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      if (editingId) {
        const { error } = await supabase
          .from('approval_chains')
          .update(values)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('approval_chains')
          .insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-chains-admin'] });
      toast.success(editingId ? 'تم تحديث القاعدة' : 'تم إنشاء القاعدة');
      closeDialog();
    },
    onError: () => toast.error('حدث خطأ أثناء الحفظ'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('approval_chains').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-chains-admin'] });
      toast.success('تم حذف القاعدة');
    },
    onError: () => toast.error('حدث خطأ أثناء الحذف'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('approval_chains')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-chains-admin'] });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const openEdit = (chain: ApprovalChain) => {
    setEditingId(chain.id);
    setForm({
      entity_type: chain.entity_type,
      amount_threshold: chain.amount_threshold,
      required_approvers: chain.required_approvers,
      approver_roles: chain.approver_roles,
      escalation_hours: chain.escalation_hours || 24,
      is_active: chain.is_active,
    });
    setDialogOpen(true);
  };

  const toggleRole = (role: string) => {
    setForm((prev) => ({
      ...prev,
      approver_roles: prev.approver_roles.includes(role)
        ? prev.approver_roles.filter((r) => r !== role)
        : [...prev.approver_roles, role],
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">سلسلة الموافقات المالية</h1>
          <p className="text-muted-foreground">تكوين قواعد الموافقة التلقائية للعمليات المالية</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          قاعدة جديدة
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : chains.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">لا توجد قواعد موافقة بعد</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              إضافة أول قاعدة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {chains.map((chain) => {
            const Icon = entityTypeIcons[chain.entity_type] || Receipt;
            return (
              <Card key={chain.id} className={!chain.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-2.5 rounded-xl bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">
                            {entityTypeLabels[chain.entity_type] || chain.entity_type}
                          </h3>
                          <Badge variant="outline">
                            أكثر من {chain.amount_threshold.toLocaleString('ar-EG')} ج.م
                          </Badge>
                          {!chain.is_active && <Badge variant="secondary">معطل</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span>يتطلب {chain.required_approvers} موافقة</span>
                          <span>•</span>
                          <span>
                            الأدوار: {chain.approver_roles.map((r) => roleLabels[r] || r).join('، ')}
                          </span>
                          {chain.escalation_hours && (
                            <>
                              <span>•</span>
                              <span>تصعيد بعد {chain.escalation_hours} ساعة</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={chain.is_active}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: chain.id, is_active: checked })
                        }
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(chain)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('هل أنت متأكد من حذف هذه القاعدة؟')) {
                            deleteMutation.mutate(chain.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
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
            <DialogTitle>{editingId ? 'تعديل قاعدة الموافقة' : 'إضافة قاعدة موافقة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>نوع العملية</Label>
              <Select value={form.entity_type} onValueChange={(v) => setForm({ ...form, entity_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(entityTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الحد المالي (ج.م)</Label>
              <Input
                type="number"
                value={form.amount_threshold}
                onChange={(e) => setForm({ ...form, amount_threshold: Number(e.target.value) })}
                min={0}
              />
              <p className="text-xs text-muted-foreground">تتطلب الموافقة عند تجاوز هذا المبلغ</p>
            </div>
            <div className="space-y-2">
              <Label>عدد الموافقات المطلوبة</Label>
              <Input
                type="number"
                value={form.required_approvers}
                onChange={(e) => setForm({ ...form, required_approvers: Number(e.target.value) })}
                min={1}
                max={5}
              />
            </div>
            <div className="space-y-2">
              <Label>أدوار الموافقين</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(roleLabels).map(([key, label]) => (
                  <Badge
                    key={key}
                    variant={form.approver_roles.includes(key) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleRole(key)}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>مدة التصعيد (ساعات)</Label>
              <Input
                type="number"
                value={form.escalation_hours || ''}
                onChange={(e) => setForm({ ...form, escalation_hours: Number(e.target.value) || null })}
                min={1}
                placeholder="اختياري"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || form.approver_roles.length === 0}
            >
              {saveMutation.isPending ? 'جاري الحفظ...' : editingId ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalChainsPage;
