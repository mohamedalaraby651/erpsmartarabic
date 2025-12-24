import { useEffect, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];
type Supplier = Database['public']['Tables']['suppliers']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

interface PurchaseOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: PurchaseOrder | null;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface FormData {
  supplier_id: string;
  expected_date: string;
  notes: string;
  tax_amount: number;
}

const PurchaseOrderFormDialog = ({ open, onOpenChange, order }: PurchaseOrderFormDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!order;
  const [items, setItems] = useState<OrderItem[]>([]);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Supplier[];
    },
  });

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

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: {
      supplier_id: '',
      expected_date: '',
      notes: '',
      tax_amount: 0,
    },
  });

  useEffect(() => {
    if (order) {
      reset({
        supplier_id: order.supplier_id,
        expected_date: order.expected_date || '',
        notes: order.notes || '',
        tax_amount: Number(order.tax_amount) || 0,
      });
      loadOrderItems(order.id);
    } else {
      reset({
        supplier_id: '',
        expected_date: '',
        notes: '',
        tax_amount: 0,
      });
      setItems([]);
    }
  }, [order, reset]);

  const loadOrderItems = async (orderId: string) => {
    const { data, error } = await supabase
      .from('purchase_order_items')
      .select('*, products(name)')
      .eq('order_id', orderId);
    
    if (!error && data) {
      setItems(data.map((item: any) => ({
        product_id: item.product_id,
        product_name: item.products?.name || '',
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
      })));
    }
  };

  const addItem = () => {
    setItems([...items, {
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    }]);
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].product_name = product.name;
        newItems[index].unit_price = Number(product.cost_price);
      }
    }
    
    const item = newItems[index];
    item.total_price = item.quantity * item.unit_price;
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const taxAmount = watch('tax_amount') || 0;
  const total = subtotal + taxAmount;

  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${year}${month}-${random}`;
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (items.length === 0) {
        throw new Error('يجب إضافة منتج واحد على الأقل');
      }

      const orderData = {
        supplier_id: data.supplier_id,
        order_number: order?.order_number || generateOrderNumber(),
        expected_date: data.expected_date || null,
        notes: data.notes || null,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        status: 'pending' as const,
        created_by: user?.id || null,
      };

      let orderId: string;

      if (isEditing) {
        const { error } = await supabase
          .from('purchase_orders')
          .update(orderData)
          .eq('id', order.id);
        if (error) throw error;
        orderId = order.id;

        await supabase
          .from('purchase_order_items')
          .delete()
          .eq('order_id', order.id);
      } else {
        const { data: newOrder, error } = await supabase
          .from('purchase_orders')
          .insert(orderData)
          .select()
          .single();
        if (error) throw error;
        orderId = newOrder.id;
      }

      const itemsData = items.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsData);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: isEditing ? "تم تحديث أمر الشراء بنجاح" : "تم إنشاء أمر الشراء بنجاح" });
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل أمر الشراء' : 'أمر شراء جديد'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>المورد *</Label>
              <Select
                value={watch('supplier_id')}
                onValueChange={(value) => setValue('supplier_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المورد" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="expected_date">تاريخ التوريد المتوقع</Label>
              <Input
                id="expected_date"
                type="date"
                {...register('expected_date')}
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>المنتجات</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة منتج
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead className="w-24">الكمية</TableHead>
                    <TableHead className="w-32">سعر الشراء</TableHead>
                    <TableHead className="w-32">الإجمالي</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        لا توجد منتجات - اضغط على "إضافة منتج"
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={item.product_id}
                            onValueChange={(value) => updateItem(index, 'product_id', value)}
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
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-bold">{item.total_price.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="ملاحظات إضافية..."
                rows={3}
              />
            </div>
            
            <div className="space-y-3 bg-muted p-4 rounded-lg">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-bold">{subtotal.toLocaleString()} ج.م</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>الضريبة:</span>
                <Input
                  type="number"
                  step="0.01"
                  className="w-32"
                  {...register('tax_amount', { valueAsNumber: true })}
                />
              </div>
              <div className="flex justify-between text-lg border-t pt-3">
                <span className="font-bold">الإجمالي:</span>
                <span className="font-bold text-primary">{total.toLocaleString()} ج.م</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إنشاء'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseOrderFormDialog;
