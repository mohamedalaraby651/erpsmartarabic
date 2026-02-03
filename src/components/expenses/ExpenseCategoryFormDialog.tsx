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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const formSchema = z.object({
  name: z.string().min(1, 'اسم التصنيف مطلوب'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface ExpenseCategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ExpenseCategory | null;
}

export function ExpenseCategoryFormDialog({ open, onOpenChange, category }: ExpenseCategoryFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!category;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        description: category.description || '',
        is_active: category.is_active,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        is_active: true,
      });
    }
  }, [category, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEditing) {
        const { error } = await supabase
          .from('expense_categories')
          .update({
            name: data.name,
            description: data.description || null,
            is_active: data.is_active,
          })
          .eq('id', category.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('expense_categories')
          .insert({
            name: data.name,
            description: data.description || null,
            is_active: data.is_active,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast({ title: isEditing ? 'تم تحديث التصنيف' : 'تم إضافة التصنيف' });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      logErrorSafely('ExpenseCategoryFormDialog', error);
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
          <DialogTitle>{isEditing ? 'تعديل التصنيف' : 'تصنيف جديد'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم التصنيف *</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: مصروفات إدارية" {...field} />
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
                  <FormLabel>الوصف</FormLabel>
                  <FormControl>
                    <Textarea placeholder="وصف التصنيف..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
