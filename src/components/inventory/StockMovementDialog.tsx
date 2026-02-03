import { useState } from "react";
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
import { ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { useAuth } from "@/hooks/useAuth";
import { processStockMovement, getErrorMessage } from "@/lib/api/secureOperations";
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

  const [isProcessing, setIsProcessing] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (data.quantity <= 0) {
        throw new Error('الكمية يجب أن تكون أكبر من صفر');
      }

      setIsProcessing(true);
      try {
        // Use secure Edge Function for stock movement
        const result = await processStockMovement({
          product_id: data.product_id,
          movement_type: data.movement_type,
          quantity: data.quantity,
          from_warehouse_id: (data.movement_type === 'out' || data.movement_type === 'transfer')
            ? data.from_warehouse_id : undefined,
          to_warehouse_id: (data.movement_type === 'in' || data.movement_type === 'transfer')
            ? data.to_warehouse_id : undefined,
          notes: data.notes || undefined,
        });

        if (!result.success) {
          throw new Error(getErrorMessage(result.code || 'MOVEMENT_ERROR'));
        }

        return result;
      } finally {
        setIsProcessing(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-stock-all'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast({ 
        title: "تم تسجيل حركة المخزون بنجاح",
        description: "تم التحقق من الصلاحيات وتحديث المخزون",
      });
      reset();
      onOpenChange(false);
    },
    onError: (error) => {
      logErrorSafely('StockMovementDialog', error);
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
            <Button type="submit" disabled={mutation.isPending || isProcessing}>
              {isProcessing ? (
                <>
                  <ShieldCheck className="h-4 w-4 ml-2 animate-pulse" />
                  جاري المعالجة...
                </>
              ) : mutation.isPending ? (
                'جاري الحفظ...'
              ) : (
                'تسجيل الحركة'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockMovementDialog;
