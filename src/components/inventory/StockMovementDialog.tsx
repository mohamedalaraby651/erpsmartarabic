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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type Product = Database['public']['Tables']['products']['Row'];
type Warehouse = Database['public']['Tables']['warehouses']['Row'];

interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  product_id: string;
  movement_type: 'in' | 'out' | 'transfer' | 'adjustment';
  quantity: number;
  from_warehouse_id: string;
  to_warehouse_id: string;
  notes: string;
}

const movementTypes = [
  { value: 'in', label: 'إدخال' },
  { value: 'out', label: 'إخراج' },
  { value: 'transfer', label: 'تحويل' },
  { value: 'adjustment', label: 'تسوية' },
];

const StockMovementDialog = ({ open, onOpenChange }: StockMovementDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Warehouse[];
    },
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: {
      product_id: '',
      movement_type: 'in',
      quantity: 1,
      from_warehouse_id: '',
      to_warehouse_id: '',
      notes: '',
    },
  });

  const movementType = watch('movement_type');

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (data.quantity <= 0) {
        throw new Error('الكمية يجب أن تكون أكبر من صفر');
      }

      // Record the movement
      const movementData = {
        product_id: data.product_id,
        movement_type: data.movement_type,
        quantity: data.quantity,
        from_warehouse_id: data.movement_type === 'out' || data.movement_type === 'transfer' 
          ? data.from_warehouse_id : null,
        to_warehouse_id: data.movement_type === 'in' || data.movement_type === 'transfer' 
          ? data.to_warehouse_id : null,
        notes: data.notes || null,
        created_by: user?.id || null,
      };

      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert(movementData);
      if (movementError) throw movementError;

      // Update stock based on movement type
      if (data.movement_type === 'in' && data.to_warehouse_id) {
        await updateStock(data.product_id, data.to_warehouse_id, data.quantity);
      } else if (data.movement_type === 'out' && data.from_warehouse_id) {
        await updateStock(data.product_id, data.from_warehouse_id, -data.quantity);
      } else if (data.movement_type === 'transfer') {
        if (data.from_warehouse_id) {
          await updateStock(data.product_id, data.from_warehouse_id, -data.quantity);
        }
        if (data.to_warehouse_id) {
          await updateStock(data.product_id, data.to_warehouse_id, data.quantity);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-stock-all'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-items'] });
      toast({ title: "تم تسجيل حركة المخزون بنجاح" });
      reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    },
  });

  const updateStock = async (productId: string, warehouseId: string, quantityChange: number) => {
    // Check if stock record exists
    const { data: existing } = await supabase
      .from('product_stock')
      .select('id, quantity')
      .eq('product_id', productId)
      .eq('warehouse_id', warehouseId)
      .maybeSingle();

    if (existing) {
      const newQuantity = existing.quantity + quantityChange;
      await supabase
        .from('product_stock')
        .update({ quantity: Math.max(0, newQuantity) })
        .eq('id', existing.id);
    } else if (quantityChange > 0) {
      await supabase
        .from('product_stock')
        .insert({
          product_id: productId,
          warehouse_id: warehouseId,
          quantity: quantityChange,
        });
    }
  };

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>حركة مخزون جديدة</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>نوع الحركة</Label>
            <Select
              value={watch('movement_type')}
              onValueChange={(value: any) => setValue('movement_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {movementTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>المنتج *</Label>
            <Select
              value={watch('product_id')}
              onValueChange={(value) => setValue('product_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المنتج" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quantity">الكمية *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              {...register('quantity', { valueAsNumber: true })}
            />
          </div>

          {(movementType === 'out' || movementType === 'transfer') && (
            <div>
              <Label>من مستودع</Label>
              <Select
                value={watch('from_warehouse_id')}
                onValueChange={(value) => setValue('from_warehouse_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المستودع" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(movementType === 'in' || movementType === 'transfer') && (
            <div>
              <Label>إلى مستودع</Label>
              <Select
                value={watch('to_warehouse_id')}
                onValueChange={(value) => setValue('to_warehouse_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المستودع" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="ملاحظات إضافية..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'جاري الحفظ...' : 'تسجيل الحركة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockMovementDialog;
