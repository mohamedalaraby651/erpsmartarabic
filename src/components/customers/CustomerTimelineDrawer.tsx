import { memo, useMemo } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { FileText, CreditCard, Target, TrendingUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { KPIFilter } from "./CustomerKPICards";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

interface TimelineEvent {
  id: string;
  date: string;
  type: 'invoice' | 'payment';
  amount: number;
  label: string;
  status?: string;
  method?: string;
}

const filterTitles: Record<KPIFilter, string> = {
  balance: 'تفاصيل الرصيد',
  outstanding: 'الفواتير المستحقة',
  purchases: 'سجل المشتريات',
};

const filterIcons: Record<KPIFilter, React.ElementType> = {
  balance: CreditCard,
  outstanding: Target,
  purchases: TrendingUp,
};

const statusLabels: Record<string, string> = {
  paid: 'مدفوع', partial: 'جزئي', unpaid: 'غير مدفوع', overdue: 'متأخر',
};

type CreditNote = Database['public']['Tables']['credit_notes']['Row'];

interface CustomerTimelineDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: KPIFilter;
  invoices: Invoice[];
  payments: Payment[];
  creditNotes?: CreditNote[];
}

export const CustomerTimelineDrawer = memo(function CustomerTimelineDrawer({
  open, onOpenChange, filter, invoices, payments, creditNotes = [],
}: CustomerTimelineDrawerProps) {
  const isMobile = useIsMobile();

  const events = useMemo(() => {
    const items: TimelineEvent[] = [];

    if (filter === 'balance' || filter === 'purchases') {
      invoices.forEach(inv => items.push({
        id: inv.id, date: inv.created_at, type: 'invoice',
        amount: inv.total_amount, label: inv.invoice_number,
        status: inv.payment_status,
      }));
      payments.forEach(pay => items.push({
        id: pay.id, date: pay.payment_date, type: 'payment',
        amount: pay.amount, label: pay.payment_number,
        method: pay.payment_method,
      }));
    } else if (filter === 'outstanding') {
      // Build credit note totals per invoice
      const creditByInvoice: Record<string, number> = {};
      creditNotes.forEach(cn => {
        creditByInvoice[cn.invoice_id] = (creditByInvoice[cn.invoice_id] || 0) + cn.amount;
      });
      invoices
        .filter(inv => inv.payment_status !== 'paid')
        .forEach(inv => {
          const creditAmount = creditByInvoice[inv.id] || 0;
          const outstanding = inv.total_amount - (inv.paid_amount || 0) - creditAmount;
          if (outstanding > 0) {
            items.push({
              id: inv.id, date: inv.created_at, type: 'invoice',
              amount: outstanding, label: inv.invoice_number,
              status: inv.payment_status,
            });
          }
        });
    }

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30);
  }, [filter, invoices, payments]);

  const Icon = filterIcons[filter];

  const content = (
    <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
      {events.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">لا توجد بيانات</p>
      ) : (
        <div className="relative pr-6">
          {/* Timeline line */}
          <div className="absolute right-2 top-0 bottom-0 w-0.5 bg-border" />

          {events.map((event, i) => (
            <div key={event.id} className="relative mb-4 last:mb-0">
              {/* Dot */}
              <div className={cn(
                "absolute -right-[1.15rem] top-1 h-3 w-3 rounded-full border-2 border-background",
                event.type === 'invoice' ? "bg-blue-500" : "bg-emerald-500"
              )} />

              <div className="bg-card rounded-lg border p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {event.type === 'invoice' ? (
                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                    ) : (
                      <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                    <span className="text-xs font-medium">{event.label}</span>
                  </div>
                  {event.status && (
                    <Badge variant="outline" className={cn("text-[10px] px-1.5",
                      event.status === 'paid' ? 'text-emerald-600 border-emerald-300' :
                      event.status === 'overdue' ? 'text-destructive border-destructive/30' :
                      'text-amber-600 border-amber-300'
                    )}>
                      {statusLabels[event.status] || event.status}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn("font-bold text-sm",
                    event.type === 'payment' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                  )}>
                    {event.type === 'payment' ? '+' : ''}{event.amount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(event.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {filterTitles[filter]}
            </DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {filterTitles[filter]}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">{content}</div>
      </SheetContent>
    </Sheet>
  );
});
