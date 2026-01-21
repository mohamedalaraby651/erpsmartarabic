import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

const formSchema = z.object({
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CashRegister {
  id: string;
  name: string;
  current_balance: number;
}

interface CashTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  register: CashRegister;
  transactionType: 'income' | 'expense';
}

export function CashTransactionDialog({ 
  open, 
  onOpenChange, 
  register, 
  transactionType 
}: CashTransactionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isIncome = transactionType === 'income';

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      description: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const currentBalance = Number(register.current_balance);
      const amount = Number(data.amount);
      const newBalance = isIncome ? currentBalance + amount : currentBalance - amount;

      // Check if withdrawal is possible
      if (!isIncome && newBalance < 0) {
        throw new Error('الرصيد غير كافي لإتمام عملية السحب');
      }

      const user = await supabase.auth.getUser();

      // Generate transaction number
      const txnNumber = `TXN-${Date.now()}`;

      // Insert transaction
      const { error: txnError } = await supabase
        .from('cash_transactions')
        .insert({
          transaction_number: txnNumber,
          register_id: register.id,
          transaction_type: transactionType,
          amount: amount,
          balance_after: newBalance,
          description: data.description || null,
          reference_type: 'manual',
          created_by: user.data.user?.id,
        });

      if (txnError) throw txnError;

      // Update register balance
      const { error: regError } = await supabase
        .from('cash_registers')
        .update({ current_balance: newBalance })
        .eq('id', register.id);

      if (regError) throw regError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-registers'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-today-stats'] });
      toast({ 
        title: isIncome ? 'تم الإيداع بنجاح' : 'تم السحب بنجاح',
        description: `المبلغ: ${form.getValues('amount').toLocaleString()} ج.م`,
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({ 
        title: 'حدث خطأ', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isIncome ? (
              <>
                <ArrowDownCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                إيداع في {register.name}
              </>
            ) : (
              <>
                <ArrowUpCircle className="h-5 w-5 text-destructive" />
                سحب من {register.name}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-muted mb-4">
          <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
          <p className="text-2xl font-bold">
            {Number(register.current_balance).toLocaleString()} ج.م
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المبلغ *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      {...field}
                      className="text-lg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف / السبب</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={isIncome ? 'مثال: إيراد مبيعات نقدية' : 'مثال: مصروفات يومية'}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('amount') > 0 && (
              <div className="p-3 rounded-lg border">
                <p className="text-sm text-muted-foreground">الرصيد بعد العملية</p>
                <p className={`text-xl font-bold ${
                  isIncome ? 'text-emerald-600 dark:text-emerald-400' : 
                  (Number(register.current_balance) - form.watch('amount')) < 0 ? 'text-destructive' : ''
                }`}>
                  {(isIncome 
                    ? Number(register.current_balance) + Number(form.watch('amount'))
                    : Number(register.current_balance) - Number(form.watch('amount'))
                  ).toLocaleString()} ج.م
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                className={`flex-1 ${isIncome ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-destructive hover:bg-destructive/90'}`}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'جاري التنفيذ...' : isIncome ? 'تأكيد الإيداع' : 'تأكيد السحب'}
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
