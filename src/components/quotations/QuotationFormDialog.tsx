import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { useAuth } from "@/hooks/useAuth";
import { verifyPermissionOnServer, verifyFinancialLimit } from "@/lib/api/secureOperations";
import { QuotationItemsTable } from "./QuotationItemsTable";
import { useQuotationItems } from "./useQuotationItems";
import { AdaptiveContainer } from "@/components/mobile/AdaptiveContainer";
import { FullScreenForm } from "@/components/mobile/FullScreenForm";
import { useFormWizard } from "@/hooks/useFormWizard";
import type { Database } from "@/integrations/supabase/types";

type Quotation = Database['public']['Tables']['quotations']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

interface QuotationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation?: Quotation | null;
}

interface FormData {
  customer_id: string; valid_until: string; notes: string;
  discount_amount: number; tax_amount: number;
}

const QuotationFormDialog = ({ open, onOpenChange, quotation }: QuotationFormDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!quotation;

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('is_active', true).order('name');
      if (error) throw error; return data as Customer[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('name');
      if (error) throw error; return data as Product[];
    },
  });

  const { items, subtotal, addItem, updateItem, removeItem, loadItems, resetItems } = useQuotationItems({ products });

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: { customer_id: '', valid_until: '', notes: '', discount_amount: 0, tax_amount: 0 },
  });

  const wizard = useFormWizard({ totalSteps: 3 });

  useEffect(() => {
    if (quotation) {
      reset({ customer_id: quotation.customer_id, valid_until: quotation.valid_until || '', notes: quotation.notes || '', discount_amount: Number(quotation.discount_amount) || 0, tax_amount: Number(quotation.tax_amount) || 0 });
      loadItems(quotation.id);
    } else {
      reset({ customer_id: '', valid_until: '', notes: '', discount_amount: 0, tax_amount: 0 });
      resetItems();
    }
    wizard.reset();
  }, [quotation, reset, loadItems, resetItems]);

  const discountAmount = watch('discount_amount') || 0;
  const taxAmount = watch('tax_amount') || 0;
  const total = subtotal - discountAmount + taxAmount;

  const generateQuotationNumber = () => {
    const d = new Date();
    return `QT-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (items.length === 0) throw new Error('يجب إضافة منتج واحد على الأقل');
      const quotationData = {
        customer_id: data.customer_id, quotation_number: quotation?.quotation_number || generateQuotationNumber(),
        valid_until: data.valid_until || null, notes: data.notes || null, subtotal, discount_amount: discountAmount,
        tax_amount: taxAmount, total_amount: total, status: 'draft' as const, created_by: user?.id || null,
      };
      let quotationId: string;
      if (isEditing) {
        const { error } = await supabase.from('quotations').update(quotationData).eq('id', quotation.id);
        if (error) throw error; quotationId = quotation.id;
        await supabase.from('quotation_items').delete().eq('quotation_id', quotation.id);
      } else {
        const { data: newQ, error } = await supabase.from('quotations').insert(quotationData).select().single();
        if (error) throw error; quotationId = newQ.id;
      }
      const itemsData = items.map(item => ({ quotation_id: quotationId, product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price, discount_percentage: item.discount_percentage, total_price: item.total_price }));
      const { error: itemsError } = await supabase.from('quotation_items').insert(itemsData);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); toast({ title: isEditing ? "تم تحديث عرض السعر بنجاح" : "تم إنشاء عرض السعر بنجاح" }); onOpenChange(false); },
    onError: (error) => { logErrorSafely('QuotationFormDialog', error); toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" }); },
  });

  const onSubmit = async (data: FormData) => {
    const action = isEditing ? 'edit' : 'create';
    const hasPermission = await verifyPermissionOnServer('quotations', action);
    if (!hasPermission) { toast({ title: "غير مصرح", description: `ليس لديك صلاحية ${isEditing ? 'تعديل' : 'إنشاء'} عروض الأسعار`, variant: "destructive" }); return; }
    const maxDiscount = items.length > 0 ? Math.max(...items.map(i => i.discount_percentage || 0)) : 0;
    if (maxDiscount > 0) { const ok = await verifyFinancialLimit('discount', maxDiscount); if (!ok) { toast({ title: "تجاوز الحد المسموح", description: `نسبة الخصم (${maxDiscount}%) تتجاوز الحد المسموح لك`, variant: "destructive" }); return; } }
    mutation.mutate(data);
  };

  const Step1 = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>العميل *</Label>
        <Select value={watch('customer_id')} onValueChange={(v) => setValue('customer_id', v)}>
          <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
          <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label htmlFor="valid_until">صالح حتى</Label><Input id="valid_until" type="date" {...register('valid_until')} /></div>
    </div>
  );

  const Step2 = (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Label>المنتجات</Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 ml-2" />إضافة منتج</Button>
      </div>
      <QuotationItemsTable items={items} products={products} onAddItem={addItem} onUpdateItem={updateItem} onRemoveItem={removeItem} />
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

  const wizardSteps = [
    { title: 'بيانات العميل', content: Step1 },
    { title: 'المنتجات', content: Step2 },
    { title: 'المجاميع', content: Step3 },
  ];

  const desktopForm = (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEditing ? 'تعديل عرض السعر' : 'عرض سعر جديد'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {Step1}{Step2}{Step3}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إنشاء'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  const mobileForm = (
    <FullScreenForm open={open} onOpenChange={onOpenChange} title={isEditing ? 'تعديل عرض السعر' : 'عرض سعر جديد'}
      steps={wizardSteps} activeStep={wizard.currentStep} onNext={wizard.nextStep} onPrev={wizard.prevStep}
      onSubmit={handleSubmit(onSubmit)} progress={wizard.progress} isSubmitting={mutation.isPending} submitLabel={isEditing ? 'تحديث' : 'إنشاء'} />
  );

  return <AdaptiveContainer desktop={desktopForm} mobile={mobileForm} />;
};

export default QuotationFormDialog;
