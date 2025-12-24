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
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'];

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
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
}

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
      toast({ title: isEditing ? "تم تحديث المورد بنجاح" : "تم إضافة المورد بنجاح" });
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
          <DialogTitle>{isEditing ? 'تعديل المورد' : 'إضافة مورد جديد'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">اسم المورد *</Label>
              <Input
                id="name"
                {...register('name', { required: 'اسم المورد مطلوب' })}
                placeholder="اسم الشركة أو المورد"
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="contact_person">جهة الاتصال</Label>
              <Input
                id="contact_person"
                {...register('contact_person')}
                placeholder="اسم المسؤول"
              />
            </div>

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
              <Label htmlFor="tax_number">الرقم الضريبي</Label>
              <Input
                id="tax_number"
                {...register('tax_number')}
                placeholder="الرقم الضريبي"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">العنوان</Label>
              <Textarea
                id="address"
                {...register('address')}
                placeholder="العنوان الكامل"
                rows={2}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="ملاحظات إضافية..."
                rows={2}
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <Switch
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
              <Label htmlFor="is_active">مورد نشط</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
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
