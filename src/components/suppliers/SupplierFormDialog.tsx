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
import { Separator } from "@/components/ui/separator";
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
import { User, Phone, Building2, CreditCard, MapPin, DollarSign } from "lucide-react";
import { egyptGovernorates, getCitiesByGovernorate } from "@/lib/egyptLocations";
import { AdaptiveContainer } from "@/components/mobile/AdaptiveContainer";
import { FullScreenForm } from "@/components/mobile/FullScreenForm";

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: any;
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
  governorate: string;
  city: string;
  discount_percentage: number;
  payment_terms_days: number;
  preferred_payment_method: string;
  credit_limit: number;
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

const paymentMethods = [
  { value: 'cash', label: 'نقدي' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'check', label: 'شيك' },
  { value: 'credit', label: 'آجل' },
];

const SectionHeader = ({ icon: Icon, title, color }: { icon: any; title: string; color: string }) => (
  <div className="flex items-center gap-2 pt-4 pb-2">
    <Icon className={`h-5 w-5 ${color}`} />
    <h3 className="font-semibold text-base">{title}</h3>
    <Separator className="flex-1" />
  </div>
);

const SupplierFormDialog = ({ open, onOpenChange, supplier }: SupplierFormDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!supplier;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '', contact_person: '', phone: '', phone2: '', email: '', address: '',
      tax_number: '', notes: '', is_active: true, image_url: '', supplier_type: 'local',
      category: 'other', bank_name: '', bank_account: '', iban: '', website: '',
      governorate: '', city: '', discount_percentage: 0, payment_terms_days: 0,
      preferred_payment_method: '', credit_limit: 0,
    },
  });

  const selectedGovernorate = watch('governorate');
  const cities = selectedGovernorate ? getCitiesByGovernorate(selectedGovernorate) : [];

  useEffect(() => {
    if (supplier) {
      reset({
        name: supplier.name, contact_person: supplier.contact_person || '',
        phone: supplier.phone || '', phone2: supplier.phone2 || '',
        email: supplier.email || '', address: supplier.address || '',
        tax_number: supplier.tax_number || '', notes: supplier.notes || '',
        is_active: supplier.is_active ?? true, image_url: supplier.image_url || '',
        supplier_type: supplier.supplier_type || 'local', category: supplier.category || 'other',
        bank_name: supplier.bank_name || '', bank_account: supplier.bank_account || '',
        iban: supplier.iban || '', website: supplier.website || '',
        governorate: supplier.governorate || '', city: supplier.city || '',
        discount_percentage: supplier.discount_percentage || 0,
        payment_terms_days: supplier.payment_terms_days || 0,
        preferred_payment_method: supplier.preferred_payment_method || '',
        credit_limit: supplier.credit_limit || 0,
      });
    } else {
      reset({
        name: '', contact_person: '', phone: '', phone2: '', email: '', address: '',
        tax_number: '', notes: '', is_active: true, image_url: '', supplier_type: 'local',
        category: 'other', bank_name: '', bank_account: '', iban: '', website: '',
        governorate: '', city: '', discount_percentage: 0, payment_terms_days: 0,
        preferred_payment_method: '', credit_limit: 0,
      });
    }
  }, [supplier, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: any = {
        name: data.name, contact_person: data.contact_person || null,
        phone: data.phone || null, phone2: data.phone2 || null,
        email: data.email || null, address: data.address || null,
        tax_number: data.tax_number || null, notes: data.notes || null,
        is_active: data.is_active, image_url: data.image_url || null,
        supplier_type: data.supplier_type || null, category: data.category || null,
        bank_name: data.bank_name || null, bank_account: data.bank_account || null,
        iban: data.iban || null, website: data.website || null,
        governorate: data.governorate || null, city: data.city || null,
        discount_percentage: data.discount_percentage || 0,
        payment_terms_days: data.payment_terms_days || 0,
        preferred_payment_method: data.preferred_payment_method || null,
        credit_limit: data.credit_limit || 0,
      };

      if (isEditing) {
        const { error } = await supabase.from('suppliers').update(payload).eq('id', supplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('suppliers').insert(payload);
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

  const imageUrl = watch('image_url');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل المورد' : 'إضافة مورد جديد'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-2">
          {/* Image */}
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

          {/* المعلومات الأساسية */}
          <SectionHeader icon={User} title="المعلومات الأساسية" color="text-primary" />
          <div>
            <Label htmlFor="name">اسم المورد *</Label>
            <Input id="name" {...register('name', { required: 'اسم المورد مطلوب' })} placeholder="اسم الشركة أو المورد" />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>نوع المورد</Label>
              <Select value={watch('supplier_type')} onValueChange={(v) => setValue('supplier_type', v)}>
                <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                <SelectContent>
                  {supplierTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>التصنيف</Label>
              <Select value={watch('category')} onValueChange={(v) => setValue('category', v)}>
                <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* معلومات الاتصال */}
          <SectionHeader icon={Phone} title="معلومات الاتصال" color="text-info" />
          <div>
            <Label>جهة الاتصال</Label>
            <Input {...register('contact_person')} placeholder="اسم المسؤول" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>الهاتف</Label><Input {...register('phone')} placeholder="رقم الهاتف" /></div>
            <div><Label>هاتف إضافي</Label><Input {...register('phone2')} placeholder="رقم هاتف إضافي" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>البريد الإلكتروني</Label><Input type="email" {...register('email')} placeholder="البريد الإلكتروني" /></div>
            <div><Label>الموقع الإلكتروني</Label><Input {...register('website')} placeholder="https://example.com" /></div>
          </div>

          {/* الموقع الجغرافي */}
          <SectionHeader icon={MapPin} title="الموقع الجغرافي" color="text-success" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>المحافظة</Label>
              <Select value={watch('governorate')} onValueChange={(v) => { setValue('governorate', v); setValue('city', ''); }}>
                <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                <SelectContent>
                  {egyptGovernorates.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المدينة / المركز</Label>
              <Select value={watch('city')} onValueChange={(v) => setValue('city', v)} disabled={!selectedGovernorate}>
                <SelectTrigger><SelectValue placeholder={selectedGovernorate ? "اختر المدينة" : "اختر المحافظة أولاً"} /></SelectTrigger>
                <SelectContent>
                  {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>العنوان التفصيلي</Label>
            <Textarea {...register('address')} placeholder="العنوان الكامل" rows={2} />
          </div>

          {/* المعلومات المالية */}
          <SectionHeader icon={DollarSign} title="المعلومات المالية" color="text-warning" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>حد الائتمان</Label><Input type="number" {...register('credit_limit', { valueAsNumber: true })} placeholder="0" /></div>
            <div><Label>نسبة الخصم (%)</Label><Input type="number" step="0.1" {...register('discount_percentage', { valueAsNumber: true })} placeholder="0" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>مدة السداد (أيام)</Label><Input type="number" {...register('payment_terms_days', { valueAsNumber: true })} placeholder="0" /></div>
            <div>
              <Label>طريقة الدفع المفضلة</Label>
              <Select value={watch('preferred_payment_method')} onValueChange={(v) => setValue('preferred_payment_method', v)}>
                <SelectTrigger><SelectValue placeholder="اختر طريقة الدفع" /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>الرقم الضريبي</Label>
            <Input {...register('tax_number')} placeholder="الرقم الضريبي" />
          </div>

          {/* البيانات البنكية */}
          <SectionHeader icon={CreditCard} title="البيانات البنكية" color="text-muted-foreground" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>اسم البنك</Label><Input {...register('bank_name')} placeholder="مثال: البنك الأهلي" /></div>
            <div><Label>رقم الحساب</Label><Input {...register('bank_account')} placeholder="رقم الحساب البنكي" /></div>
          </div>
          <div>
            <Label>IBAN</Label>
            <Input {...register('iban')} placeholder="EG..." className="font-mono" />
          </div>

          {/* ملاحظات */}
          <SectionHeader icon={Building2} title="ملاحظات" color="text-muted-foreground" />
          <Textarea {...register('notes')} placeholder="ملاحظات إضافية..." rows={3} />
          <div className="flex items-center gap-3">
            <Switch id="is_active" checked={watch('is_active')} onCheckedChange={(c) => setValue('is_active', c)} />
            <Label htmlFor="is_active">مورد نشط</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
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