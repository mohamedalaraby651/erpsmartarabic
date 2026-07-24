import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { expenseRepository } from '@/lib/repositories/expenseRepository';
import { listActiveSuppliersForSelect } from '@/application/queries/suppliers';
import { useCreateExpense, useUpdateExpense } from '@/hooks/expenses';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { logErrorSafely, getSafeErrorMessage } from '@/lib/errorHandler';
import { mapRepoError } from '@/lib/repositories/_base';
import { AdaptiveContainer } from "@/components/mobile/AdaptiveContainer";
import { FullScreenForm } from "@/components/mobile/FullScreenForm";
import { useFormDialog } from '@/hooks/useFormDialog';
import { useMutationToast } from '@/hooks/useMutationToast';

const formSchema = z.object({
  category_id: z.string().optional(),
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  payment_method: z.enum(['cash', 'bank', 'card']),
  register_id: z.string().optional(),
  expense_date: z.string(),
  description: z.string().optional(),
  supplier_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Expense {
  id: string;
  category_id?: string;
  amount: number;
  payment_method: string;
  register_id?: string;
  expense_date: string;
  description?: string;
  supplier_id?: string;
}

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
}

const defaultValues = (): FormData => ({
  category_id: '',
  amount: 0,
  payment_method: 'cash',
  register_id: '',
  expense_date: format(new Date(), 'yyyy-MM-dd'),
  description: '',
  supplier_id: '',
});

export function ExpenseFormDialog({ open, onOpenChange, expense }: ExpenseFormDialogProps) {
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expenseRepository.listCategories(),
  });

  const { data: registers } = useQuery({
    queryKey: ['cash-registers-active'],
    queryFn: () => expenseRepository.listActiveCashRegisters(),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-active'],
    queryFn: () => listActiveSuppliersForSelect(),
  });

  const toast = useMutationToast({
    successTitle: expense ? 'تم تحديث المصروف' : 'تم إضافة المصروف',
    errorTitle: 'حدث خطأ',
  });

  const handleError = (error: unknown) => {
    logErrorSafely('ExpenseFormDialog', error);
    const description = mapRepoError(error, getSafeErrorMessage(error)).message;
    toast.onError({ message: description });
  };

  const { form, isEditing, isSubmitting, submit } = useFormDialog<FormData, Expense>({
    schema: formSchema,
    entity: expense,
    toValues: (e) =>
      e
        ? {
            category_id: e.category_id || '',
            amount: e.amount,
            payment_method: e.payment_method as 'cash' | 'bank' | 'card',
            register_id: e.register_id || '',
            expense_date: e.expense_date,
            description: e.description || '',
            supplier_id: e.supplier_id || '',
          }
        : defaultValues(),
    toPayload: (v) => v,
    mutationFn: async (values, { isEditing }) => {
      const data = values as FormData;
      const userId = await expenseRepository.getCurrentUserId();
      const input = {
        category_id: data.category_id || null,
        amount: data.amount,
        payment_method: data.payment_method,
        register_id: data.register_id || null,
        expense_date: data.expense_date,
        description: data.description || null,
        supplier_id: data.supplier_id || null,
        created_by: userId,
      };
      if (isEditing && expense) {
        await updateMutation.mutateAsync({ id: expense.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
    },
    onSuccess: () => {
      toast.onSuccess();
      onOpenChange(false);
    },
    onError: handleError,
  });

  const paymentMethod = form.watch('payment_method');

  const formContent = (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4">
        <FormField control={form.control} name="category_id" render={({ field }) => (<FormItem><FormLabel>التصنيف</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger></FormControl><SelectContent>{categories?.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>المبلغ *</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="payment_method" render={({ field }) => (<FormItem><FormLabel>طريقة الدفع *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="cash">نقدي</SelectItem><SelectItem value="bank">تحويل بنكي</SelectItem><SelectItem value="card">بطاقة</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
        {paymentMethod === 'cash' && (<FormField control={form.control} name="register_id" render={({ field }) => (<FormItem><FormLabel>الصندوق</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر الصندوق" /></SelectTrigger></FormControl><SelectContent>{registers?.map((reg) => (<SelectItem key={reg.id} value={reg.id}>{reg.name} ({Number(reg.current_balance).toLocaleString()} ج.م)</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />)}
        <FormField control={form.control} name="expense_date" render={({ field }) => (<FormItem><FormLabel>التاريخ *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="supplier_id" render={({ field }) => (<FormItem><FormLabel>المورد (اختياري)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger></FormControl><SelectContent>{suppliers?.map((sup) => (<SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>الوصف</FormLabel><FormControl><Textarea placeholder="وصف المصروف..." {...field} /></FormControl><FormMessage /></FormItem>)} />
      </form>
    </Form>
  );

  const mobileFooter = (
    <div className="flex gap-2">
      <Button className="flex-1 min-h-11" disabled={isSubmitting} onClick={() => submit()}>
        {isSubmitting ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إضافة'}
      </Button>
      <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>إلغاء</Button>
    </div>
  );

  const desktopForm = (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEditing ? 'تعديل المصروف' : 'مصروف جديد'}</DialogTitle></DialogHeader>
        {formContent}
        <div className="flex gap-2 pt-4">
          <Button className="flex-1 min-h-11" disabled={isSubmitting} onClick={() => submit()}>
            {isSubmitting ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إضافة'}
          </Button>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const mobileForm = (
    <FullScreenForm open={open} onOpenChange={onOpenChange} title={isEditing ? 'تعديل المصروف' : 'مصروف جديد'} footer={mobileFooter}>
      {formContent}
    </FullScreenForm>
  );

  return <AdaptiveContainer desktop={desktopForm} mobile={mobileForm} />;
}
