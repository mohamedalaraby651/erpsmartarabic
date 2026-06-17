import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
} from "@/hooks/expenses";
import { useFormDialog } from "@/hooks/useFormDialog";
import { useMutationToast } from "@/hooks/useMutationToast";
import FormDialogFooter from "@/components/shared/FormDialogFooter";
import { logErrorSafely, getSafeErrorMessage } from "@/lib/errorHandler";
import { mapRepoError } from "@/lib/repositories/_base";

const expenseCategoryFormSchema = z.object({
  name: z.string().trim().min(1, "اسم التصنيف مطلوب").max(200),
  description: z.string().max(2000).optional().default(""),
  is_active: z.boolean().default(true),
});

type ExpenseCategoryFormValues = z.infer<typeof expenseCategoryFormSchema>;

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

const DEFAULT_VALUES: ExpenseCategoryFormValues = {
  name: "",
  description: "",
  is_active: true,
};

export function ExpenseCategoryFormDialog({
  open,
  onOpenChange,
  category,
}: ExpenseCategoryFormDialogProps) {
  const createMutation = useCreateExpenseCategory();
  const updateMutation = useUpdateExpenseCategory();

  const toast = useMutationToast({
    successTitle: category ? "تم تحديث التصنيف" : "تم إضافة التصنيف",
    errorTitle: "حدث خطأ",
  });

  const handleError = (error: unknown) => {
    logErrorSafely("ExpenseCategoryFormDialog", error);
    const description = mapRepoError(error, getSafeErrorMessage(error)).message;
    toast.onError({ message: description });
  };

  const { form, isEditing, isSubmitting, submit } = useFormDialog<
    ExpenseCategoryFormValues,
    ExpenseCategory
  >({
    schema: expenseCategoryFormSchema,
    entity: category,
    toValues: (e) =>
      e
        ? {
            name: e.name,
            description: e.description ?? "",
            is_active: e.is_active,
          }
        : DEFAULT_VALUES,
    toPayload: (v) => ({
      name: v.name,
      description: v.description || null,
      is_active: v.is_active,
    }),
    mutationFn: async (payload, { isEditing }) => {
      if (isEditing && category) {
        await updateMutation.mutateAsync({ id: category.id, input: payload as never });
      } else {
        await createMutation.mutateAsync(payload as never);
      }
    },
    onSuccess: () => {
      toast.onSuccess();
      onOpenChange(false);
    },
    onError: handleError,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "تعديل التصنيف" : "تصنيف جديد"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
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

            <FormDialogFooter
              isEditing={isEditing}
              isSubmitting={isSubmitting}
              onCancel={() => onOpenChange(false)}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
