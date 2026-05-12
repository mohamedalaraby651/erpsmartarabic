import { memo } from "react";
import { Button } from "@/components/ui/button";
import { FileText, CreditCard, Phone, MoreHorizontal, ChevronRight, ChevronLeft } from "lucide-react";
import CustomerAvatar from "@/components/customers/shared/CustomerAvatar";
import { cn } from "@/lib/utils";
import type { Customer } from "@/lib/customerConstants";

interface CustomerCompressedHeaderProps {
  customer: Customer;
  currentBalance: number;
  balanceIsDebit: boolean;
  onNewInvoice: () => void;
  onNewPayment?: () => void;
  onCall?: () => void;
  onMoreActions: () => void;
  /** التنقل بين الأقسام بدون التمرير لأعلى */
  onPrevSection?: () => void;
  onNextSection?: () => void;
  sectionLabel?: string;
}

export const CustomerCompressedHeader = memo(function CustomerCompressedHeader({
  customer, currentBalance, balanceIsDebit,
  onNewInvoice, onNewPayment, onCall, onMoreActions,
  onPrevSection, onNextSection, sectionLabel,
}: CustomerCompressedHeaderProps) {
  return (
    <div className="bg-card/85 backdrop-blur-md border rounded-xl shadow-sm p-2 flex items-center gap-2">
      <CustomerAvatar name={customer.name} imageUrl={customer.image_url} customerType={customer.customer_type} size="sm" />
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-bold truncate leading-tight">{customer.name}</h2>
        <div className="flex items-center gap-1.5 leading-tight">
          <p className={cn("text-[11px] font-semibold tabular-nums", balanceIsDebit ? "text-destructive" : "text-success")}>
            {currentBalance.toLocaleString()} <span className="text-[9px] text-muted-foreground font-normal">ج.م</span>
          </p>
          {sectionLabel && (
            <>
              <span className="text-muted-foreground/50 text-[10px]">·</span>
              <span className="text-[10px] text-muted-foreground truncate">{sectionLabel}</span>
            </>
          )}
        </div>
      </div>
      {(onPrevSection || onNextSection) && (
        <div className="flex items-center gap-0.5 shrink-0 mr-1" role="group" aria-label="تنقل بين الأقسام">
          {onPrevSection && (
            <Button size="icon" variant="ghost" className="h-9 w-8" onClick={onPrevSection} aria-label="القسم السابق">
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {onNextSection && (
            <Button size="icon" variant="ghost" className="h-9 w-8" onClick={onNextSection} aria-label="القسم التالي">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      <Button size="icon" className="h-9 w-9 shrink-0" onClick={onNewInvoice} aria-label="فاتورة جديدة">
        <FileText className="h-4 w-4" />
      </Button>
      {onNewPayment && (
        <Button size="icon" variant="outline" className="hidden xs:inline-flex h-9 w-9 shrink-0" onClick={onNewPayment} aria-label="دفعة جديدة">
          <CreditCard className="h-4 w-4" />
        </Button>
      )}
      {onCall && customer.phone && (
        <Button size="icon" variant="outline" className="hidden min-[360px]:inline-flex h-9 w-9 shrink-0" asChild aria-label={`اتصال بـ ${customer.phone}`}>
          <a href={`tel:${customer.phone}`}>
            <Phone className="h-4 w-4" />
          </a>
        </Button>
      )}
      <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={onMoreActions} aria-label="إجراءات أخرى">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );
});
