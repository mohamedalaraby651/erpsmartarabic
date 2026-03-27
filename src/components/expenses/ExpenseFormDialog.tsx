import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import { AdaptiveContainer } from "@/components/mobile/AdaptiveContainer";
import { FullScreenForm } from "@/components/mobile/FullScreenForm";

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

export function ExpenseFormDialog({ open, onOpenChange, expense }: ExpenseFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!expense;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category_id: '',
      amount: 0,
      payment_method: 'cash',
      register_id: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      supplier_id: '',
    },
  });

  const paymentMethod = form.watch('payment_method');

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch cash registers
  const { data: registers } = useQuery({
    queryKey: ['cash-registers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('id, name, current_balance')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch suppliers
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (expense) {
      form.reset({
        category_id: expense.category_id || '',
        amount: expense.amount,
        payment_method: expense.payment_method as 'cash' | 'bank' | 'card',
        register_id: expense.register_id || '',
        expense_date: expense.expense_date,
        description: expense.description || '',
        supplier_id: expense.supplier_id || '',
      });
    } else {
      form.reset({
        category_id: '',
        amount: 0,
        payment_method: 'cash',
        register_id: '',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        supplier_id: '',
      });
    }
  }, [expense, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const user = await supabase.auth.getUser();
      
      const expenseData = {
        category_id: data.category_id || null,
        amount: data.amount,
        payment_method: data.payment_method,
        register_id: data.payment_method === 'cash' && data.register_id ? data.register_id : null,
        expense_date: data.expense_date,
        description: data.description || null,
        supplier_id: data.supplier_id || null,
        created_by: user.data.user?.id,
      };

      if (isEditing && expense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', expense.id);
        
        if (error) throw error;
      } else {
        // Generate expense number
        const expenseNumber = `EXP-${Date.now()}`;
        const { error } = await supabase
          .from('expenses')
          .insert({
            ...expenseData,
            expense_number: expenseNumber,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-stats'] });
      toast({ title: isEditing ? 'تم تحديث المصروف' : 'تم إضافة المصروف' });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      logErrorSafely('ExpenseFormDialog', error);
      toast({ title: 'حدث خطأ', description: getSafeErrorMessage(error), variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل المصروف' : 'مصروف جديد'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>التصنيف</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر التصنيف" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المبلغ *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>طريقة الدفع *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="bank">تحويل بنكي</SelectItem>
                      <SelectItem value="card">بطاقة</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {paymentMethod === 'cash' && (
              <FormField
                control={form.control}
                name="register_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الصندوق</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الصندوق" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {registers?.map((reg) => (
                          <SelectItem key={reg.id} value={reg.id}>
                            {reg.name} ({Number(reg.current_balance).toLocaleString()} ج.م)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="expense_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>التاريخ *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المورد (اختياري)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المورد" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers?.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id}>
                          {sup.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف</FormLabel>
                  <FormControl>
                    <Textarea placeholder="وصف المصروف..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={mutation.isPending}>
                {mutation.isPending ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إضافة'}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
