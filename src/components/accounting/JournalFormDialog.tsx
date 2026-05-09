import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";

interface JournalEntry {
  account_id: string;
  account_name?: string;
  debit_amount: number;
  credit_amount: number;
  memo: string;
}

interface JournalFormData {
  journal_date: string;
  description: string;
}

interface JournalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JournalFormDialog = ({ open, onOpenChange }: JournalFormDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<JournalEntry[]>([
    { account_id: "", debit_amount: 0, credit_amount: 0, memo: "" },
    { account_id: "", debit_amount: 0, credit_amount: 0, memo: "" },
  ]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<JournalFormData>({
    defaultValues: {
      journal_date: new Date().toISOString().split("T")[0],
      description: "",
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: JournalFormData) => {
      const { buildRequestHeaders, newIdempotencyKey } = await import("@/lib/requestHeaders");
      const { data: result, error } = await supabase.functions.invoke("create-journal", {
        body: {
          journal_date: data.journal_date,
          description: data.description,
          entries: entries.filter((e) => e.account_id),
        },
        headers: buildRequestHeaders({ idempotencyKey: newIdempotencyKey() }),
      });

      if (error) throw error;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      toast({ title: "تم إنشاء القيد بنجاح" });
      onOpenChange(false);
      reset();
      setEntries([
        { account_id: "", debit_amount: 0, credit_amount: 0, memo: "" },
        { account_id: "", debit_amount: 0, credit_amount: 0, memo: "" },
      ]);
    },
    onError: (error: unknown) => {
      logErrorSafely('JournalFormDialog.mutation', error);
      toast({
        title: "خطأ في إنشاء القيد",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const addEntry = () => {
    setEntries([...entries, { account_id: "", debit_amount: 0, credit_amount: 0, memo: "" }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof JournalEntry, value: string | number) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };

    // If setting debit, clear credit and vice versa
    if (field === "debit_amount" && typeof value === 'number' && value > 0) {
      newEntries[index].credit_amount = 0;
    } else if (field === "credit_amount" && typeof value === 'number' && value > 0) {
      newEntries[index].debit_amount = 0;
    }

    // Add account name for display
    if (field === "account_id" && typeof value === 'string') {
      const account = accounts.find((a) => a.id === value);
      newEntries[index].account_name = account ? `${account.code} - ${account.name}` : "";
    }

    setEntries(newEntries);
  };

  const totalDebit = entries.reduce((sum, e) => sum + (Number(e.debit_amount) || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (Number(e.credit_amount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const hasAmount = totalDebit > 0 || totalCredit > 0;

  const onSubmit = (data: JournalFormData) => {
    if (!isBalanced) {
      toast({ title: "القيد غير متوازن", variant: "destructive" });
      return;
    }
    if (!hasAmount) {
      toast({ title: "يجب إدخال مبالغ", variant: "destructive" });
      return;
    }
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>قيد يومية جديد</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="journal_date">التاريخ *</Label>
              <Input
                id="journal_date"
                type="date"
                {...register("journal_date", { required: "مطلوب" })}
              />
            </div>
            <div>
              <Label htmlFor="description">البيان *</Label>
              <Input
                id="description"
                {...register("description", { required: "مطلوب" })}
                placeholder="وصف القيد..."
              />
            </div>
          </div>

          {/* Entries Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>بنود القيد</Label>
              <Button type="button" variant="outline" size="sm" onClick={addEntry}>
                <Plus className="h-4 w-4 ml-1" />
                إضافة سطر
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">الحساب</TableHead>
                    <TableHead>مدين</TableHead>
                    <TableHead>دائن</TableHead>
                    <TableHead>البيان</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={entry.account_id}
                          onValueChange={(val) => updateEntry(index, "account_id", val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الحساب" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.code} - {acc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.debit_amount || ""}
                          onChange={(e) =>
                            updateEntry(index, "debit_amount", parseFloat(e.target.value) || 0)
                          }
                          className="text-left font-mono"
                          dir="ltr"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.credit_amount || ""}
                          onChange={(e) =>
                            updateEntry(index, "credit_amount", parseFloat(e.target.value) || 0)
                          }
                          className="text-left font-mono"
                          dir="ltr"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={entry.memo}
                          onChange={(e) => updateEntry(index, "memo", e.target.value)}
                          placeholder="ملاحظة..."
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEntry(index)}
                          disabled={entries.length <= 2}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-sm text-muted-foreground">إجمالي المدين:</span>
                <span className="font-bold font-mono mr-2">
                  {totalDebit.toLocaleString()} ج.م
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">إجمالي الدائن:</span>
                <span className="font-bold font-mono mr-2">
                  {totalCredit.toLocaleString()} ج.م
                </span>
              </div>
            </div>
            <Badge
              className={
                isBalanced && hasAmount
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              }
            >
              {isBalanced && hasAmount ? (
                <>
                  <CheckCircle className="h-4 w-4 ml-1" />
                  متوازن
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 ml-1" />
                  غير متوازن
                </>
              )}
            </Badge>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={mutation.isPending || !isBalanced || !hasAmount}>
              حفظ القيد
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JournalFormDialog;
