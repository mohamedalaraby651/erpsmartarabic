import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PageHeader from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Shield, Save, Loader2, Users, Package, Receipt, FileText, Truck, Warehouse, CreditCard, BarChart3 } from 'lucide-react';

const sections = [
  { id: 'customers', name: 'العملاء', icon: Users, color: 'text-blue-600' },
  { id: 'products', name: 'المنتجات', icon: Package, color: 'text-emerald-600' },
  { id: 'categories', name: 'التصنيفات', icon: Package, color: 'text-emerald-600' },
  { id: 'inventory', name: 'المخزون', icon: Warehouse, color: 'text-emerald-600' },
  { id: 'suppliers', name: 'الموردين', icon: Truck, color: 'text-emerald-600' },
  { id: 'purchase_orders', name: 'أوامر الشراء', icon: FileText, color: 'text-emerald-600' },
  { id: 'quotations', name: 'عروض الأسعار', icon: FileText, color: 'text-blue-600' },
  { id: 'sales_orders', name: 'أوامر البيع', icon: FileText, color: 'text-blue-600' },
  { id: 'invoices', name: 'الفواتير', icon: Receipt, color: 'text-blue-600' },
  { id: 'payments', name: 'التحصيل', icon: CreditCard, color: 'text-blue-600' },
  { id: 'reports', name: 'التقارير', icon: BarChart3, color: 'text-slate-600' },
];

const actions = [
  { id: 'can_view', name: 'عرض' },
  { id: 'can_create', name: 'إنشاء' },
  { id: 'can_edit', name: 'تعديل' },
  { id: 'can_delete', name: 'حذف' },
];

export default function PermissionsPage() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});

  const { data: roles } = useQuery({
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

  const { data: existingPermissions, isLoading } = useQuery({
    queryKey: ['role-permissions', selectedRoleId],
    queryFn: async () => {
      if (!selectedRoleId) return [];
      
      const { data, error } = await supabase
        .from('role_section_permissions')
        .select('*')
        .eq('role_id', selectedRoleId);
      
      if (error) throw error;
      
      // Convert to state format
      const permMap: Record<string, Record<string, boolean>> = {};
      data?.forEach(p => {
        permMap[p.section] = {
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        };
      });
      setPermissions(permMap);
      
      return data;
    },
    enabled: !!selectedRoleId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete existing permissions for this role
      await supabase
        .from('role_section_permissions')
        .delete()
        .eq('role_id', selectedRoleId);
      
      // Insert new permissions
      const newPermissions = Object.entries(permissions).map(([section, perms]) => ({
        role_id: selectedRoleId,
        section,
        can_view: perms.can_view || false,
        can_create: perms.can_create || false,
        can_edit: perms.can_edit || false,
        can_delete: perms.can_delete || false,
      }));
      
      if (newPermissions.length > 0) {
        const { error } = await supabase
          .from('role_section_permissions')
          .insert(newPermissions);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('تم حفظ الصلاحيات بنجاح');
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ');
    },
  });

  const togglePermission = (section: string, action: string) => {
    setPermissions(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [action]: !(prev[section]?.[action] || false),
      },
    }));
  };

  const toggleAllForSection = (section: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [section]: {
        can_view: value,
        can_create: value,
        can_edit: value,
        can_delete: value,
      },
    }));
  };

  const selectedRole = roles?.find(r => r.id === selectedRoleId);

  return (
    <div>
      <PageHeader
        title="إدارة الصلاحيات"
        description="تحديد صلاحيات كل دور على الأقسام المختلفة"
        showBack
        actions={
          selectedRoleId && (
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              حفظ الصلاحيات
            </Button>
          )
        }
      />

      <div className="space-y-6">
        {/* Role Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              اختر الدور
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="اختر دوراً لتعديل صلاحياته" />
              </SelectTrigger>
              <SelectContent>
                {roles?.map((role) => (
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
          </CardContent>
        </Card>

        {/* Permissions Grid */}
        {selectedRoleId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                صلاحيات {selectedRole?.name}
                {selectedRole?.is_system && (
                  <Badge variant="secondary">نظامي</Badge>
                )}
              </CardTitle>
              <CardDescription>
                حدد الصلاحيات المتاحة لهذا الدور على كل قسم
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <Accordion type="multiple" className="space-y-2">
                    {sections.map((section) => {
                      const Icon = section.icon;
                      const sectionPerms = permissions[section.id] || {};
                      const allChecked = actions.every(a => sectionPerms[a.id]);
                      const someChecked = actions.some(a => sectionPerms[a.id]);
                      
                      return (
                        <AccordionItem
                          key={section.id}
                          value={section.id}
                          className="border rounded-lg px-4"
                        >
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={allChecked}
                                onCheckedChange={(checked) => {
                                  toggleAllForSection(section.id, !!checked);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Icon className={`h-5 w-5 ${section.color}`} />
                              <span className="font-medium">{section.name}</span>
                              {someChecked && !allChecked && (
                                <Badge variant="outline" className="text-xs">
                                  بعض الصلاحيات
                                </Badge>
                              )}
                              {allChecked && (
                                <Badge className="text-xs bg-success">
                                  كل الصلاحيات
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                              {actions.map((action) => (
                                <label
                                  key={action.id}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={sectionPerms[action.id] || false}
                                    onCheckedChange={() => togglePermission(section.id, action.id)}
                                  />
                                  <span>{action.name}</span>
                                </label>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
