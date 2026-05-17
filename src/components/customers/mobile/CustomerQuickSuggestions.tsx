import { memo, useMemo, useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { FileText, Printer, Bell, ArrowLeft, MessageCircle, Wallet, RefreshCw, History, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSuggestionHistory } from "@/hooks/customers/useSuggestionHistory";
import { tooltips } from "@/lib/uiCopy";

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
  customerId?: string;
  overdueCount?: number;
  upcomingReminders?: number;
  /** فجوة الائتمان (إن كانت موجبة فالعميل تجاوز الحد) */
  creditOverflow?: number;
  /** أيام منذ آخر تواصل */
  daysSinceContact?: number | null;
  /** عروض سعر معلقة منذ ٧+ أيام */
  staleQuotations?: number;
  hasPhone?: boolean;
  /** هل العميل نشط (افتراضياً true لتفادي إخفاء الاقتراحات بدون قصد) */
  isActive?: boolean;
  onPick: (id: SuggestionId) => void;
  onWhatsApp?: () => void;
}

const toneClass: Record<QuickSuggestion['tone'], { bg: string; ring: string; icon: string }> = {
  primary: { bg: 'bg-primary/5 hover:bg-primary/10', ring: 'border-primary/20', icon: 'text-primary bg-primary/10' },
  success: { bg: 'bg-success/5 hover:bg-success/10', ring: 'border-success/20', icon: 'text-success bg-success/10' },
  warning: { bg: 'bg-warning/5 hover:bg-warning/10', ring: 'border-warning/20', icon: 'text-warning bg-warning/10' },
  destructive: { bg: 'bg-destructive/5 hover:bg-destructive/10', ring: 'border-destructive/20', icon: 'text-destructive bg-destructive/10' },
};

function formatRelative(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `قبل ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `قبل ${hrs} س`;
  const days = Math.floor(hrs / 24);
  return `قبل ${days} ي`;
}

export const CustomerQuickSuggestions = memo(function CustomerQuickSuggestions({
  customerId,
  overdueCount = 0, upcomingReminders = 0, creditOverflow = 0,
  daysSinceContact, staleQuotations = 0, hasPhone, isActive = true, onPick, onWhatsApp,
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

    // أولوية ٤: انقطاع تواصل (يتطلب رقم هاتف ودالة واتساب)
    if (hasPhone && !!onWhatsApp && daysSinceContact != null && daysSinceContact >= 30) {
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

  const { entries: history, append, clear } = useSuggestionHistory(customerId);
  const [showHistory, setShowHistory] = useState(false);

  // تتبع التغييرات لتمييز الاقتراحات الجديدة بومضة خفيفة + تسجيل في السجل
  // يستخدم بصمة (signature) تتأثر بقيم العتبة (overdue/credit/contact bucket) لا بمجرد ids
  const sigRef = useRef<string>('');
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [announce, setAnnounce] = useState<string>('');
  useEffect(() => {
    // bucket لتقليل الضوضاء: تغيّر يوم تواصل بـ ±1 لا يُحسب
    const contactBucket = daysSinceContact == null ? -1 : Math.floor(daysSinceContact / 7);
    const creditBucket = Math.floor(creditOverflow);
    const sig = [
      suggestions.map(s => s.id).join('|'),
      `o:${overdueCount}`,
      `c:${creditBucket}`,
      `q:${staleQuotations}`,
      `r:${upcomingReminders}`,
      `d:${contactBucket}`,
    ].join(';');

    if (sigRef.current === sig) return;
    const prevIds = new Set((sigRef.current.split(';')[0] || '').split('|').filter(Boolean));
    const isInitial = sigRef.current === '';
    sigRef.current = sig;

    // لأول تحميل: سجِّل الاقتراحات الحالية فقط إذا كانت ذات معنى (ليس "افتراضي")
    const hasSignal = overdueCount > 0 || creditOverflow > 0 || staleQuotations > 0
      || upcomingReminders > 0 || (daysSinceContact != null && daysSinceContact >= 30);
    const freshList = isInitial
      ? (hasSignal ? suggestions : [])
      : suggestions.filter(s => !prevIds.has(s.id));

    if (freshList.length === 0) return;
    const fresh = new Set(freshList.map(s => s.id));
    setFreshIds(fresh);
    setAnnounce(`اقتراح جديد: ${freshList[0].label}`);
    append(freshList.map(s => ({ id: s.id, label: s.label, reason: s.hint })));
    const t = setTimeout(() => setFreshIds(new Set()), 1600);
    return () => clearTimeout(t);
  }, [suggestions, append, overdueCount, creditOverflow, staleQuotations, upcomingReminders, daysSinceContact]);

  const handleClick = (id: SuggestionId) => {
    if (id === 'whatsapp') {
      if (hasPhone && onWhatsApp) onWhatsApp();
      return;
    }
    onPick(id);
  };

  if (!isActive) {
    return (
      <Card className="p-4 border bg-muted/30 text-center">
        <p className="text-sm text-muted-foreground">
          العميل غير نشط — لا توجد إجراءات مقترحة
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-3 border bg-card/50">
      <div className="sr-only" aria-live="polite" aria-atomic="true">{announce}</div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] text-muted-foreground font-medium">اقتراحات ذكية</div>
        {customerId && history.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
            aria-expanded={showHistory}
            aria-label={tooltips.eventLog}
          >
            <History className="h-3 w-3" aria-hidden />
            <span>السجل ({history.length})</span>
          </button>
        )}
      </div>

      {showHistory && (
        <div className="mb-3 rounded-lg border bg-muted/30 p-2 animate-fade-in">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-muted-foreground">آخر التغيرات (٢٤ ساعة)</span>
            <button
              type="button"
              onClick={clear}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
              aria-label={tooltips.clearEventHistory}
            >
              <X className="h-3 w-3" aria-hidden /> مسح
            </button>
          </div>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {history.map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex items-start gap-2 text-[11px]">
                <span className="text-muted-foreground shrink-0 tabular-nums">{formatRelative(e.at)}</span>
                <span className="flex-1 min-w-0">
                  <span className="font-semibold">{e.label}</span>
                  <span className="text-muted-foreground"> — {e.reason}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((s) => {
          const Icon = s.icon;
          const tone = toneClass[s.tone];
          const isFresh = freshIds.has(s.id);
          return (
            <button
              key={s.id + s.label}
              type="button"
              onClick={() => handleClick(s.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all min-h-12 text-right",
                "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tone.bg, tone.ring,
                isFresh && "animate-fade-in ring-2 ring-ring/40",
              )}
              aria-label={`${s.label} — ${s.hint}`}
            >
              <div className={cn("flex items-center justify-center w-9 h-9 rounded-lg shrink-0", tone.icon)}>
                <Icon className="h-4 w-4" aria-hidden />
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
              <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
            </button>
          );
        })}
      </div>
    </Card>
  );
});
