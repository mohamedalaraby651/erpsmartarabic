import { memo } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Phone, MoreHorizontal, ChevronRight, ChevronLeft, ArrowRight, ArrowLeft } from "lucide-react";
import CustomerAvatar from "@/components/customers/shared/CustomerAvatar";
import { cn } from "@/lib/utils";
import { tooltips, regions } from "@/lib/uiCopy";
import type { Customer } from "@/lib/customerConstants";

interface CustomerCompressedHeaderProps {
  customer: Customer;
  currentBalance: number;
  balanceIsDebit: boolean;
  onNewInvoice: () => void;
  onMoreActions: () => void;
  /** التنقل بين الأقسام بدون التمرير لأعلى */
  onPrevSection?: () => void;
  onNextSection?: () => void;
  sectionLabel?: string;
  /** التنقل بين العملاء — يحلّ محل CustomerNavStrip على الموبايل */
  onPrevCustomer?: () => void;
  onNextCustomer?: () => void;
  hasPrevCustomer?: boolean;
  hasNextCustomer?: boolean;
}

export const CustomerCompressedHeader = memo(function CustomerCompressedHeader({
  customer, currentBalance, balanceIsDebit,
  onNewInvoice, onMoreActions,
  onPrevSection, onNextSection, sectionLabel,
  onPrevCustomer, onNextCustomer, hasPrevCustomer, hasNextCustomer,
}: CustomerCompressedHeaderProps) {
  const hasCustomerNav = (hasPrevCustomer || hasNextCustomer) && (onPrevCustomer || onNextCustomer);
  const balanceLabel = `${currentBalance.toLocaleString()} جنيه — ${balanceIsDebit ? 'مدين' : 'دائن'}`;
  return (
    <div
      className="bg-card/85 backdrop-blur-md border rounded-xl shadow-sm p-2 flex items-center gap-1.5"
      role="toolbar"
      aria-label={`شريط أدوات العميل ${customer.name}`}
    >
      {hasCustomerNav && (
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-7 shrink-0"
          onClick={onPrevCustomer}
          disabled={!hasPrevCustomer}
          aria-label={tooltips.prevCustomer}
        >
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      )}
      <CustomerAvatar name={customer.name} imageUrl={customer.image_url} customerType={customer.customer_type} size="sm" />
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-bold truncate leading-tight">{customer.name}</h2>
        <div className="flex items-center gap-1.5 leading-tight">
          <p
            className={cn("text-[11px] font-semibold tabular-nums", balanceIsDebit ? "text-destructive" : "text-success")}
            aria-label={`الرصيد الحالي ${balanceLabel}`}
          >
            {currentBalance.toLocaleString()} <span className="text-[9px] text-foreground/70 font-normal">ج.م</span>
          </p>
          {sectionLabel && (
            <>
              <span className="text-muted-foreground/60 text-[10px]" aria-hidden>·</span>
              <span className="text-[10px] text-foreground/75 truncate" aria-label={`القسم الحالي: ${sectionLabel}`}>
                {sectionLabel}
              </span>
            </>
          )}
        </div>
      </div>
      {hasCustomerNav && (
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-7 shrink-0"
          onClick={onNextCustomer}
          disabled={!hasNextCustomer}
          aria-label={tooltips.nextCustomer}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Button>
      )}
      {(onPrevSection || onNextSection) && (
        <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label={regions.customerSectionsGroup}>
          {onPrevSection && (
            <Button size="icon" variant="ghost" className="h-9 w-7" onClick={onPrevSection} aria-label={tooltips.prevSection}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          )}
          {onNextSection && (
            <Button size="icon" variant="ghost" className="h-9 w-7" onClick={onNextSection} aria-label={tooltips.nextSection}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      )}
      {customer.phone && (
        <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" asChild aria-label={`اتصال بـ ${customer.name} على ${customer.phone}`}>
          <a href={`tel:${customer.phone}`}>
            <Phone className="h-4 w-4 text-success" aria-hidden />
          </a>
        </Button>
      )}
      <Button size="icon" className="h-9 w-9 shrink-0" onClick={onNewInvoice} aria-label={tooltips.newInvoice}>
        <FileText className="h-4 w-4" aria-hidden />
      </Button>
      <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={onMoreActions} aria-label={tooltips.moreActions} aria-haspopup="dialog">
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
});
