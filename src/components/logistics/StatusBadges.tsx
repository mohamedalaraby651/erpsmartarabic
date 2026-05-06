import { Badge } from "@/components/ui/badge";
import type { GoodsReceiptStatus } from "@/hooks/logistics/useGoodsReceipts";
import type { DeliveryNoteStatus } from "@/hooks/logistics/useDeliveryNotes";
import type { MatchingStatus, PurchaseInvoiceStatus } from "@/hooks/logistics/usePurchaseInvoices";

const grLabels: Record<GoodsReceiptStatus, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
  posted: { label: "مرحّل", cls: "bg-success/15 text-success border-success/30" },
  cancelled: { label: "ملغي", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

const dnLabels: Record<DeliveryNoteStatus, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
  in_transit: { label: "قيد الشحن", cls: "bg-info/15 text-info border-info/30" },
  delivered: { label: "تم التسليم", cls: "bg-success/15 text-success border-success/30" },
  cancelled: { label: "ملغي", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

const piLabels: Record<PurchaseInvoiceStatus, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
  posted: { label: "مرحّلة", cls: "bg-success/15 text-success border-success/30" },
  paid: { label: "مدفوعة", cls: "bg-primary/15 text-primary border-primary/30" },
  cancelled: { label: "ملغاة", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

const matchLabels: Record<MatchingStatus, { label: string; cls: string }> = {
  matched: { label: "مطابقة كاملة", cls: "bg-success/15 text-success border-success/30" },
  under_received: { label: "كمية أقل", cls: "bg-warning/15 text-warning border-warning/30" },
  over_received: { label: "تجاوز الكمية", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  no_receipt: { label: "بلا استلام", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  pending: { label: "قيد الانتظار", cls: "bg-muted text-muted-foreground" },
};

export function GoodsReceiptStatusBadge({ status }: { status: GoodsReceiptStatus }) {
  const s = grLabels[status];
  return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
}

export function DeliveryNoteStatusBadge({ status }: { status: DeliveryNoteStatus }) {
  const s = dnLabels[status];
  return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
}

export function PurchaseInvoiceStatusBadge({ status }: { status: PurchaseInvoiceStatus }) {
  const s = piLabels[status];
  return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
}

export function MatchingStatusBadge({ status }: { status: MatchingStatus }) {
  const s = matchLabels[status];
  return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
}
