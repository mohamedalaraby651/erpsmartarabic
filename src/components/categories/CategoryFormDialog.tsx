import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
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
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type ProductCategory = Database['public']['Tables']['product_categories']['Row'];
type ProductCategoryInsert = Database['public']['Tables']['product_categories']['Insert'];

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ProductCategory | null;
  categories: ProductCategory[];
}

interface FormData {
  name: string;
  description: string;
  parent_id: string;
  sort_order: number;
}

const CategoryFormDialog = ({ open, onOpenChange, category, categories }: CategoryFormDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!category;

  // Filter out current category and its children from parent options
  const availableParents = categories.filter(c => {
    if (!category) return true;
    if (c.id === category.id) return false;
    // Also exclude children of current category
    let parent = c;
    while (parent.parent_id) {
      if (parent.parent_id === category.id) return false;
      parent = categories.find(p => p.id === parent.parent_id) || parent;
      if (parent.parent_id === parent.id) break; // Prevent infinite loop
    }
    return true;
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      parent_id: '',
      sort_order: 0,
    },
  });

  useEffect(() => {
    if (category) {
      reset({
        name: category.name,
        description: category.description || '',
        parent_id: category.parent_id || '',
        sort_order: category.sort_order || 0,
      });
    } else {
      reset({
        name: '',
        description: '',
        parent_id: '',
        sort_order: 0,
      });
    }
  }, [category, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: ProductCategoryInsert = {
        name: data.name,
        description: data.description || null,
        parent_id: data.parent_id || null,
        sort_order: data.sort_order,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('product_categories')
          .update(payload)
          .eq('id', category.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_categories')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({ title: isEditing ? "تم تحديث التصنيف بنجاح" : "تم إضافة التصنيف بنجاح" });
      onOpenChange(false);
    },
    onError: (error) => {
      logErrorSafely('CategoryFormDialog', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">اسم التصنيف *</Label>
            <Input
              id="name"
              {...register('name', { required: 'اسم التصنيف مطلوب' })}
              placeholder="أدخل اسم التصنيف"
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          {/* Parent Category */}
          <div>
            <Label>التصنيف الأب (اختياري)</Label>
            <Select
              value={watch('parent_id')}
              onValueChange={(value) => setValue('parent_id', value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="تصنيف رئيسي" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون (تصنيف رئيسي)</SelectItem>
                {availableParents.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="وصف التصنيف..."
              rows={3}
            />
          </div>

          {/* Sort Order */}
          <div>
            <Label htmlFor="sort_order">الترتيب</Label>
            <Input
              id="sort_order"
              type="number"
              {...register('sort_order', { valueAsNumber: true })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              الأرقام الأقل تظهر أولاً
            </p>
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

export default CategoryFormDialog;
