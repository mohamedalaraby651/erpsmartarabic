import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { logErrorSafely, getSafeErrorMessage } from '@/lib/errorHandler';
import { mapRepoError } from '@/lib/repositories/_base';
import {
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
} from '@/hooks/expenses';
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
  const isEditing = !!category;
  const createMutation = useCreateExpenseCategory();
  const updateMutation = useUpdateExpenseCategory();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '', is_active: true },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        description: category.description || '',
        is_active: category.is_active,
      });
    } else {
      form.reset({ name: '', description: '', is_active: true });
    }
  }, [category, form]);

  const onSubmit = (data: FormData) => {
    const input = {
      name: data.name,
      description: data.description || null,
      is_active: data.is_active,
    };

    const handleSuccess = () => {
      toast({ title: isEditing ? 'تم تحديث التصنيف' : 'تم إضافة التصنيف' });
      onOpenChange(false);
      form.reset();
    };
    const handleError = (error: unknown) => {
      logErrorSafely('ExpenseCategoryFormDialog', error);
      const description = mapRepoError(error, getSafeErrorMessage(error)).message;
      toast({ title: 'حدث خطأ', description, variant: 'destructive' });
    };

    if (isEditing && category) {
      updateMutation.mutate({ id: category.id, input }, { onSuccess: handleSuccess, onError: handleError });
    } else {
      createMutation.mutate(input, { onSuccess: handleSuccess, onError: handleError });
    }
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
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إضافة'}
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
