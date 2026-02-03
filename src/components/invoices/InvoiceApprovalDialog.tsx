import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Send, AlertTriangle } from "lucide-react";

interface InvoiceApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    total_amount: number;
    approval_status: string;
    customers?: { name: string } | null;
  } | null;
}

const approvalStatusLabels: Record<string, string> = {
  draft: "مسودة",
  pending: "في انتظار الموافقة",
  approved: "معتمد",
  rejected: "مرفوض",
};

const approvalStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const InvoiceApprovalDialog = ({
  open,
  onOpenChange,
  invoice,
}: InvoiceApprovalDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const approvalMutation = useMutation({
    mutationFn: async ({
      action,
      reason,
    }: {
      action: "submit" | "approve" | "reject";
      reason?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("approve-invoice", {
        body: {
          invoice_id: invoice?.id,
          action,
          rejection_reason: reason,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice?.id] });
      toast({ title: data.message });
      onOpenChange(false);
      setShowRejectForm(false);
      setRejectionReason("");
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    approvalMutation.mutate({ action: "submit" });
  };

  const handleApprove = () => {
    approvalMutation.mutate({ action: "approve" });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast({ title: "يجب إدخال سبب الرفض", variant: "destructive" });
      return;
    }
    approvalMutation.mutate({ action: "reject", reason: rejectionReason });
  };

  if (!invoice) return null;

  const isPending = invoice.approval_status === "pending";
  const isDraft = invoice.approval_status === "draft";
  const isApproved = invoice.approval_status === "approved";
  const isRejected = invoice.approval_status === "rejected";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إدارة موافقة الفاتورة</DialogTitle>
          <DialogDescription>
            فاتورة رقم {invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">{invoice.customers?.name || "بدون عميل"}</p>
              <p className="text-sm text-muted-foreground">
                {Number(invoice.total_amount).toLocaleString()} ج.م
              </p>
            </div>
            <Badge className={approvalStatusColors[invoice.approval_status]}>
              {approvalStatusLabels[invoice.approval_status]}
            </Badge>
          </div>

          {isDraft && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Send className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-primary">تقديم للموافقة</p>
                <p className="text-sm text-muted-foreground">
                  سيتم إرسال الفاتورة للمحاسب أو المسؤول للموافقة عليها
                </p>
              </div>
            </div>
          )}

          {isPending && !showRejectForm && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-success/5 border border-success/20">
                <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                <div>
                  <p className="font-medium text-success">اعتماد الفاتورة</p>
                  <p className="text-sm text-muted-foreground">
                    سيتم اعتماد الفاتورة وإنشاء القيد المحاسبي تلقائياً
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">رفض الفاتورة</p>
                  <p className="text-sm text-muted-foreground">
                    سيتم إرجاع الفاتورة للمراجعة مع ذكر السبب
                  </p>
                </div>
              </div>
            </div>
          )}

          {showRejectForm && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">تأكيد الرفض</p>
                  <p className="text-sm text-muted-foreground">
                    يرجى ذكر سبب رفض الفاتورة
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="rejection_reason">سبب الرفض *</Label>
                <Textarea
                  id="rejection_reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="اذكر سبب رفض الفاتورة..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {isApproved && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-success/10">
              <CheckCircle className="h-5 w-5 text-success mt-0.5" />
              <div>
                <p className="font-medium text-success">تم اعتماد الفاتورة</p>
                <p className="text-sm text-muted-foreground">
                  هذه الفاتورة معتمدة ولا يمكن تغيير حالتها
                </p>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">تم رفض الفاتورة</p>
                <p className="text-sm text-muted-foreground">
                  يمكنك تعديل الفاتورة وإعادة تقديمها
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>

          {isDraft && (
            <Button onClick={handleSubmit} disabled={approvalMutation.isPending}>
              <Send className="h-4 w-4 ml-2" />
              تقديم للموافقة
            </Button>
          )}

          {isPending && !showRejectForm && (
            <>
              <Button
                variant="destructive"
                onClick={() => setShowRejectForm(true)}
                disabled={approvalMutation.isPending}
              >
                <XCircle className="h-4 w-4 ml-2" />
                رفض
              </Button>
              <Button onClick={handleApprove} disabled={approvalMutation.isPending}>
                <CheckCircle className="h-4 w-4 ml-2" />
                اعتماد
              </Button>
            </>
          )}

          {showRejectForm && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(false)}
                disabled={approvalMutation.isPending}
              >
                رجوع
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={approvalMutation.isPending || !rejectionReason.trim()}
              >
                <XCircle className="h-4 w-4 ml-2" />
                تأكيد الرفض
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceApprovalDialog;
