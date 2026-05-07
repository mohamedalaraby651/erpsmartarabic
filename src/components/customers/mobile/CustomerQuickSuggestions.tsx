import { memo } from "react";
import { Card } from "@/components/ui/card";
import { FileText, Printer, Bell, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickSuggestion {
  id: 'invoices' | 'statement' | 'reminders';
  label: string;
  hint: string;
  icon: React.ElementType;
  /** Tailwind class using semantic tokens only */
  tone: 'primary' | 'success' | 'warning';
  badge?: number;
}

interface CustomerQuickSuggestionsProps {
  overdueCount?: number;
  upcomingReminders?: number;
  onPick: (id: QuickSuggestion['id']) => void;
}

const toneClass: Record<QuickSuggestion['tone'], { bg: string; ring: string; icon: string }> = {
  primary: {
    bg: 'bg-primary/5 hover:bg-primary/10',
    ring: 'border-primary/20',
    icon: 'text-primary bg-primary/10',
  },
  success: {
    bg: 'bg-success/5 hover:bg-success/10',
    ring: 'border-success/20',
    icon: 'text-success bg-success/10',
  },
  warning: {
    bg: 'bg-warning/5 hover:bg-warning/10',
    ring: 'border-warning/20',
    icon: 'text-warning bg-warning/10',
  },
};

export const CustomerQuickSuggestions = memo(function CustomerQuickSuggestions({
  overdueCount = 0,
  upcomingReminders = 0,
  onPick,
}: CustomerQuickSuggestionsProps) {
  const suggestions: QuickSuggestion[] = [
    {
      id: 'invoices',
      label: 'الفواتير',
      hint: overdueCount > 0 ? `${overdueCount} فاتورة متأخرة` : 'عرض كل الفواتير',
      icon: FileText,
      tone: overdueCount > 0 ? 'warning' : 'primary',
      badge: overdueCount,
    },
    {
      id: 'statement',
      label: 'كشف الحساب',
      hint: 'حركة الرصيد الكاملة',
      icon: Printer,
      tone: 'success',
    },
    {
      id: 'reminders',
      label: 'التذكيرات',
      hint: upcomingReminders > 0 ? `${upcomingReminders} تذكير قادم` : 'إدارة التذكيرات',
      icon: Bell,
      tone: 'primary',
      badge: upcomingReminders,
    },
  ];

  return (
    <Card className="p-3 border bg-card/50">
      <div className="text-[11px] text-muted-foreground mb-2 font-medium">اقتراحات سريعة</div>
      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((s) => {
          const Icon = s.icon;
          const tone = toneClass[s.tone];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s.id)}
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
