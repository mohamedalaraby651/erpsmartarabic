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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type ProductVariant = Database['public']['Tables']['product_variants']['Row'];
type ProductVariantInsert = Database['public']['Tables']['product_variants']['Insert'];

interface ProductVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  variant?: ProductVariant | null;
}

interface FormData {
  name: string;
  sku: string;
  additional_price: number;
  is_active: boolean;
}

const ProductVariantDialog = ({ open, onOpenChange, productId, variant }: ProductVariantDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!variant;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      sku: '',
      additional_price: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (variant) {
      reset({
        name: variant.name,
        sku: variant.sku || '',
        additional_price: Number(variant.additional_price) || 0,
        is_active: variant.is_active ?? true,
      });
    } else {
      reset({
        name: '',
        sku: '',
        additional_price: 0,
        is_active: true,
      });
    }
  }, [variant, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: ProductVariantInsert = {
        product_id: productId,
        name: data.name,
        sku: data.sku || null,
        additional_price: data.additional_price,
        is_active: data.is_active,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('product_variants')
          .update(payload)
          .eq('id', variant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_variants')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
      toast({ title: isEditing ? "تم تحديث المتغير بنجاح" : "تم إضافة المتغير بنجاح" });
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل المتغير' : 'إضافة متغير جديد'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">اسم المتغير *</Label>
            <Input
              id="name"
              {...register('name', { required: 'اسم المتغير مطلوب' })}
              placeholder="مثال: لون أحمر، مقاس XL"
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          {/* SKU */}
          <div>
            <Label htmlFor="sku">كود المتغير (SKU)</Label>
            <Input
              id="sku"
              {...register('sku')}
              placeholder="مثال: PRD-001-RED"
            />
          </div>

          {/* Additional Price */}
          <div>
            <Label htmlFor="additional_price">سعر إضافي (ج.م)</Label>
            <Input
              id="additional_price"
              type="number"
              step="0.01"
              {...register('additional_price', { valueAsNumber: true })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              يُضاف هذا السعر إلى سعر المنتج الأساسي
            </p>
          </div>

          {/* Is Active */}
          <div className="flex items-center gap-3">
            <Switch
              id="is_active"
              checked={watch('is_active')}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
            <Label htmlFor="is_active">متغير نشط</Label>
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

export default ProductVariantDialog;
