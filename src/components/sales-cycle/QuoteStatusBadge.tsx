import { Badge } from "@/components/ui/badge";
import type { QuoteStatus } from "@/hooks/sales-cycle/useQuotes";

const labels: Record<QuoteStatus, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
  sent: { label: "مُرسل", cls: "bg-info/15 text-info border-info/30" },
  accepted: { label: "مقبول", cls: "bg-success/15 text-success border-success/30" },
  rejected: { label: "مرفوض", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  expired: { label: "منتهي", cls: "bg-warning/15 text-warning border-warning/30" },
  converted: { label: "محوَّل", cls: "bg-primary/15 text-primary border-primary/30" },
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const s = labels[status];
  return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
}
