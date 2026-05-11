import { memo, useMemo, useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { FileText, Printer, Bell, ArrowLeft, MessageCircle, Wallet, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type SuggestionId =
  | 'invoices' | 'statement' | 'reminders' | 'payments' | 'sales' | 'whatsapp';

interface QuickSuggestion {
  id: SuggestionId;
  label: string;
  hint: string;
  icon: React.ElementType;
  tone: 'primary' | 'success' | 'warning' | 'destructive';
  badge?: number;
}

interface CustomerQuickSuggestionsProps {
  overdueCount?: number;
  upcomingReminders?: number;
  /** فجوة الائتمان (إن كانت موجبة فالعميل تجاوز الحد) */
  creditOverflow?: number;
  /** أيام منذ آخر تواصل */
  daysSinceContact?: number | null;
  /** عروض سعر معلقة منذ ٧+ أيام */
  staleQuotations?: number;
  hasPhone?: boolean;
  onPick: (id: SuggestionId) => void;
  onWhatsApp?: () => void;
}

const toneClass: Record<QuickSuggestion['tone'], { bg: string; ring: string; icon: string }> = {
  primary: { bg: 'bg-primary/5 hover:bg-primary/10', ring: 'border-primary/20', icon: 'text-primary bg-primary/10' },
  success: { bg: 'bg-success/5 hover:bg-success/10', ring: 'border-success/20', icon: 'text-success bg-success/10' },
  warning: { bg: 'bg-warning/5 hover:bg-warning/10', ring: 'border-warning/20', icon: 'text-warning bg-warning/10' },
  destructive: { bg: 'bg-destructive/5 hover:bg-destructive/10', ring: 'border-destructive/20', icon: 'text-destructive bg-destructive/10' },
};

export const CustomerQuickSuggestions = memo(function CustomerQuickSuggestions({
  overdueCount = 0, upcomingReminders = 0, creditOverflow = 0,
  daysSinceContact, staleQuotations = 0, hasPhone, onPick, onWhatsApp,
}: CustomerQuickSuggestionsProps) {
  const suggestions = useMemo<QuickSuggestion[]>(() => {
    const list: QuickSuggestion[] = [];

    // أولوية ١: تجاوز حد الائتمان
    if (creditOverflow > 0) {
      list.push({
        id: 'payments',
        label: 'حصِّل دفعة عاجلاً',
        hint: `تجاوز حد الائتمان بـ ${Math.round(creditOverflow).toLocaleString()} ج.م`,
        icon: Wallet, tone: 'destructive',
      });
    }

    // أولوية ٢: فواتير متأخرة
    if (overdueCount > 0) {
      list.push({
        id: 'invoices',
        label: 'فواتير متأخرة',
        hint: `${overdueCount} فاتورة تستحق المتابعة`,
        icon: FileText, tone: 'warning', badge: overdueCount,
      });
    }

    // أولوية ٣: عروض سعر معلقة
    if (staleQuotations > 0) {
      list.push({
        id: 'sales',
        label: 'حوّل عروض السعر',
        hint: `${staleQuotations} عرض سعر معلق منذ ٧+ أيام`,
        icon: RefreshCw, tone: 'primary', badge: staleQuotations,
      });
    }

    // أولوية ٤: انقطاع تواصل
    if (hasPhone && daysSinceContact != null && daysSinceContact >= 30 && onWhatsApp) {
      list.push({
        id: 'whatsapp',
        label: 'تواصل مع العميل',
        hint: `لا يوجد تواصل منذ ${daysSinceContact} يوم`,
        icon: MessageCircle, tone: 'success',
      });
    }

    // أولوية ٥: تذكيرات قادمة
    if (upcomingReminders > 0) {
      list.push({
        id: 'reminders',
        label: 'تذكيرات قادمة',
        hint: `${upcomingReminders} تذكير في الانتظار`,
        icon: Bell, tone: 'primary', badge: upcomingReminders,
      });
    }

    // افتراضي: لا توجد إشارات نشطة
    if (list.length === 0) {
      list.push(
        { id: 'invoices', label: 'الفواتير', hint: 'عرض كل الفواتير', icon: FileText, tone: 'primary' },
        { id: 'statement', label: 'كشف الحساب', hint: 'حركة الرصيد الكاملة', icon: Printer, tone: 'success' },
        { id: 'reminders', label: 'التذكيرات', hint: 'إدارة التذكيرات', icon: Bell, tone: 'primary' },
      );
    }

    return list.slice(0, 4);
  }, [overdueCount, upcomingReminders, creditOverflow, daysSinceContact, staleQuotations, hasPhone, onWhatsApp]);

  const handleClick = (id: SuggestionId) => {
    if (id === 'whatsapp' && onWhatsApp) { onWhatsApp(); return; }
    onPick(id);
  };

  return (
    <Card className="p-3 border bg-card/50">
      <div className="text-[11px] text-muted-foreground mb-2 font-medium">اقتراحات ذكية</div>
      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((s) => {
          const Icon = s.icon;
          const tone = toneClass[s.tone];
          return (
            <button
              key={s.id + s.label}
              type="button"
              onClick={() => handleClick(s.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all min-h-12 text-right",
                "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tone.bg, tone.ring,
              )}
              aria-label={`${s.label} — ${s.hint}`}
            >
              <div className={cn("flex items-center justify-center w-9 h-9 rounded-lg shrink-0", tone.icon)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{s.label}</span>
                  {s.badge && s.badge > 0 ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground font-bold">
                      {s.badge > 99 ? '99+' : s.badge}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground truncate">{s.hint}</p>
              </div>
              <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </Card>
  );
});
