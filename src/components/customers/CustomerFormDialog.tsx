import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerCategory = Database['public']['Tables']['customer_categories']['Row'];

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
}

interface FormData {
  name: string;
  customer_type: 'individual' | 'company';
  vip_level: 'regular' | 'silver' | 'gold' | 'platinum';
  phone: string;
  phone2: string;
  email: string;
  tax_number: string;
  credit_limit: number;
  category_id: string;
  notes: string;
  is_active: boolean;
}

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

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      customer_type: 'individual',
      vip_level: 'regular',
      phone: '',
      phone2: '',
      email: '',
      tax_number: '',
      credit_limit: 0,
      category_id: '',
      notes: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        customer_type: customer.customer_type as 'individual' | 'company',
        vip_level: customer.vip_level as 'regular' | 'silver' | 'gold' | 'platinum',
        phone: customer.phone || '',
        phone2: customer.phone2 || '',
        email: customer.email || '',
        tax_number: customer.tax_number || '',
        credit_limit: Number(customer.credit_limit) || 0,
        category_id: customer.category_id || '',
        notes: customer.notes || '',
        is_active: customer.is_active ?? true,
      });
    } else {
      reset({
        name: '',
        customer_type: 'individual',
        vip_level: 'regular',
        phone: '',
        phone2: '',
        email: '',
        tax_number: '',
        credit_limit: 0,
        category_id: '',
        notes: '',
        is_active: true,
      });
    }
  }, [customer, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: CustomerInsert = {
        name: data.name,
        customer_type: data.customer_type,
        vip_level: data.vip_level,
        phone: data.phone || null,
        phone2: data.phone2 || null,
        email: data.email || null,
        tax_number: data.tax_number || null,
        credit_limit: data.credit_limit,
        category_id: data.category_id || null,
        notes: data.notes || null,
        is_active: data.is_active,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', customer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customers')
          .insert(payload);
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
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل العميل' : 'إضافة عميل جديد'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <Label htmlFor="name">اسم العميل *</Label>
              <Input
                id="name"
                {...register('name', { required: 'اسم العميل مطلوب' })}
                placeholder="أدخل اسم العميل"
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>

            {/* Customer Type */}
            <div>
              <Label>نوع العميل</Label>
              <Select
                value={watch('customer_type')}
                onValueChange={(value: 'individual' | 'company') => setValue('customer_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">فرد</SelectItem>
                  <SelectItem value="company">شركة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* VIP Level */}
            <div>
              <Label>مستوى VIP</Label>
              <Select
                value={watch('vip_level')}
                onValueChange={(value: 'regular' | 'silver' | 'gold' | 'platinum') => setValue('vip_level', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">عادي</SelectItem>
                  <SelectItem value="silver">فضي</SelectItem>
                  <SelectItem value="gold">ذهبي</SelectItem>
                  <SelectItem value="platinum">بلاتيني</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone">الهاتف</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="رقم الهاتف"
              />
            </div>

            {/* Phone 2 */}
            <div>
              <Label htmlFor="phone2">هاتف إضافي</Label>
              <Input
                id="phone2"
                {...register('phone2')}
                placeholder="رقم هاتف إضافي"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="البريد الإلكتروني"
              />
            </div>

            {/* Tax Number */}
            <div>
              <Label htmlFor="tax_number">الرقم الضريبي</Label>
              <Input
                id="tax_number"
                {...register('tax_number')}
                placeholder="الرقم الضريبي"
              />
            </div>

            {/* Credit Limit */}
            <div>
              <Label htmlFor="credit_limit">سقف الائتمان (ج.م)</Label>
              <Input
                id="credit_limit"
                type="number"
                {...register('credit_limit', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>

            {/* Category */}
            <div>
              <Label>التصنيف</Label>
              <Select
                value={watch('category_id')}
                onValueChange={(value) => setValue('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="ملاحظات إضافية..."
                rows={3}
              />
            </div>

            {/* Is Active */}
            <div className="md:col-span-2 flex items-center gap-3">
              <Switch
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
              <Label htmlFor="is_active">عميل نشط</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
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

export default CustomerFormDialog;
