import { useState } from "react";
import { z } from "zod";
import {
  useActiveAccounts,
  useCreateManualJournal,
  useCostCenters,
  useProjects,
} from "@/hooks/accounting";
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
import { useFormDialog } from "@/hooks/useFormDialog";
import { useMutationToast } from "@/hooks/useMutationToast";
import FormFieldError from "@/components/shared/FormFieldError";
import { logErrorSafely } from "@/lib/errorHandler";

import { Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";

interface JournalEntry {
  account_id: string;
  account_name?: string;
  debit_amount: number;
  credit_amount: number;
  memo: string;
  cost_center_id?: string | null;
  project_id?: string | null;
}

const journalFormSchema = z.object({
  journal_date: z.string().min(1, "التاريخ مطلوب"),
  description: z.string().trim().min(1, "البيان مطلوب"),
});

type JournalFormData = z.infer<typeof journalFormSchema>;

interface JournalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NONE = "__none__";

const emptyEntries = (): JournalEntry[] => [
  { account_id: "", debit_amount: 0, credit_amount: 0, memo: "", cost_center_id: null, project_id: null },
  { account_id: "", debit_amount: 0, credit_amount: 0, memo: "", cost_center_id: null, project_id: null },
];

const defaultValues = (): JournalFormData => ({
  journal_date: new Date().toISOString().split("T")[0],
  description: "",
});

const JournalFormDialog = ({ open, onOpenChange }: JournalFormDialogProps) => {
  // Line items live outside useFormDialog (header-only contract). The hook
  // owns the header; items merge into payload inside mutationFn.
  const [entries, setEntries] = useState<JournalEntry[]>(emptyEntries);

  const { data: accounts = [] } = useActiveAccounts();
  const { data: costCenters = [] } = useCostCenters();
  const { data: projects = [] } = useProjects();

  const createJournal = useCreateManualJournal();

  const toast = useMutationToast({ successTitle: "تم حفظ القيد", errorTitle: "حدث خطأ" });

  const totalDebit = entries.reduce((sum, e) => sum + (Number(e.debit_amount) || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (Number(e.credit_amount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const hasAmount = totalDebit > 0 || totalCredit > 0;

  // Entity identity flips when the dialog opens, so re-opening resets the
  // header through the hook's entity-change effect.
  const entity = open ? { open } : null;

  const { form, isSubmitting, submit } = useFormDialog<JournalFormData, typeof entity>({
    schema: journalFormSchema,
    entity,
    toValues: () => defaultValues(),
    toPayload: (v) => v,
    mutationFn: async (values) => {
      const data = values as JournalFormData;
      // Pre-MUTATE business validation (kept inside lifecycle).
      if (!isBalanced) {
        throw new Error("القيد غير متوازن");
      }
      if (!hasAmount) {
        throw new Error("يجب إدخال مبالغ");
      }
      await createJournal.mutateAsync({
        header: { journal_date: data.journal_date, description: data.description },
        lines: entries
          .filter((e) => e.account_id)
          .map((e) => ({
            account_id: e.account_id,
            debit_amount: e.debit_amount,
            credit_amount: e.credit_amount,
            memo: e.memo,
            cost_center_id: e.cost_center_id ?? null,
            project_id: e.project_id ?? null,
          })),
      });
    },
    onSuccess: () => {
      toast.onSuccess();
      setEntries(emptyEntries());
      onOpenChange(false);
    },
    onError: (error) => {
      logErrorSafely("JournalFormDialog", error);
      toast.onError(error);
    },
  });

  const { register, formState: { errors } } = form;

  const addEntry = () => {
    setEntries([...entries, { account_id: "", debit_amount: 0, credit_amount: 0, memo: "", cost_center_id: null, project_id: null }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof JournalEntry, value: string | number | null) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };

    if (field === "debit_amount" && typeof value === 'number' && value > 0) {
      newEntries[index].credit_amount = 0;
    } else if (field === "credit_amount" && typeof value === 'number' && value > 0) {
      newEntries[index].debit_amount = 0;
    }

    if (field === "account_id" && typeof value === 'string') {
      const account = accounts.find((a) => a.id === value);
      newEntries[index].account_name = account ? `${account.code} - ${account.name}` : "";
    }

    setEntries(newEntries);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>قيد يومية جديد</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="journal_date">التاريخ *</Label>
              <Input id="journal_date" type="date" {...register("journal_date")} />
              <FormFieldError error={errors.journal_date} />
            </div>
            <div>
              <Label htmlFor="description">البيان *</Label>
              <Input id="description" {...register("description")} placeholder="وصف القيد..." />
              <FormFieldError error={errors.description} />
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
                    <TableHead className="w-1/4">الحساب</TableHead>
                    <TableHead>مدين</TableHead>
                    <TableHead>دائن</TableHead>
                    <TableHead>البيان</TableHead>
                    <TableHead>مركز التكلفة</TableHead>
                    <TableHead>المشروع</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select value={entry.account_id} onValueChange={(val) => updateEntry(index, "account_id", val)}>
                          <SelectTrigger><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
                          <SelectContent>
                            {accounts.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" step="0.01" value={entry.debit_amount || ""} onChange={(e) => updateEntry(index, "debit_amount", parseFloat(e.target.value) || 0)} className="text-left font-mono" dir="ltr" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" step="0.01" value={entry.credit_amount || ""} onChange={(e) => updateEntry(index, "credit_amount", parseFloat(e.target.value) || 0)} className="text-left font-mono" dir="ltr" />
                      </TableCell>
                      <TableCell>
                        <Input value={entry.memo} onChange={(e) => updateEntry(index, "memo", e.target.value)} placeholder="ملاحظة..." />
                      </TableCell>
                      <TableCell>
                        <Select value={entry.cost_center_id ?? NONE} onValueChange={(val) => updateEntry(index, "cost_center_id", val === NONE ? null : val)}>
                          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>— بدون —</SelectItem>
                            {costCenters.map((cc) => (
                              <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name_ar}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={entry.project_id ?? NONE} onValueChange={(val) => updateEntry(index, "project_id", val === NONE ? null : val)}>
                          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>— بدون —</SelectItem>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.code} - {p.name_ar}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeEntry(index)} disabled={entries.length <= 2}>
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
                <span className="font-bold font-mono mr-2">{totalDebit.toLocaleString()} ج.م</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">إجمالي الدائن:</span>
                <span className="font-bold font-mono mr-2">{totalCredit.toLocaleString()} ج.م</span>
              </div>
            </div>
            <Badge className={isBalanced && hasAmount ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}>
              {isBalanced && hasAmount ? (<><CheckCircle className="h-4 w-4 ml-1" />متوازن</>) : (<><AlertCircle className="h-4 w-4 ml-1" />غير متوازن</>)}
            </Badge>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" className="min-h-11" disabled={isSubmitting || !isBalanced || !hasAmount}>
              {isSubmitting ? "جاري الحفظ..." : "حفظ القيد"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JournalFormDialog;
