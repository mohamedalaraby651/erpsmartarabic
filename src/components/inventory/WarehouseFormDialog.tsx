import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import type { Database } from "@/integrations/supabase/types";

type Warehouse = Database['public']['Tables']['warehouses']['Row'];

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: Warehouse | null;
}

interface FormData {
  name: string;
  location: string;
  description: string;
  is_active: boolean;
}

const WarehouseFormDialog = ({ open, onOpenChange, warehouse }: WarehouseFormDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!warehouse;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      location: '',
      description: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (warehouse) {
      reset({
        name: warehouse.name,
        location: warehouse.location || '',
        description: warehouse.description || '',
        is_active: warehouse.is_active ?? true,
      });
    } else {
      reset({
        name: '',
        location: '',
        description: '',
        is_active: true,
      });
    }
  }, [warehouse, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name: data.name,
        location: data.location || null,
        description: data.description || null,
        is_active: data.is_active,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('warehouses')
          .update(payload)
          .eq('id', warehouse.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('warehouses')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast({ title: isEditing ? "تم تحديث المستودع بنجاح" : "تم إضافة المستودع بنجاح" });
      onOpenChange(false);
    },
    onError: (error) => {
      logErrorSafely('WarehouseFormDialog', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{isEditing ? 'تعديل المستودع' : 'إضافة مستودع جديد'}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">اسم المستودع *</Label>
            <Input
              id="name"
              {...register('name', { required: 'اسم المستودع مطلوب' })}
              placeholder="مثال: المستودع الرئيسي"
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="location">الموقع</Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="العنوان أو الموقع"
            />
          </div>

          <div>
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="وصف المستودع..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="is_active"
              checked={watch('is_active')}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
            <Label htmlFor="is_active">مستودع نشط</Label>
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
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default WarehouseFormDialog;
