import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useFormDialog } from "@/hooks/useFormDialog";
import { useMutationToast } from "@/hooks/useMutationToast";
import FormDialogFooter from "@/components/shared/FormDialogFooter";
import FormFieldError from "@/components/shared/FormFieldError";
import { logErrorSafely } from "@/lib/errorHandler";
import type { Database } from "@/integrations/supabase/types";

type Warehouse = Database["public"]["Tables"]["warehouses"]["Row"];

const warehouseFormSchema = z.object({
  name: z.string().trim().min(1, "اسم المستودع مطلوب").max(200),
  location: z.string().max(500).optional().default(""),
  description: z.string().max(2000).optional().default(""),
  is_active: z.boolean().default(true),
});

type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: Warehouse | null;
}

const DEFAULT_VALUES: WarehouseFormValues = {
  name: "",
  location: "",
  description: "",
  is_active: true,
};

const WarehouseFormDialog = ({ open, onOpenChange, warehouse }: WarehouseFormDialogProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: { payload: Record<string, unknown>; isEditing: boolean }) => {
      if (params.isEditing && warehouse) {
        const { error } = await supabase
          .from("warehouses")
          .update(params.payload)
          .eq("id", warehouse.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("warehouses")
          .insert(params.payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
  });

  const toast = useMutationToast({
    successTitle: warehouse ? "تم تحديث المستودع بنجاح" : "تم إضافة المستودع بنجاح",
    errorTitle: "حدث خطأ",
  });

  const { form, isEditing, isSubmitting, submit } = useFormDialog<
    WarehouseFormValues,
    Warehouse
  >({
    schema: warehouseFormSchema,
    entity: warehouse,
    toValues: (e) =>
      e
        ? {
            name: e.name,
            location: e.location ?? "",
            description: e.description ?? "",
            is_active: e.is_active ?? true,
          }
        : DEFAULT_VALUES,
    toPayload: (v) => ({
      name: v.name,
      location: v.location || null,
      description: v.description || null,
      is_active: v.is_active,
    }),
    mutationFn: (payload, ctx) =>
      mutation.mutateAsync({ payload: payload as Record<string, unknown>, isEditing: ctx.isEditing }),
    onSuccess: () => {
      toast.onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      logErrorSafely("WarehouseFormDialog", error);
      toast.onError(error);
    },
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
            {isEditing ? "تعديل المستودع" : "إضافة مستودع جديد"}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="name">اسم المستودع *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="مثال: المستودع الرئيسي"
            />
            <FormFieldError error={errors.name} />
          </div>

          <div>
            <Label htmlFor="location">الموقع</Label>
            <Input id="location" {...register("location")} placeholder="العنوان أو الموقع" />
          </div>

          <div>
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="وصف المستودع..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="is_active"
              checked={watch("is_active")}
              onCheckedChange={(checked) => setValue("is_active", checked, { shouldDirty: true })}
            />
            <Label htmlFor="is_active">مستودع نشط</Label>
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

export default WarehouseFormDialog;
