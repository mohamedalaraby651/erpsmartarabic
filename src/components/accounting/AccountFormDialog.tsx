import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";

type Account = {
  id?: string;
  code: string;
  name: string;
  name_en?: string | null;
  account_type: string;
  parent_id?: string | null;
  is_active: boolean;
  normal_balance: string;
  description?: string | null;
};

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
  accounts: Account[];
}

const accountTypes = [
  { value: "asset", label: "أصول" },
  { value: "liability", label: "خصوم" },
  { value: "equity", label: "حقوق ملكية" },
  { value: "revenue", label: "إيرادات" },
  { value: "expense", label: "مصروفات" },
];

const AccountFormDialog = ({
  open,
  onOpenChange,
  account,
  accounts,
}: AccountFormDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!account?.id;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Account>({
    defaultValues: {
      code: "",
      name: "",
      name_en: "",
      account_type: "asset",
      parent_id: null,
      is_active: true,
      normal_balance: "debit",
      description: "",
    },
  });

  useEffect(() => {
    if (account) {
      reset({
        code: account.code || "",
        name: account.name || "",
        name_en: account.name_en || "",
        account_type: account.account_type || "asset",
        parent_id: account.parent_id || null,
        is_active: account.is_active ?? true,
        normal_balance: account.normal_balance || "debit",
        description: account.description || "",
      });
    } else {
      reset({
        code: "",
        name: "",
        name_en: "",
        account_type: "asset",
        parent_id: null,
        is_active: true,
        normal_balance: "debit",
        description: "",
      });
    }
  }, [account, reset]);

  // Auto-set normal balance based on account type
  const accountType = watch("account_type");
  useEffect(() => {
    if (accountType) {
      const isDebit = ["asset", "expense"].includes(accountType);
      setValue("normal_balance", isDebit ? "debit" : "credit");
    }
  }, [accountType, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: Account) => {
      const payload = {
        code: data.code.trim(),
        name: data.name.trim(),
        name_en: data.name_en?.trim() || null,
        account_type: data.account_type as "asset" | "liability" | "equity" | "revenue" | "expense",
        parent_id: data.parent_id || null,
        is_active: data.is_active,
        normal_balance: data.normal_balance as "debit" | "credit",
        description: data.description?.trim() || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("chart_of_accounts")
          .update(payload)
          .eq("id", account.id!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("chart_of_accounts")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast({ title: isEditing ? "تم تحديث الحساب" : "تم إنشاء الحساب" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      logErrorSafely('AccountFormDialog.mutation', error);
      toast({ 
        title: "خطأ في حفظ الحساب", 
        description: getSafeErrorMessage(error), 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: Account) => {
    mutation.mutate(data);
  };

  // Filter parent accounts (exclude self and children)
  const parentOptions = accounts.filter(
    (a) => !isEditing || (a.id !== account?.id && a.parent_id !== account?.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "تعديل الحساب" : "حساب جديد"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">كود الحساب *</Label>
              <Input
                id="code"
                {...register("code", { required: "مطلوب" })}
                placeholder="1100"
                className="font-mono"
              />
              {errors.code && (
                <p className="text-sm text-destructive mt-1">{errors.code.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="account_type">نوع الحساب *</Label>
              <Select
                value={watch("account_type")}
                onValueChange={(val) => setValue("account_type", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="name">اسم الحساب (عربي) *</Label>
            <Input
              id="name"
              {...register("name", { required: "مطلوب" })}
              placeholder="اسم الحساب بالعربية"
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="name_en">اسم الحساب (إنجليزي)</Label>
            <Input
              id="name_en"
              {...register("name_en")}
              placeholder="Account name in English"
              dir="ltr"
            />
          </div>

          <div>
            <Label htmlFor="parent_id">الحساب الرئيسي</Label>
            <Select
              value={watch("parent_id") || "none"}
              onValueChange={(val) => setValue("parent_id", val === "none" ? null : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الحساب الرئيسي" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون حساب رئيسي</SelectItem>
                {parentOptions.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id!}>
                    {acc.code} - {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>الطبيعة</Label>
              <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-muted">
                <span className={watch("normal_balance") === "debit" ? "font-bold" : ""}>
                  مدين
                </span>
                <span className="text-muted-foreground">/</span>
                <span className={watch("normal_balance") === "credit" ? "font-bold" : ""}>
                  دائن
                </span>
              </div>
            </div>

            <div>
              <Label>الحالة</Label>
              <div className="flex items-center gap-3 mt-2 p-3 rounded-lg bg-muted">
                <Switch
                  checked={watch("is_active")}
                  onCheckedChange={(val) => setValue("is_active", val)}
                />
                <span>{watch("is_active") ? "نشط" : "معطل"}</span>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="وصف مختصر للحساب..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {isEditing ? "حفظ التغييرات" : "إنشاء الحساب"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AccountFormDialog;
