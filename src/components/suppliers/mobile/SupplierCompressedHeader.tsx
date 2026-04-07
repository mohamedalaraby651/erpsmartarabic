import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ShoppingCart, CreditCard, Phone, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'];

interface SupplierCompressedHeaderProps {
  supplier: Supplier;
  currentBalance: number;
  onCreateOrder: () => void;
  onRecordPayment: () => void;
  onMoreActions: () => void;
}

export const SupplierCompressedHeader = memo(function SupplierCompressedHeader({
  supplier, currentBalance, onCreateOrder, onRecordPayment, onMoreActions,
}: SupplierCompressedHeaderProps) {
  const initials = supplier.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const hasHighBalance = currentBalance > 50000;

  return (
    <div className="bg-card border rounded-xl shadow-sm p-3 space-y-2">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate">{supplier.name}</h2>
          <p className="text-xs text-muted-foreground">{supplier.contact_person || 'مورد'}</p>
        </div>
        <div className="text-left shrink-0">
          <p className="text-[10px] text-muted-foreground">الرصيد</p>
          <p className={cn("text-sm font-bold tabular-nums", hasHighBalance ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
            {currentBalance.toLocaleString()} <span className="text-[10px]">ج.م</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Button size="sm" className="flex-1 min-h-9 text-xs" onClick={onCreateOrder}>
          <ShoppingCart className="h-3.5 w-3.5 ml-1" />أمر شراء
        </Button>
        <Button size="sm" variant="outline" className="flex-1 min-h-9 text-xs" onClick={onRecordPayment}>
          <CreditCard className="h-3.5 w-3.5 ml-1" />دفعة
        </Button>
        {supplier.phone && (
          <Button size="icon" variant="outline" className="min-h-9 min-w-9 shrink-0" asChild>
            <a href={`tel:${supplier.phone}`}><Phone className="h-3.5 w-3.5" /></a>
          </Button>
        )}
        <Button size="icon" variant="outline" className="min-h-9 min-w-9 shrink-0" onClick={onMoreActions}>
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
});
