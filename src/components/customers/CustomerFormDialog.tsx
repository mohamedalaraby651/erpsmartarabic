import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { customerSchema, type CustomerFormData } from "@/lib/validations";
import { verifyPermissionOnServer, verifyFinancialLimit } from "@/lib/api/secureOperations";
import { egyptGovernorates, egyptCities } from "@/lib/egyptLocations";
import type { Database } from "@/integrations/supabase/types";
import { User, Phone, MapPin, Wallet, FileText, Building2 } from "lucide-react";

type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerCategory = Database['public']['Tables']['customer_categories']['Row'];

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
}

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 pt-4 pb-2">
    <Icon className="h-4 w-4 text-primary" />
    <h3 className="text-sm font-semibold text-primary">{title}</h3>
    <Separator className="flex-1" />
  </div>
);

const CustomerFormDialog = ({ open, onOpenChange, customer }: CustomerFormDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!customer;

  const { data: categories = [] } = useQuery({
    queryKey: ['customer-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as CustomerCategory[];
    },
  });

  const defaultValues: CustomerFormData = {
    name: '', customer_type: 'individual', vip_level: 'regular',
    phone: '', phone2: '', email: '', tax_number: '', credit_limit: 0,
    category_id: '', notes: '', is_active: true,
    governorate: '', city: '', discount_percentage: 0,
    contact_person: '', contact_person_role: '',
    payment_terms_days: 0, preferred_payment_method: '',
    facebook_url: '', website_url: '',
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });

  const customerType = watch('customer_type');
  const selectedGovernorate = watch('governorate');

  const cities = useMemo(() => {
    if (!selectedGovernorate) return [];
    return egyptCities[selectedGovernorate] || [];
  }, [selectedGovernorate]);

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        customer_type: customer.customer_type,
        vip_level: customer.vip_level,
        phone: customer.phone || '',
        phone2: customer.phone2 || '',
        email: customer.email || '',
        tax_number: customer.tax_number || '',
        credit_limit: Number(customer.credit_limit) || 0,
        category_id: customer.category_id || '',
        notes: customer.notes || '',
        is_active: customer.is_active ?? true,
        governorate: customer.governorate || '',
        city: customer.city || '',
        discount_percentage: Number(customer.discount_percentage) || 0,
        contact_person: customer.contact_person || '',
        contact_person_role: customer.contact_person_role || '',
        payment_terms_days: Number(customer.payment_terms_days) || 0,
        preferred_payment_method: customer.preferred_payment_method || '',
        facebook_url: customer.facebook_url || '',
        website_url: customer.website_url || '',
      });
    } else {
      reset(defaultValues);
    }
  }, [customer, reset]);

  const mutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      // Sanitize text fields to remove hidden Bidi control chars
      const sanitize = (val: string | undefined | null) => 
        val?.trim().replace(/[\u200E\u200F\u061C\u200B\u200C\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/g, '') || null;
      
      const payload: Database['public']['Tables']['customers']['Insert'] = {
        name: sanitize(data.name) || data.name.trim(),
        customer_type: data.customer_type,
        vip_level: data.vip_level,
        phone: sanitize(data.phone),
        phone2: sanitize(data.phone2),
        email: data.email?.trim().toLowerCase() || null,
        tax_number: sanitize(data.tax_number),
        credit_limit: data.credit_limit,
        category_id: data.category_id || null,
        notes: sanitize(data.notes),
        is_active: data.is_active,
        governorate: sanitize(data.governorate),
        city: sanitize(data.city),
        discount_percentage: data.discount_percentage || 0,
        contact_person: sanitize(data.contact_person),
        contact_person_role: sanitize(data.contact_person_role),
        payment_terms_days: data.payment_terms_days || 0,
        preferred_payment_method: data.preferred_payment_method || null,
        facebook_url: sanitize(data.facebook_url),
        website_url: sanitize(data.website_url),
      };

      if (isEditing) {
        const { error } = await supabase.from('customers').update(payload).eq('id', customer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customer?.id] });
      toast({ title: isEditing ? "تم تحديث العميل بنجاح" : "تم إضافة العميل بنجاح" });
      onOpenChange(false);
    },
    onError: (error) => {
      logErrorSafely('CustomerFormDialog', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    const action = isEditing ? 'edit' : 'create';
    const hasPermission = await verifyPermissionOnServer('customers', action);
    if (!hasPermission) {
      toast({ title: "غير مصرح", description: `ليس لديك صلاحية ${isEditing ? 'تعديل' : 'إضافة'} العملاء`, variant: "destructive" });
      return;
    }
    if (data.credit_limit && data.credit_limit > 0) {
      const creditAllowed = await verifyFinancialLimit('credit', data.credit_limit);
      if (!creditAllowed) {
        toast({ title: "تجاوز الحد المسموح", description: `الحد الائتماني (${data.credit_limit.toLocaleString()} ج.م) يتجاوز الحد المسموح لك`, variant: "destructive" });
        return;
      }
    }
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل العميل' : 'إضافة عميل جديد'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          {/* === المعلومات الأساسية === */}
          <SectionHeader icon={User} title="المعلومات الأساسية" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">اسم العميل *</Label>
              <Input id="name" {...register('name')} placeholder="أدخل اسم العميل" />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label>نوع العميل</Label>
              <Select value={watch('customer_type')} onValueChange={(v) => setValue('customer_type', v as CustomerFormData['customer_type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">فرد</SelectItem>
                  <SelectItem value="company">شركة</SelectItem>
                  <SelectItem value="farm">مزرعة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>التصنيف</Label>
              <Select value={watch('category_id')} onValueChange={(v) => setValue('category_id', v)}>
                <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>مستوى VIP</Label>
              <Select value={watch('vip_level')} onValueChange={(v) => setValue('vip_level', v as CustomerFormData['vip_level'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">عادي</SelectItem>
                  <SelectItem value="silver">فضي</SelectItem>
                  <SelectItem value="gold">ذهبي</SelectItem>
                  <SelectItem value="platinum">بلاتيني</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* === الشخص المسؤول (يظهر للشركات فقط) === */}
          {customerType === 'company' && (
            <>
              <SectionHeader icon={Building2} title="الشخص المسؤول" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_person">اسم المسؤول</Label>
                  <Input id="contact_person" {...register('contact_person')} placeholder="اسم الشخص المسؤول" />
                </div>
                <div>
                  <Label htmlFor="contact_person_role">المنصب</Label>
                  <Input id="contact_person_role" {...register('contact_person_role')} placeholder="مثال: مدير المشتريات" />
                </div>
              </div>
            </>
          )}

          {/* === معلومات الاتصال === */}
          <SectionHeader icon={Phone} title="معلومات الاتصال" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">الهاتف</Label>
              <Input id="phone" {...register('phone')} placeholder="رقم الهاتف" />
            </div>
            <div>
              <Label htmlFor="phone2">هاتف إضافي</Label>
              <Input id="phone2" {...register('phone2')} placeholder="رقم هاتف إضافي" />
            </div>
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" {...register('email')} placeholder="البريد الإلكتروني" />
            </div>
            <div>
              <Label htmlFor="facebook_url">فيسبوك</Label>
              <Input id="facebook_url" {...register('facebook_url')} placeholder="رابط صفحة فيسبوك" />
            </div>
            <div>
              <Label htmlFor="website_url">الموقع الإلكتروني</Label>
              <Input id="website_url" {...register('website_url')} placeholder="https://..." />
            </div>
          </div>

          {/* === الموقع الجغرافي === */}
          <SectionHeader icon={MapPin} title="الموقع الجغرافي" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>المحافظة</Label>
              <Select
                value={watch('governorate') || ''}
                onValueChange={(v) => { setValue('governorate', v); setValue('city', ''); }}
              >
                <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                <SelectContent>
                  {egyptGovernorates.map((gov) => (
                    <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المدينة / المركز</Label>
              <Select
                value={watch('city') || ''}
                onValueChange={(v) => setValue('city', v)}
                disabled={!selectedGovernorate}
              >
                <SelectTrigger><SelectValue placeholder={selectedGovernorate ? "اختر المدينة" : "اختر المحافظة أولاً"} /></SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* === المعلومات المالية === */}
          <SectionHeader icon={Wallet} title="المعلومات المالية" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="credit_limit">حد الائتمان (ج.م)</Label>
              <Input id="credit_limit" type="number" {...register('credit_limit', { valueAsNumber: true })} placeholder="0" />
            </div>
            <div>
              <Label htmlFor="discount_percentage">نسبة الخصم (%)</Label>
              <Input id="discount_percentage" type="number" {...register('discount_percentage', { valueAsNumber: true })} placeholder="0" min={0} max={100} />
              {errors.discount_percentage && <p className="text-sm text-destructive mt-1">{errors.discount_percentage.message}</p>}
            </div>
            <div>
              <Label htmlFor="payment_terms_days">مدة السداد (أيام)</Label>
              <Input id="payment_terms_days" type="number" {...register('payment_terms_days', { valueAsNumber: true })} placeholder="0" />
            </div>
            <div>
              <Label>طريقة الدفع المفضلة</Label>
              <Select value={watch('preferred_payment_method') || ''} onValueChange={(v) => setValue('preferred_payment_method', v)}>
                <SelectTrigger><SelectValue placeholder="اختر طريقة الدفع" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="credit">آجل</SelectItem>
                  <SelectItem value="installment">أقساط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tax_number">الرقم الضريبي</Label>
              <Input id="tax_number" {...register('tax_number')} placeholder="الرقم الضريبي" />
            </div>
          </div>

          {/* === ملاحظات === */}
          <SectionHeader icon={FileText} title="ملاحظات" />
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">ملاحظات إضافية</Label>
              <Textarea id="notes" {...register('notes')} placeholder="ملاحظات إضافية..." rows={3} />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="is_active" checked={watch('is_active')} onCheckedChange={(checked) => setValue('is_active', checked)} />
              <Label htmlFor="is_active">عميل نشط</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
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

export default CustomerFormDialog;
