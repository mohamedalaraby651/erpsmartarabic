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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { CheckCircle, Clock, FileText, Send } from "lucide-react";

interface JournalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journal: {
    id: string;
    journal_number: string;
    journal_date: string;
    description: string;
    is_posted: boolean;
    total_debit: number;
    total_credit: number;
  } | null;
}

const JournalDetailDialog = ({
  open,
  onOpenChange,
  journal,
}: JournalDetailDialogProps) => {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const canPost = userRole === "admin" || userRole === "accountant";

  interface JournalEntryRow {
    id: string;
    line_number: number;
    debit_amount: number | null;
    credit_amount: number | null;
    memo: string | null;
    chart_of_accounts: { code: string; name: string } | null;
  }

  const { data: entries = [] } = useQuery({
    queryKey: ["journal-entries", journal?.id],
    queryFn: async (): Promise<JournalEntryRow[]> => {
      if (!journal?.id) return [];
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*, chart_of_accounts(code, name)")
        .eq("journal_id", journal.id)
        .order("line_number");
      if (error) throw error;
      return data as JournalEntryRow[];
    },
    enabled: !!journal?.id,
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("journals")
        .update({ is_posted: true, posted_at: new Date().toISOString() })
        .eq("id", journal!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      toast({ title: "تم ترحيل القيد بنجاح" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      logErrorSafely('JournalDetailDialog.postMutation', error);
      toast({
        title: "خطأ في ترحيل القيد",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  if (!journal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="h-5 w-5" />
            قيد رقم {journal.journal_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Journal Header */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm text-muted-foreground">التاريخ</p>
              <p className="font-medium">
                {new Date(journal.journal_date).toLocaleDateString("ar-EG")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الحالة</p>
              <Badge
                className={
                  journal.is_posted
                    ? "bg-success/10 text-success"
                    : "bg-warning/10 text-warning"
                }
              >
                {journal.is_posted ? (
                  <>
                    <CheckCircle className="h-4 w-4 ml-1" />
                    مرحّل
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 ml-1" />
                    مسودة
                  </>
                )}
              </Badge>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">البيان</p>
              <p className="font-medium">{journal.description}</p>
            </div>
          </div>

          {/* Entries Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الحساب</TableHead>
                  <TableHead>مدين</TableHead>
                  <TableHead>دائن</TableHead>
                  <TableHead>الملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {entry.chart_of_accounts?.code}
                      </span>
                      <span className="mr-2">{entry.chart_of_accounts?.name}</span>
                    </TableCell>
                    <TableCell className="font-mono">
                      {Number(entry.debit_amount) > 0
                        ? Number(entry.debit_amount).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {Number(entry.credit_amount) > 0
                        ? Number(entry.credit_amount).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.memo || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end gap-8 p-4 rounded-lg bg-muted">
            <div>
              <span className="text-sm text-muted-foreground">إجمالي المدين:</span>
              <span className="font-bold font-mono mr-2">
                {Number(journal.total_debit).toLocaleString()} ج.م
              </span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">إجمالي الدائن:</span>
              <span className="font-bold font-mono mr-2">
                {Number(journal.total_credit).toLocaleString()} ج.م
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
          {canPost && !journal.is_posted && (
            <Button onClick={() => postMutation.mutate()} disabled={postMutation.isPending}>
              <Send className="h-4 w-4 ml-2" />
              ترحيل القيد
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JournalDetailDialog;
