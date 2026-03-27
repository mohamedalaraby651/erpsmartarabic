import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { useAuth } from "@/hooks/useAuth";
import { verifyPermissionOnServer, verifyFinancialLimit } from "@/lib/api/secureOperations";
import { AdaptiveContainer } from "@/components/mobile/AdaptiveContainer";
import { FullScreenForm } from "@/components/mobile/FullScreenForm";
import { useFormWizard } from "@/hooks/useFormWizard";
import type { Database } from "@/integrations/supabase/types";

type SalesOrder = Database['public']['Tables']['sales_orders']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

interface SalesOrderFormDialogProps { open: boolean; onOpenChange: (open: boolean) => void; order?: SalesOrder | null; }
interface OrderItem { product_id: string; product_name: string; quantity: number; unit_price: number; discount_percentage: number; total_price: number; }
interface FormData { customer_id: string; delivery_date: string; delivery_address: string; notes: string; discount_amount: number; tax_amount: number; }

const SalesOrderFormDialog = ({ open, onOpenChange, order }: SalesOrderFormDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!order;
  const [items, setItems] = useState<OrderItem[]>([]);

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: async () => { const { data, error } = await supabase.from('customers').select('*').eq('is_active', true).order('name'); if (error) throw error; return data as Customer[]; } });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: async () => { const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('name'); if (error) throw error; return data as Product[]; } });

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({ defaultValues: { customer_id: '', delivery_date: '', delivery_address: '', notes: '', discount_amount: 0, tax_amount: 0 } });
  const wizard = useFormWizard({ totalSteps: 3 });

  useEffect(() => {
    if (order) { reset({ customer_id: order.customer_id, delivery_date: order.delivery_date || '', delivery_address: order.delivery_address || '', notes: order.notes || '', discount_amount: Number(order.discount_amount) || 0, tax_amount: Number(order.tax_amount) || 0 }); loadOrderItems(order.id); }
    else { reset({ customer_id: '', delivery_date: '', delivery_address: '', notes: '', discount_amount: 0, tax_amount: 0 }); setItems([]); }
    wizard.reset();
  }, [order, reset]);

  const loadOrderItems = async (orderId: string) => {
    const { data, error } = await supabase.from('sales_order_items').select('*, products(name)').eq('order_id', orderId);
    if (!error && data) { type L = { product_id: string; quantity: number; unit_price: number; discount_percentage: number | null; total_price: number; products: { name: string } | null; }; setItems((data as L[]).map((i) => ({ product_id: i.product_id, product_name: i.products?.name || '', quantity: i.quantity, unit_price: Number(i.unit_price), discount_percentage: Number(i.discount_percentage) || 0, total_price: Number(i.total_price) }))); }
  };

  const addItem = () => setItems([...items, { product_id: '', product_name: '', quantity: 1, unit_price: 0, discount_percentage: 0, total_price: 0 }]);
  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const n = [...items]; n[index] = { ...n[index], [field]: value };
    if (field === 'product_id') { const p = products.find(p => p.id === value); if (p) { n[index].product_name = p.name; n[index].unit_price = Number(p.selling_price); } }
    const it = n[index]; const s = it.quantity * it.unit_price; it.total_price = s - s * (it.discount_percentage / 100);
    setItems(n);
  };
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const subtotal = items.reduce((s, i) => s + i.total_price, 0);
  const discountAmount = watch('discount_amount') || 0;
  const taxAmount = watch('tax_amount') || 0;
  const total = subtotal - discountAmount + taxAmount;

  const generateOrderNumber = () => { const d = new Date(); return `SO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`; };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (items.length === 0) throw new Error('يجب إضافة منتج واحد على الأقل');
      const orderData = { customer_id: data.customer_id, order_number: order?.order_number || generateOrderNumber(), delivery_date: data.delivery_date || null, delivery_address: data.delivery_address || null, notes: data.notes || null, subtotal, discount_amount: discountAmount, tax_amount: taxAmount, total_amount: total, status: 'pending' as const, created_by: user?.id || null };
      let orderId: string;
      if (isEditing) { const { error } = await supabase.from('sales_orders').update(orderData).eq('id', order.id); if (error) throw error; orderId = order.id; await supabase.from('sales_order_items').delete().eq('order_id', order.id); }
      else { const { data: n, error } = await supabase.from('sales_orders').insert(orderData).select().single(); if (error) throw error; orderId = n.id; }
      const itemsData = items.map(i => ({ order_id: orderId, product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price, discount_percentage: i.discount_percentage, total_price: i.total_price }));
      const { error: ie } = await supabase.from('sales_order_items').insert(itemsData); if (ie) throw ie;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sales-orders'] }); toast({ title: isEditing ? "تم تحديث أمر البيع بنجاح" : "تم إنشاء أمر البيع بنجاح" }); onOpenChange(false); },
    onError: (error) => { logErrorSafely('SalesOrderFormDialog', error); toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" }); },
  });

  const onSubmit = async (data: FormData) => {
    const action = isEditing ? 'edit' : 'create';
    const hasPermission = await verifyPermissionOnServer('sales_orders', action);
    if (!hasPermission) { toast({ title: "غير مصرح", description: `ليس لديك صلاحية ${isEditing ? 'تعديل' : 'إنشاء'} أوامر البيع`, variant: "destructive" }); return; }
    const maxD = items.length > 0 ? Math.max(...items.map(i => i.discount_percentage || 0)) : 0;
    if (maxD > 0) { const ok = await verifyFinancialLimit('discount', maxD); if (!ok) { toast({ title: "تجاوز الحد المسموح", variant: "destructive" }); return; } }
    mutation.mutate(data);
  };

  const ItemsTable = (
    <div>
      <div className="flex items-center justify-between mb-3"><Label>المنتجات</Label><Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 ml-2" />إضافة منتج</Button></div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>المنتج</TableHead><TableHead className="w-24">الكمية</TableHead><TableHead className="w-32">السعر</TableHead><TableHead className="w-24">الخصم %</TableHead><TableHead className="w-32">الإجمالي</TableHead><TableHead className="w-16"></TableHead></TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد منتجات</TableCell></TableRow> :
              items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell><Select value={item.product_id} onValueChange={(v) => updateItem(index, 'product_id', v)}><SelectTrigger><SelectValue placeholder="اختر المنتج" /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></TableCell>
                  <TableCell><Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} /></TableCell>
                  <TableCell><Input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)} /></TableCell>
                  <TableCell><Input type="number" min="0" max="100" value={item.discount_percentage} onChange={(e) => updateItem(index, 'discount_percentage', parseFloat(e.target.value) || 0)} /></TableCell>
                  <TableCell><span className="font-bold">{item.total_price.toLocaleString()}</span></TableCell>
                  <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const Step1 = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>العميل *</Label><Select value={watch('customer_id')} onValueChange={(v) => setValue('customer_id', v)}><SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger><SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label htmlFor="delivery_date">تاريخ التسليم</Label><Input id="delivery_date" type="date" {...register('delivery_date')} /></div>
      </div>
      <div><Label htmlFor="delivery_address">عنوان التسليم</Label><Input id="delivery_address" {...register('delivery_address')} placeholder="عنوان التسليم..." /></div>
    </div>
  );

  const Step3 = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div><Label htmlFor="notes">ملاحظات</Label><Textarea id="notes" {...register('notes')} placeholder="ملاحظات إضافية..." rows={3} /></div>
      <div className="space-y-3 bg-muted p-4 rounded-lg">
        <div className="flex justify-between"><span>المجموع الفرعي:</span><span className="font-bold">{subtotal.toLocaleString()} ج.م</span></div>
        <div className="flex items-center justify-between gap-2"><span>الخصم:</span><Input type="number" step="0.01" className="w-32" {...register('discount_amount', { valueAsNumber: true })} /></div>
        <div className="flex items-center justify-between gap-2"><span>الضريبة:</span><Input type="number" step="0.01" className="w-32" {...register('tax_amount', { valueAsNumber: true })} /></div>
        <div className="flex justify-between text-lg border-t pt-3"><span className="font-bold">الإجمالي:</span><span className="font-bold text-primary">{total.toLocaleString()} ج.م</span></div>
      </div>
    </div>
  );

  const wizardSteps = [{ title: 'بيانات العميل', content: Step1 }, { title: 'المنتجات', content: ItemsTable }, { title: 'المجاميع', content: Step3 }];

  const desktopForm = (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEditing ? 'تعديل أمر البيع' : 'أمر بيع جديد'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {Step1}{ItemsTable}{Step3}
          <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إنشاء'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );

  const mobileForm = (
    <FullScreenForm open={open} onOpenChange={onOpenChange} title={isEditing ? 'تعديل أمر البيع' : 'أمر بيع جديد'}
      steps={wizardSteps} activeStep={wizard.currentStep} onNext={wizard.nextStep} onPrev={wizard.prevStep}
      onSubmit={handleSubmit(onSubmit)} progress={wizard.progress} isSubmitting={mutation.isPending} submitLabel={isEditing ? 'تحديث' : 'إنشاء'} />
  );

  return <AdaptiveContainer desktop={desktopForm} mobile={mobileForm} />;
};

export default SalesOrderFormDialog;
