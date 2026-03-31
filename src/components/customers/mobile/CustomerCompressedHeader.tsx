import { memo } from "react";
import { Button } from "@/components/ui/button";
import { FileText, CreditCard, Phone, MoreHorizontal } from "lucide-react";
import CustomerAvatar from "@/components/customers/CustomerAvatar";
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
}

export const CustomerCompressedHeader = memo(function CustomerCompressedHeader({
  customer, currentBalance, balanceIsDebit,
  onNewInvoice, onNewPayment, onCall, onMoreActions,
}: CustomerCompressedHeaderProps) {
  return (
    <div className="bg-card border rounded-xl shadow-sm p-3 space-y-2">
      {/* Row 1: Avatar + Name + Balance */}
      <div className="flex items-center gap-3">
        <CustomerAvatar name={customer.name} imageUrl={customer.image_url} customerType={customer.customer_type} size="sm" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate">{customer.name}</h2>
          <p className="text-xs text-muted-foreground">
            {customer.customer_type === 'company' ? 'شركة' : customer.customer_type === 'farm' ? 'مزرعة' : 'فرد'}
          </p>
        </div>
        <div className="text-left shrink-0">
          <p className="text-[10px] text-muted-foreground">الرصيد</p>
          <p className={cn("text-sm font-bold tabular-nums", balanceIsDebit ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
            {currentBalance.toLocaleString()} <span className="text-[10px]">ج.م</span>
          </p>
        </div>
      </div>

      {/* Row 2: Quick action buttons */}
      <div className="flex items-center gap-1.5">
        <Button size="sm" className="flex-1 min-h-9 text-xs" onClick={onNewInvoice}>
          <FileText className="h-3.5 w-3.5 ml-1" />فاتورة
        </Button>
        {onNewPayment && (
          <Button size="sm" variant="outline" className="flex-1 min-h-9 text-xs" onClick={onNewPayment}>
            <CreditCard className="h-3.5 w-3.5 ml-1" />دفعة
          </Button>
        )}
        {onCall && customer.phone && (
          <Button size="icon" variant="outline" className="min-h-9 min-w-9 shrink-0" asChild>
            <a href={`tel:${customer.phone}`}>
              <Phone className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
        <Button size="icon" variant="outline" className="min-h-9 min-w-9 shrink-0" onClick={onMoreActions}>
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
});
