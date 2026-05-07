import { memo, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, Clock, UserX, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];

interface AlertItem {
  id: string;
  icon: React.ElementType;
  message: string;
  action: string;
  variant: 'destructive' | 'warning' | 'info' | 'success';
  onAction: () => void;
}

const variantStyles = {
  destructive: 'bg-destructive/10 border-destructive/30 text-destructive',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400',
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
};

interface CustomerSmartAlertsProps {
  currentBalance: number;
  creditLimit: number;
  invoices: Invoice[];
  lastPurchaseDate: string | null;
  lastCommunicationAt: string | null;
  onEditCreditLimit: () => void;
  onSendReminder: () => void;
  onNewInvoice: () => void;
  onContact: () => void;
}

export const CustomerSmartAlerts = memo(function CustomerSmartAlerts({
  currentBalance, creditLimit, invoices, lastPurchaseDate, lastCommunicationAt,
  onEditCreditLimit, onSendReminder, onNewInvoice, onContact,
}: CustomerSmartAlertsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const alerts = useMemo<AlertItem[]>(() => {
    const list: AlertItem[] = [];
    const now = Date.now();

    if (creditLimit > 0 && currentBalance >= creditLimit) {
      list.push({
        id: 'credit-exceeded',
        icon: AlertTriangle,
        message: `تجاوز حد الائتمان — الرصيد ${currentBalance.toLocaleString()} من أصل ${creditLimit.toLocaleString()} ج.م`,
        action: 'تعديل الحد',
        variant: 'destructive',
        onAction: onEditCreditLimit,
      });
    }

    const overdueCount = invoices.filter(inv => {
      if (inv.payment_status === 'paid') return false;
      const due = inv.due_date ? new Date(inv.due_date).getTime() : new Date(inv.created_at).getTime();
      return (now - due) > 60 * 24 * 60 * 60 * 1000;
    }).length;

    if (overdueCount > 0) {
      list.push({
        id: 'overdue',
        icon: Clock,
        message: `${overdueCount} فاتورة متأخرة أكثر من 60 يوم`,
        action: 'إرسال تذكير',
        variant: 'warning',
        onAction: onSendReminder,
      });
    }

    const lastActivity = lastPurchaseDate || lastCommunicationAt;
    if (lastActivity && invoices.length > 0) {
      const daysSince = Math.floor((now - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 30) {
        list.push({
          id: 'inactive',
          icon: UserX,
          message: `عميل خامل منذ ${daysSince} يوم — آخر نشاط ${new Date(lastActivity).toLocaleDateString('ar-EG')}`,
          action: 'تواصل',
          variant: 'info',
          onAction: onContact,
        });
      }
    }

    if (invoices.length === 0) {
      list.push({
        id: 'new-customer',
        icon: Sparkles,
        message: 'عميل جديد — لم يتم إنشاء أي فاتورة بعد',
        action: 'إنشاء فاتورة',
        variant: 'success',
        onAction: onNewInvoice,
      });
    }

    return list;
  }, [currentBalance, creditLimit, invoices, lastPurchaseDate, lastCommunicationAt, onEditCreditLimit, onSendReminder, onContact, onNewInvoice]);

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));
  if (visibleAlerts.length === 0) return null;

  // Show first alert always; collapse the rest behind a toggle when 2+
  const shown = expanded ? visibleAlerts : visibleAlerts.slice(0, 1);
  const hiddenCount = visibleAlerts.length - shown.length;

  return (
    <div className="space-y-2 w-full" role="region" aria-label="تنبيهات العميل" aria-live="polite">
      {shown.map(alert => {
        const Icon = alert.icon;
        return (
          <div
            key={alert.id}
            role="alert"
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm",
              variantStyles[alert.variant]
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0 truncate">{alert.message}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs shrink-0 hover:bg-background/50"
              onClick={alert.onAction}
              aria-label={`${alert.action} — ${alert.message}`}
            >
              {alert.action}
            </Button>
            <button
              onClick={() => setDismissed(prev => new Set(prev).add(alert.id))}
              className="shrink-0 p-0.5 rounded hover:bg-background/50"
              aria-label="إخفاء التنبيه"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
      {visibleAlerts.length > 1 && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> طيّ التنبيهات
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> عرض {hiddenCount} تنبيه إضافي
            </>
          )}
        </button>
      )}
    </div>
  );
});
