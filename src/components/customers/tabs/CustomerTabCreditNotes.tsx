import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type CreditNote = Database['public']['Tables']['credit_notes']['Row'];

interface CustomerTabCreditNotesProps {
  creditNotes: CreditNote[];
}

const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  approved: 'معتمد',
  applied: 'مطبق',
  cancelled: 'ملغي',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-primary/10 text-primary',
  applied: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  cancelled: 'bg-destructive/10 text-destructive',
};

export const CustomerTabCreditNotes = memo(function CustomerTabCreditNotes({
  creditNotes,
}: CustomerTabCreditNotesProps) {
  const navigate = useNavigate();

  if (creditNotes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>لا توجد إشعارات دائنة</p>
      </div>
    );
  }

  const totalReturns = creditNotes.reduce((sum, cn) => sum + cn.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          إشعارات دائنة ({creditNotes.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary bar */}
        <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2.5 mb-4 text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">العدد: <span className="font-bold text-foreground">{creditNotes.length}</span></span>
            <span className="text-muted-foreground">إجمالي المرتجعات: <span className="font-bold text-destructive">{totalReturns.toLocaleString()}</span></span>
          </div>
        </div>
        <div className="divide-y">
          {creditNotes.map((cn) => (
            <div
              key={cn.id}
              className="flex items-center justify-between py-3 hover:bg-muted/50 px-2 rounded-md cursor-pointer transition-colors"
              onClick={() => navigate(`/credit-notes/${cn.id}`)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{cn.credit_note_number}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(cn.created_at).toLocaleDateString('ar-EG')}
                  {cn.reason && ` • ${cn.reason}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={statusColors[cn.status] || statusColors.draft}>
                  {statusLabels[cn.status] || cn.status}
                </Badge>
                <span className="font-bold text-sm">{cn.amount.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
