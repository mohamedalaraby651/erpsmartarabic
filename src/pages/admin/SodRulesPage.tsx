import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  ArrowLeftRight,
  X,
} from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface ConflictingAction {
  section: string;
  action: string;
}

interface SodRule {
  id: string;
  name: string;
  description: string | null;
  conflicting_actions: Json;
  is_active: boolean;
  tenant_id: string | null;
  created_at: string;
}

const sectionLabels: Record<string, string> = {
  invoices: 'الفواتير',
  expenses: 'المصروفات',
  payments: 'المدفوعات',
  purchase_orders: 'أوامر الشراء',
  journals: 'القيود اليومية',
  products: 'المنتجات',
  customers: 'العملاء',
  suppliers: 'الموردين',
};

const actionLabels: Record<string, string> = {
  create: 'إنشاء',
  update: 'تعديل',
  delete: 'حذف',
  approve: 'اعتماد',
  reject: 'رفض',
};

const initialForm = {
  name: '',
  description: '',
  conflicting_actions: [] as ConflictingAction[],
  is_active: true,
};

const SodRulesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [newAction, setNewAction] = useState({ section: '', action: '' });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['sod-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sod_rules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SodRule[];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        name: values.name,
        description: values.description || null,
        conflicting_actions: values.conflicting_actions as unknown as Json,
        is_active: values.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from('sod_rules').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sod_rules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sod-rules'] });
      toast.success(editingId ? 'تم تحديث القاعدة' : 'تم إنشاء القاعدة');
      closeDialog();
    },
    onError: () => toast.error('حدث خطأ أثناء الحفظ'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sod_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sod-rules'] });
      toast.success('تم حذف القاعدة');
    },
    onError: () => toast.error('حدث خطأ أثناء الحذف'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('sod_rules').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sod-rules'] }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(initialForm);
    setNewAction({ section: '', action: '' });
  };

  const openEdit = (rule: SodRule) => {
    setEditingId(rule.id);
    const actions = (Array.isArray(rule.conflicting_actions)
      ? rule.conflicting_actions
      : []) as unknown as ConflictingAction[];
    setForm({
      name: rule.name,
      description: rule.description || '',
      conflicting_actions: actions,
      is_active: rule.is_active,
    });
    setDialogOpen(true);
  };

  const addConflictingAction = () => {
    if (newAction.section && newAction.action) {
      setForm((prev) => ({
        ...prev,
        conflicting_actions: [...prev.conflicting_actions, { ...newAction }],
      }));
      setNewAction({ section: '', action: '' });
    }
  };

  const removeConflictingAction = (index: number) => {
    setForm((prev) => ({
      ...prev,
      conflicting_actions: prev.conflicting_actions.filter((_, i) => i !== index),
    }));
  };

  const getConflictingActions = (rule: SodRule): ConflictingAction[] => {
    return (Array.isArray(rule.conflicting_actions) ? rule.conflicting_actions : []) as unknown as ConflictingAction[];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">قواعد فصل المهام</h1>
          <p className="text-muted-foreground">منع تحكم مستخدم واحد في العملية بالكامل</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          قاعدة جديدة
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">لا توجد قواعد فصل مهام بعد</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              إضافة أول قاعدة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const actions = getConflictingActions(rule);
            return (
              <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 mt-0.5">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{rule.name}</h3>
                          {!rule.is_active && <Badge variant="secondary">معطل</Badge>}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                        )}
                        {actions.length > 0 && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {actions.map((action, idx) => (
                              <span key={idx} className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {sectionLabels[action.section] || action.section} → {actionLabels[action.action] || action.action}
                                </Badge>
                                {idx < actions.length - 1 && (
                                  <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, is_active: checked })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('هل أنت متأكد من حذف هذه القاعدة؟')) {
                            deleteMutation.mutate(rule.id);
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'تعديل قاعدة فصل المهام' : 'إضافة قاعدة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم القاعدة</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: منع إنشاء واعتماد نفس الفاتورة"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="وصف تفصيلي للقاعدة..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>الإجراءات المتعارضة</Label>
              <div className="space-y-2">
                {form.conflicting_actions.map((action, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Badge variant="outline" className="flex-1">
                      {sectionLabels[action.section] || action.section} → {actionLabels[action.action] || action.action}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeConflictingAction(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Select value={newAction.section} onValueChange={(v) => setNewAction({ ...newAction, section: v })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="القسم" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(sectionLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newAction.action} onValueChange={(v) => setNewAction({ ...newAction, action: v })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="الإجراء" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(actionLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addConflictingAction}
                  disabled={!newAction.section || !newAction.action}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.name.trim() || form.conflicting_actions.length < 2}
            >
              {saveMutation.isPending ? 'جاري الحفظ...' : editingId ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SodRulesPage;
