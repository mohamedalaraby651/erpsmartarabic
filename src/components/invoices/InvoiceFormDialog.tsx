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

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice | null;
}

interface InvoiceItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  total_price: number;
}

interface FormData {
  customer_id: string;
  payment_method: 'cash' | 'bank_transfer' | 'credit' | 'advance_payment' | 'installment';
  due_date: string;
  notes: string;
  discount_amount: number;
  tax_amount: number;
}

const paymentMethods = [
  { value: 'cash', label: 'نقدي' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'credit', label: 'آجل' },
  { value: 'advance_payment', label: 'دفعة مقدمة' },
  { value: 'installment', label: 'تقسيط' },
];

const InvoiceFormDialog = ({ open, onOpenChange, invoice }: InvoiceFormDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!invoice;
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Customer[];
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
      customer_id: '',
      payment_method: 'cash',
      due_date: '',
      notes: '',
      discount_amount: 0,
      tax_amount: 0,
    },
  });

  useEffect(() => {
    if (invoice) {
      reset({
        customer_id: invoice.customer_id,
        payment_method: invoice.payment_method as any,
        due_date: invoice.due_date || '',
        notes: invoice.notes || '',
        discount_amount: Number(invoice.discount_amount) || 0,
        tax_amount: Number(invoice.tax_amount) || 0,
      });
      loadInvoiceItems(invoice.id);
    } else {
      reset({
        customer_id: '',
        payment_method: 'cash',
        due_date: '',
        notes: '',
        discount_amount: 0,
        tax_amount: 0,
      });
      setItems([]);
    }
  }, [invoice, reset]);

  const loadInvoiceItems = async (invoiceId: string) => {
    const { data, error } = await supabase
      .from('invoice_items')
      .select('*, products(name)')
      .eq('invoice_id', invoiceId);
    
    if (!error && data) {
      setItems(data.map((item: any) => ({
        product_id: item.product_id,
        product_name: item.products?.name || '',
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        discount_percentage: Number(item.discount_percentage) || 0,
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
      discount_percentage: 0,
      total_price: 0,
    }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].product_name = product.name;
        newItems[index].unit_price = Number(product.selling_price);
      }
    }
    
    const item = newItems[index];
    const subtotal = item.quantity * item.unit_price;
    const discount = subtotal * (item.discount_percentage / 100);
    item.total_price = subtotal - discount;
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const discountAmount = watch('discount_amount') || 0;
  const taxAmount = watch('tax_amount') || 0;
  const total = subtotal - discountAmount + taxAmount;

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${random}`;
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (items.length === 0) {
        throw new Error('يجب إضافة منتج واحد على الأقل');
      }

      const invoiceData = {
        customer_id: data.customer_id,
        invoice_number: invoice?.invoice_number || generateInvoiceNumber(),
        payment_method: data.payment_method,
        due_date: data.due_date || null,
        notes: data.notes || null,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: total,
        status: 'pending' as const,
        payment_status: 'pending' as const,
        created_by: user?.id || null,
      };

      let invoiceId: string;

      if (isEditing) {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoice.id);
        if (error) throw error;
        invoiceId = invoice.id;

        await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoice.id);
      } else {
        const { data: newInvoice, error } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single();
        if (error) throw error;
        invoiceId = newInvoice.id;
      }

      const itemsData = items.map(item => ({
        invoice_id: invoiceId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsData);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: isEditing ? "تم تحديث الفاتورة بنجاح" : "تم إنشاء الفاتورة بنجاح" });
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
          <DialogTitle>{isEditing ? 'تعديل الفاتورة' : 'فاتورة جديدة'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>العميل *</Label>
              <Select
                value={watch('customer_id')}
                onValueChange={(value) => setValue('customer_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>طريقة الدفع</Label>
              <Select
                value={watch('payment_method')}
                onValueChange={(value: any) => setValue('payment_method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
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
                    <TableHead className="w-32">السعر</TableHead>
                    <TableHead className="w-24">الخصم %</TableHead>
                    <TableHead className="w-32">الإجمالي</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount_percentage}
                            onChange={(e) => updateItem(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
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
                <span>الخصم:</span>
                <Input
                  type="number"
                  step="0.01"
                  className="w-32"
                  {...register('discount_amount', { valueAsNumber: true })}
                />
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

export default InvoiceFormDialog;
