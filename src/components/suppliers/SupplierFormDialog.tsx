import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import ImageUpload from "@/components/shared/ImageUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Phone, Building2, CreditCard, FileText } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'];

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: (Supplier & {
    supplier_type?: string | null;
    category?: string | null;
    bank_name?: string | null;
    bank_account?: string | null;
    iban?: string | null;
    rating?: number | null;
    website?: string | null;
  }) | null;
}

interface FormData {
  name: string;
  contact_person: string;
  phone: string;
  phone2: string;
  email: string;
  address: string;
  tax_number: string;
  notes: string;
  is_active: boolean;
  image_url: string;
  supplier_type: string;
  category: string;
  bank_name: string;
  bank_account: string;
  iban: string;
  website: string;
}

const supplierTypes = [
  { value: 'local', label: 'محلي' },
  { value: 'international', label: 'دولي' },
];

const categories = [
  { value: 'raw_materials', label: 'مواد خام' },
  { value: 'spare_parts', label: 'قطع غيار' },
  { value: 'services', label: 'خدمات' },
  { value: 'equipment', label: 'معدات' },
  { value: 'packaging', label: 'تغليف' },
  { value: 'logistics', label: 'خدمات لوجستية' },
  { value: 'other', label: 'أخرى' },
];

const SupplierFormDialog = ({ open, onOpenChange, supplier }: SupplierFormDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!supplier;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      contact_person: '',
      phone: '',
      phone2: '',
      email: '',
      address: '',
      tax_number: '',
      notes: '',
      is_active: true,
      image_url: '',
      supplier_type: 'local',
      category: 'other',
      bank_name: '',
      bank_account: '',
      iban: '',
      website: '',
    },
  });

  useEffect(() => {
    if (supplier) {
      reset({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        phone2: supplier.phone2 || '',
        email: supplier.email || '',
        address: supplier.address || '',
        tax_number: supplier.tax_number || '',
        notes: supplier.notes || '',
        is_active: supplier.is_active ?? true,
        image_url: supplier.image_url || '',
        supplier_type: supplier.supplier_type || 'local',
        category: supplier.category || 'other',
        bank_name: supplier.bank_name || '',
        bank_account: supplier.bank_account || '',
        iban: supplier.iban || '',
        website: supplier.website || '',
      });
    } else {
      reset({
        name: '',
        contact_person: '',
        phone: '',
        phone2: '',
        email: '',
        address: '',
        tax_number: '',
        notes: '',
        is_active: true,
        image_url: '',
        supplier_type: 'local',
        category: 'other',
        bank_name: '',
        bank_account: '',
        iban: '',
        website: '',
      });
    }
  }, [supplier, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name: data.name,
        contact_person: data.contact_person || null,
        phone: data.phone || null,
        phone2: data.phone2 || null,
        email: data.email || null,
        address: data.address || null,
        tax_number: data.tax_number || null,
        notes: data.notes || null,
        is_active: data.is_active,
        image_url: data.image_url || null,
        supplier_type: data.supplier_type || null,
        category: data.category || null,
        bank_name: data.bank_name || null,
        bank_account: data.bank_account || null,
        iban: data.iban || null,
        website: data.website || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('suppliers')
          .update(payload)
          .eq('id', supplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', supplier?.id] });
      toast({ title: isEditing ? "تم تحديث المورد بنجاح" : "تم إضافة المورد بنجاح" });
      onOpenChange(false);
    },
    onError: (error) => {
      logErrorSafely('SupplierFormDialog', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const imageUrl = watch('image_url');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل المورد' : 'إضافة مورد جديد'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Image Upload Section */}
          <div className="flex justify-center py-4 border-b">
            <ImageUpload
              currentImageUrl={imageUrl}
              onImageUploaded={(url) => setValue('image_url', url)}
              onImageRemoved={() => setValue('image_url', '')}
              bucket="supplier-images"
              folder="suppliers"
              size="lg"
              fallback={watch('name')?.slice(0, 2) || 'مو'}
            />
          </div>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="gap-2">
                <User className="h-4 w-4" />
                أساسي
              </TabsTrigger>
              <TabsTrigger value="contact" className="gap-2">
                <Phone className="h-4 w-4" />
                الاتصال
              </TabsTrigger>
              <TabsTrigger value="business" className="gap-2">
                <Building2 className="h-4 w-4" />
                العمل
              </TabsTrigger>
              <TabsTrigger value="bank" className="gap-2">
                <CreditCard className="h-4 w-4" />
                البنك
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">اسم المورد *</Label>
                <Input
                  id="name"
                  {...register('name', { required: 'اسم المورد مطلوب' })}
                  placeholder="اسم الشركة أو المورد"
                />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier_type">نوع المورد</Label>
                  <Select
                    value={watch('supplier_type')}
                    onValueChange={(value) => setValue('supplier_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">التصنيف</Label>
                  <Select
                    value={watch('category')}
                    onValueChange={(value) => setValue('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر التصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="is_active"
                  checked={watch('is_active')}
                  onCheckedChange={(checked) => setValue('is_active', checked)}
                />
                <Label htmlFor="is_active">مورد نشط</Label>
              </div>
            </TabsContent>

            {/* Contact Info Tab */}
            <TabsContent value="contact" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="contact_person">جهة الاتصال</Label>
                <Input
                  id="contact_person"
                  {...register('contact_person')}
                  placeholder="اسم المسؤول"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">الهاتف</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="رقم الهاتف"
                  />
                </div>

                <div>
                  <Label htmlFor="phone2">هاتف إضافي</Label>
                  <Input
                    id="phone2"
                    {...register('phone2')}
                    placeholder="رقم هاتف إضافي"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="البريد الإلكتروني"
                />
              </div>

              <div>
                <Label htmlFor="website">الموقع الإلكتروني</Label>
                <Input
                  id="website"
                  {...register('website')}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <Label htmlFor="address">العنوان</Label>
                <Textarea
                  id="address"
                  {...register('address')}
                  placeholder="العنوان الكامل"
                  rows={2}
                />
              </div>
            </TabsContent>

            {/* Business Info Tab */}
            <TabsContent value="business" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="tax_number">الرقم الضريبي</Label>
                <Input
                  id="tax_number"
                  {...register('tax_number')}
                  placeholder="الرقم الضريبي"
                />
              </div>

              <div>
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="ملاحظات إضافية..."
                  rows={4}
                />
              </div>
            </TabsContent>

            {/* Bank Info Tab */}
            <TabsContent value="bank" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="bank_name">اسم البنك</Label>
                <Input
                  id="bank_name"
                  {...register('bank_name')}
                  placeholder="مثال: البنك الأهلي"
                />
              </div>

              <div>
                <Label htmlFor="bank_account">رقم الحساب</Label>
                <Input
                  id="bank_account"
                  {...register('bank_account')}
                  placeholder="رقم الحساب البنكي"
                />
              </div>

              <div>
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  {...register('iban')}
                  placeholder="EG..."
                  className="font-mono"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إضافة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierFormDialog;
