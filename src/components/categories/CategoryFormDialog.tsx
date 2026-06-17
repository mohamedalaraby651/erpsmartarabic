import { z } from "zod";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
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
import { useCreateCategory, useUpdateCategory } from "@/hooks/categories";
import { useFormDialog } from "@/hooks/useFormDialog";
import { useMutationToast } from "@/hooks/useMutationToast";
import FormDialogFooter from "@/components/shared/FormDialogFooter";
import FormFieldError from "@/components/shared/FormFieldError";
import { logErrorSafely } from "@/lib/errorHandler";
import { mapRepoError } from "@/lib/repositories/_base";
import { getSafeErrorMessage } from "@/lib/errorHandler";
import type { Database } from "@/integrations/supabase/types";

type ProductCategory = Database["public"]["Tables"]["product_categories"]["Row"];

const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "اسم التصنيف مطلوب").max(200),
  description: z.string().max(2000).optional().default(""),
  parent_id: z.string().optional().default(""),
  sort_order: z.number().int().min(0).max(99999).default(0),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ProductCategory | null;
  categories: ProductCategory[];
}

const DEFAULT_VALUES: CategoryFormValues = {
  name: "",
  description: "",
  parent_id: "",
  sort_order: 0,
};

const CategoryFormDialog = ({
  open,
  onOpenChange,
  category,
  categories,
}: CategoryFormDialogProps) => {
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const availableParents = categories.filter((c) => {
    if (!category) return true;
    if (c.id === category.id) return false;
    let parent = c;
    while (parent.parent_id) {
      if (parent.parent_id === category.id) return false;
      parent = categories.find((p) => p.id === parent.parent_id) || parent;
      if (parent.parent_id === parent.id) break;
    }
    return true;
  });

  const toast = useMutationToast({
    successTitle: category ? "تم تحديث التصنيف بنجاح" : "تم إضافة التصنيف بنجاح",
    errorTitle: "حدث خطأ",
  });

  const handleError = (error: unknown) => {
    logErrorSafely("CategoryFormDialog", error);
    const description = mapRepoError(error, getSafeErrorMessage(error)).message;
    toast.onError({ message: description });
  };

  const { form, isEditing, isSubmitting, submit } = useFormDialog<
    CategoryFormValues,
    ProductCategory
  >({
    schema: categoryFormSchema,
    entity: category,
    toValues: (e) =>
      e
        ? {
            name: e.name,
            description: e.description ?? "",
            parent_id: e.parent_id ?? "",
            sort_order: e.sort_order ?? 0,
          }
        : DEFAULT_VALUES,
    toPayload: (v) => ({
      name: v.name,
      description: v.description || null,
      parent_id: v.parent_id || null,
      sort_order: v.sort_order,
    }),
    mutationFn: async (payload, { isEditing }) => {
      if (isEditing && category) {
        await updateMutation.mutateAsync({ id: category.id, payload: payload as never });
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

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isEditing ? "تعديل التصنيف" : "إضافة تصنيف جديد"}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="name">اسم التصنيف *</Label>
            <Input id="name" {...register("name")} placeholder="أدخل اسم التصنيف" />
            <FormFieldError error={errors.name} />
          </div>

          <div>
            <Label>التصنيف الأب (اختياري)</Label>
            <Select
              value={watch("parent_id") || ""}
              onValueChange={(value) =>
                setValue("parent_id", value === "none" ? "" : value, { shouldDirty: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="تصنيف رئيسي" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون (تصنيف رئيسي)</SelectItem>
                {availableParents.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="وصف التصنيف..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="sort_order">الترتيب</Label>
            <Input
              id="sort_order"
              type="number"
              {...register("sort_order", { valueAsNumber: true })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">الأرقام الأقل تظهر أولاً</p>
          </div>

          <FormDialogFooter
            isEditing={isEditing}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default CategoryFormDialog;
