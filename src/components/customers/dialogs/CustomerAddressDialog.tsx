import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { customerRepository } from "@/lib/repositories/customerRepository";
import type { Database } from "@/integrations/supabase/types";

type CustomerAddress = Database['public']['Tables']['customer_addresses']['Row'];

interface CustomerAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  address?: CustomerAddress | null;
}

interface FormData {
  label: string;
  address: string;
  city: string;
  governorate: string;
  notes: string;
  is_default: boolean;
}

const CustomerAddressDialog = ({ open, onOpenChange, customerId, address }: CustomerAddressDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!address;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      label: 'العنوان الرئيسي', address: '', city: '', governorate: '', notes: '', is_default: false,
    },
  });

  useEffect(() => {
    if (address) {
      reset({
        label: address.label, address: address.address,
        city: address.city || '', governorate: address.governorate || '',
        notes: address.notes || '', is_default: address.is_default ?? false,
      });
    } else {
      reset({ label: 'العنوان الرئيسي', address: '', city: '', governorate: '', notes: '', is_default: false });
    }
  }, [address, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        customer_id: customerId,
        label: data.label, address: data.address,
        city: data.city || null, governorate: data.governorate || null,
        notes: data.notes || null, is_default: data.is_default,
      };
      if (isEditing) {
        await customerRepository.updateAddress(address.id, payload);
      } else {
        await customerRepository.createAddress(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', customerId] });
      toast({ title: isEditing ? "تم تحديث العنوان بنجاح" : "تم إضافة العنوان بنجاح" });
      onOpenChange(false);
    },
    onError: (error) => {
      logErrorSafely('CustomerAddressDialog', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    },
  });

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{isEditing ? 'تعديل العنوان' : 'إضافة عنوان جديد'}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div>
            <Label htmlFor="label">تسمية العنوان *</Label>
            <Input id="label" {...register('label', { required: 'التسمية مطلوبة' })} placeholder="مثال: العنوان الرئيسي، المكتب، المنزل" />
            {errors.label && <p className="text-sm text-destructive mt-1">{errors.label.message}</p>}
          </div>
          <div>
            <Label htmlFor="address">العنوان التفصيلي *</Label>
            <Textarea id="address" {...register('address', { required: 'العنوان مطلوب' })} placeholder="الشارع، رقم المبنى، الطابق..." rows={2} />
            {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">المدينة</Label>
              <Input id="city" {...register('city')} placeholder="المدينة" />
            </div>
            <div>
              <Label htmlFor="governorate">المحافظة</Label>
              <Input id="governorate" {...register('governorate')} placeholder="المحافظة" />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea id="notes" {...register('notes')} placeholder="ملاحظات إضافية للتوصيل..." rows={2} />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="is_default" checked={watch('is_default')} onCheckedChange={(checked) => setValue('is_default', checked)} />
            <Label htmlFor="is_default">تعيين كعنوان افتراضي</Label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إضافة'}
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default CustomerAddressDialog;
