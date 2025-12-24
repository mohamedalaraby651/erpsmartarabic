import { useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { productSchema, type ProductFormData } from "@/lib/validations";
import type { Database } from "@/integrations/supabase/types";

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductCategory = Database['public']['Tables']['product_categories']['Row'];

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

const ProductFormDialog = ({ open, onOpenChange, product }: ProductFormDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!product;

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as ProductCategory[];
    },
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      category_id: '',
      cost_price: 0,
      selling_price: 0,
      min_stock: 0,
      image_url: '',
      weight_kg: 0,
      length_cm: 0,
      width_cm: 0,
      height_cm: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        sku: product.sku || '',
        description: product.description || '',
        category_id: product.category_id || '',
        cost_price: Number(product.cost_price) || 0,
        selling_price: Number(product.selling_price) || 0,
        min_stock: product.min_stock || 0,
        image_url: product.image_url || '',
        weight_kg: Number(product.weight_kg) || 0,
        length_cm: Number(product.length_cm) || 0,
        width_cm: Number(product.width_cm) || 0,
        height_cm: Number(product.height_cm) || 0,
        is_active: product.is_active ?? true,
      });
    } else {
      reset({
        name: '',
        sku: '',
        description: '',
        category_id: '',
        cost_price: 0,
        selling_price: 0,
        min_stock: 0,
        image_url: '',
        weight_kg: 0,
        length_cm: 0,
        width_cm: 0,
        height_cm: 0,
        is_active: true,
      });
    }
  }, [product, reset]);

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const payload: ProductInsert = {
        name: data.name.trim(),
        sku: data.sku?.trim() || null,
        description: data.description?.trim() || null,
        category_id: data.category_id || null,
        cost_price: data.cost_price,
        selling_price: data.selling_price,
        min_stock: data.min_stock,
        image_url: data.image_url?.trim() || null,
        weight_kg: data.weight_kg || null,
        length_cm: data.length_cm || null,
        width_cm: data.width_cm || null,
        height_cm: data.height_cm || null,
        is_active: data.is_active,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: isEditing ? "تم تحديث المنتج بنجاح" : "تم إضافة المنتج بنجاح" });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    mutation.mutate(data);
  };

  const profitMargin = watch('selling_price') - watch('cost_price');
  const profitPercent = watch('cost_price') > 0 
    ? ((profitMargin / watch('cost_price')) * 100).toFixed(1) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">البيانات الأساسية</TabsTrigger>
              <TabsTrigger value="pricing">الأسعار</TabsTrigger>
              <TabsTrigger value="dimensions">الأبعاد</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="md:col-span-2">
                  <Label htmlFor="name">اسم المنتج *</Label>
                  <Input
                    id="name"
                    {...register('name', { required: 'اسم المنتج مطلوب' })}
                    placeholder="أدخل اسم المنتج"
                  />
                  {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                </div>

                {/* SKU */}
                <div>
                  <Label htmlFor="sku">كود المنتج (SKU)</Label>
                  <Input
                    id="sku"
                    {...register('sku')}
                    placeholder="مثال: PRD-001"
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

                {/* Description */}
                <div className="md:col-span-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="وصف المنتج..."
                    rows={3}
                  />
                </div>

                {/* Image URL */}
                <div className="md:col-span-2">
                  <Label htmlFor="image_url">رابط الصورة</Label>
                  <Input
                    id="image_url"
                    {...register('image_url')}
                    placeholder="https://..."
                  />
                </div>

                {/* Is Active */}
                <div className="md:col-span-2 flex items-center gap-3">
                  <Switch
                    id="is_active"
                    checked={watch('is_active')}
                    onCheckedChange={(checked) => setValue('is_active', checked)}
                  />
                  <Label htmlFor="is_active">منتج نشط</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cost Price */}
                <div>
                  <Label htmlFor="cost_price">سعر التكلفة (ج.م)</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    {...register('cost_price', { valueAsNumber: true })}
                    placeholder="0"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <Label htmlFor="selling_price">سعر البيع (ج.م)</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    {...register('selling_price', { valueAsNumber: true })}
                    placeholder="0"
                  />
                </div>

                {/* Profit Display */}
                <div className="md:col-span-2 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>هامش الربح:</span>
                    <span className={`font-bold ${profitMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {profitMargin.toLocaleString()} ج.م ({profitPercent}%)
                    </span>
                  </div>
                </div>

                {/* Min Stock */}
                <div>
                  <Label htmlFor="min_stock">الحد الأدنى للمخزون</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    {...register('min_stock', { valueAsNumber: true })}
                    placeholder="0"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dimensions" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Weight */}
                <div>
                  <Label htmlFor="weight_kg">الوزن (كجم)</Label>
                  <Input
                    id="weight_kg"
                    type="number"
                    step="0.01"
                    {...register('weight_kg', { valueAsNumber: true })}
                    placeholder="0"
                  />
                </div>

                {/* Length */}
                <div>
                  <Label htmlFor="length_cm">الطول (سم)</Label>
                  <Input
                    id="length_cm"
                    type="number"
                    step="0.01"
                    {...register('length_cm', { valueAsNumber: true })}
                    placeholder="0"
                  />
                </div>

                {/* Width */}
                <div>
                  <Label htmlFor="width_cm">العرض (سم)</Label>
                  <Input
                    id="width_cm"
                    type="number"
                    step="0.01"
                    {...register('width_cm', { valueAsNumber: true })}
                    placeholder="0"
                  />
                </div>

                {/* Height */}
                <div>
                  <Label htmlFor="height_cm">الارتفاع (سم)</Label>
                  <Input
                    id="height_cm"
                    type="number"
                    step="0.01"
                    {...register('height_cm', { valueAsNumber: true })}
                    placeholder="0"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

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

export default ProductFormDialog;
