import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logErrorSafely, getSafeErrorMessage } from '@/lib/errorHandler';
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const formSchema = z.object({
  name: z.string().min(1, 'اسم الصندوق مطلوب'),
  location: z.string().optional(),
  current_balance: z.coerce.number().default(0),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface CashRegister {
  id: string;
  name: string;
  location: string | null;
  current_balance: number;
  is_active: boolean;
}

interface CashRegisterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  register?: CashRegister | null;
}

export function CashRegisterFormDialog({ open, onOpenChange, register }: CashRegisterFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!register;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      location: '',
      current_balance: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (register) {
      form.reset({
        name: register.name,
        location: register.location || '',
        current_balance: register.current_balance,
        is_active: register.is_active,
      });
    } else {
      form.reset({
        name: '',
        location: '',
        current_balance: 0,
        is_active: true,
      });
    }
  }, [register, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEditing) {
        const { error } = await supabase
          .from('cash_registers')
          .update({
            name: data.name,
            location: data.location || null,
            is_active: data.is_active,
          })
          .eq('id', register.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cash_registers')
          .insert({
            name: data.name,
            location: data.location || null,
            current_balance: data.current_balance,
            is_active: data.is_active,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-registers'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register'] });
      toast({ title: isEditing ? 'تم تحديث الصندوق' : 'تم إضافة الصندوق' });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      logErrorSafely('CashRegisterFormDialog', error);
      toast({ title: 'حدث خطأ', description: getSafeErrorMessage(error), variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل الصندوق' : 'صندوق نقدية جديد'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم الصندوق *</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: الصندوق الرئيسي" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الموقع</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: المكتب الرئيسي" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="current_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرصيد الافتتاحي</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">نشط</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
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
