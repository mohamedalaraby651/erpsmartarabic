import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSafeErrorMessage, logErrorSafely } from '@/lib/errorHandler';
import PageHeader from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Settings, Plus, Save, Loader2, GripVertical, Trash2 } from 'lucide-react';

const sectionsList = [
  { id: 'customers', name: 'العملاء' },
  { id: 'products', name: 'المنتجات' },
  { id: 'categories', name: 'التصنيفات' },
  { id: 'inventory', name: 'المخزون' },
  { id: 'suppliers', name: 'الموردين' },
  { id: 'purchase_orders', name: 'أوامر الشراء' },
  { id: 'quotations', name: 'عروض الأسعار' },
  { id: 'sales_orders', name: 'أوامر البيع' },
  { id: 'invoices', name: 'الفواتير' },
  { id: 'payments', name: 'التحصيل' },
];

const defaultFields: Record<string, { name: string; label: string }[]> = {
  customers: [
    { name: 'name', label: 'اسم العميل' },
    { name: 'phone', label: 'رقم الهاتف' },
    { name: 'email', label: 'البريد الإلكتروني' },
    { name: 'customer_type', label: 'نوع العميل' },
    { name: 'vip_level', label: 'مستوى VIP' },
    { name: 'credit_limit', label: 'حد الائتمان' },
    { name: 'tax_number', label: 'الرقم الضريبي' },
    { name: 'notes', label: 'ملاحظات' },
  ],
  products: [
    { name: 'name', label: 'اسم المنتج' },
    { name: 'sku', label: 'كود المنتج' },
    { name: 'selling_price', label: 'سعر البيع' },
    { name: 'cost_price', label: 'سعر التكلفة' },
    { name: 'category_id', label: 'التصنيف' },
    { name: 'min_stock', label: 'الحد الأدنى للمخزون' },
    { name: 'description', label: 'الوصف' },
  ],
  invoices: [
    { name: 'invoice_number', label: 'رقم الفاتورة' },
    { name: 'customer_id', label: 'العميل' },
    { name: 'total_amount', label: 'المبلغ الإجمالي' },
    { name: 'discount_amount', label: 'الخصم' },
    { name: 'tax_amount', label: 'الضريبة' },
    { name: 'payment_status', label: 'حالة الدفع' },
    { name: 'due_date', label: 'تاريخ الاستحقاق' },
    { name: 'notes', label: 'ملاحظات' },
  ],
};

export default function CustomizationsPage() {
  const queryClient = useQueryClient();
  const [selectedSection, setSelectedSection] = useState<string>('customers');
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [newField, setNewField] = useState({
    field_name: '',
    custom_label: '',
    field_type: 'text',
  });

  const { data: customizations, isLoading } = useQuery({
    queryKey: ['section-customizations', selectedSection],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('section_customizations')
        .select('*')
        .eq('section', selectedSection)
        .order('sort_order');
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSection,
  });

  const saveMutation = useMutation({
    mutationFn: async (customization: {
      section: string;
      field_name: string;
      custom_label?: string;
      is_visible?: boolean;
      sort_order?: number;
      is_custom_field?: boolean;
      field_type?: string;
    }) => {
      const { error } = await supabase
        .from('section_customizations')
        .upsert(customization, {
          onConflict: 'section,field_name',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-customizations'] });
      toast.success('تم الحفظ');
    },
    onError: (error: unknown) => {
      logErrorSafely('CustomizationsPage.saveMutation', error);
      toast.error(getSafeErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('section_customizations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-customizations'] });
      toast.success('تم الحذف');
    },
  });

  const addCustomField = () => {
    if (!newField.field_name || !newField.custom_label) return;
    
    saveMutation.mutate({
      section: selectedSection,
      field_name: newField.field_name,
      custom_label: newField.custom_label,
      is_custom_field: true,
      field_type: newField.field_type,
      is_visible: true,
      sort_order: (customizations?.length || 0) + 1,
    });
    
    setNewField({ field_name: '', custom_label: '', field_type: 'text' });
    setAddFieldOpen(false);
  };

  const toggleVisibility = (fieldName: string, isVisible: boolean) => {
    saveMutation.mutate({
      section: selectedSection,
      field_name: fieldName,
      is_visible: isVisible,
    });
  };

  const updateLabel = (fieldName: string, label: string) => {
    saveMutation.mutate({
      section: selectedSection,
      field_name: fieldName,
      custom_label: label,
    });
  };

  // Merge default fields with customizations
  const sectionFields = defaultFields[selectedSection] || [];
  const mergedFields = sectionFields.map(field => {
    const customization = customizations?.find(c => c.field_name === field.name);
    return {
      ...field,
      custom_label: customization?.custom_label || null,
      is_visible: customization?.is_visible ?? true,
      is_custom_field: false,
      id: customization?.id,
    };
  });

  // Add custom fields
  const customFields = customizations?.filter(c => c.is_custom_field) || [];
  const allFields = [...mergedFields, ...customFields.map(c => ({
    name: c.field_name,
    label: c.custom_label || c.field_name,
    custom_label: c.custom_label,
    is_visible: c.is_visible,
    is_custom_field: true,
    id: c.id,
    field_type: c.field_type,
  }))];

  return (
    <div>
      <PageHeader
        title="تخصيص الأقسام"
        description="تعديل الحقول والتسميات لكل قسم"
        showBack
      />

      <div className="space-y-6">
        {/* Section Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              اختر القسم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="اختر قسماً" />
              </SelectTrigger>
              <SelectContent>
                {sectionsList.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Fields Customization */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>حقول القسم</CardTitle>
              <CardDescription>
                تخصيص الحقول وإخفائها وتغيير تسمياتها
              </CardDescription>
            </div>
            <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 ml-2" />
                  حقل مخصص
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة حقل مخصص</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>اسم الحقل (بالإنجليزية)</Label>
                    <Input
                      value={newField.field_name}
                      onChange={(e) => setNewField({ ...newField, field_name: e.target.value })}
                      placeholder="custom_field_1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>التسمية المعروضة</Label>
                    <Input
                      value={newField.custom_label}
                      onChange={(e) => setNewField({ ...newField, custom_label: e.target.value })}
                      placeholder="اسم الحقل المخصص"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>نوع الحقل</Label>
                    <Select
                      value={newField.field_type}
                      onValueChange={(v) => setNewField({ ...newField, field_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">نص</SelectItem>
                        <SelectItem value="number">رقم</SelectItem>
                        <SelectItem value="date">تاريخ</SelectItem>
                        <SelectItem value="select">قائمة اختيار</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addCustomField} className="w-full">
                    إضافة
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>الحقل</TableHead>
                    <TableHead>التسمية الأصلية</TableHead>
                    <TableHead>التسمية المخصصة</TableHead>
                    <TableHead>مرئي</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allFields.map((field) => (
                    <TableRow key={field.name}>
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {field.name}
                      </TableCell>
                      <TableCell>{field.label}</TableCell>
                      <TableCell>
                        <Input
                          defaultValue={field.custom_label || ''}
                          placeholder={field.label}
                          className="h-8"
                          onBlur={(e) => {
                            if (e.target.value !== (field.custom_label || '')) {
                              updateLabel(field.name, e.target.value);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={field.is_visible}
                          onCheckedChange={(checked) => toggleVisibility(field.name, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        {field.is_custom_field ? (
                          <Badge variant="outline">{(field as any).field_type || 'text'}</Badge>
                        ) : (
                          <Badge variant="secondary">نظامي</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {field.is_custom_field && field.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(field.id!)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
