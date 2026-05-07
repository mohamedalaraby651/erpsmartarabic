import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  FileText, CreditCard, Info, StickyNote, BarChart3,
  ShoppingCart, Printer, Clock, Bell, MessageSquare, Paperclip,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type MobileSectionId =
  | 'none' | 'invoices' | 'payments' | 'info' | 'notes' | 'analytics'
  | 'sales' | 'statement' | 'aging' | 'reminders' | 'communications' | 'attachments';

interface CustomerIconStripProps {
  activeSection: MobileSectionId;
  onSectionChange: (section: MobileSectionId) => void;
  /** Optional badge counts per section (e.g. overdue invoices, upcoming reminders) */
  badges?: Partial<Record<MobileSectionId, number>>;
}

/**
 * Reordered by usage frequency: invoices/payments/statement first, then sales,
 * then analytics-heavy sections, then admin (notes/info/attachments).
 * All colors use semantic tokens (no raw tailwind palette references).
 */
const stripIcons = [
  { id: 'invoices' as const,       label: 'فواتير',     icon: FileText,        tone: 'primary'     },
  { id: 'payments' as const,       label: 'مدفوعات',    icon: CreditCard,      tone: 'success'     },
  { id: 'statement' as const,      label: 'كشف حساب',   icon: Printer,         tone: 'primary'     },
  { id: 'reminders' as const,      label: 'تذكيرات',    icon: Bell,            tone: 'warning'     },
  { id: 'sales' as const,          label: 'مبيعات',     icon: ShoppingCart,    tone: 'primary'     },
  { id: 'analytics' as const,      label: 'تحليلات',    icon: BarChart3,       tone: 'primary'     },
  { id: 'aging' as const,          label: 'أعمار ديون', icon: Clock,           tone: 'destructive' },
  { id: 'communications' as const, label: 'تواصل',      icon: MessageSquare,   tone: 'success'     },
  { id: 'notes' as const,          label: 'ملاحظات',    icon: StickyNote,      tone: 'warning'     },
  { id: 'info' as const,           label: 'بيانات',     icon: Info,            tone: 'primary'     },
  { id: 'attachments' as const,    label: 'مرفقات',     icon: Paperclip,       tone: 'muted'       },
] as const;

type Tone = typeof stripIcons[number]['tone'];

const toneClass: Record<Tone, { fg: string; bg: string }> = {
  primary:     { fg: 'text-primary',     bg: 'bg-primary/10'     },
  success:     { fg: 'text-success',     bg: 'bg-success/10'     },
  warning:     { fg: 'text-warning',     bg: 'bg-warning/10'     },
  destructive: { fg: 'text-destructive', bg: 'bg-destructive/10' },
  muted:       { fg: 'text-foreground',  bg: 'bg-muted'          },
};

export const CustomerIconStrip = memo(function CustomerIconStrip({
  activeSection, onSectionChange, badges,
}: CustomerIconStripProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const updateEdges = useCallback(() => {
    const viewport = wrapperRef.current?.querySelector<HTMLDivElement>('[data-radix-scroll-area-viewport]');
    if (!viewport) return;
    const max = viewport.scrollWidth - viewport.clientWidth;
    const left = Math.abs(viewport.scrollLeft);
    setEdges({
      start: left < max - 4,
      end: left > 4,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    const viewport = wrapperRef.current?.querySelector<HTMLDivElement>('[data-radix-scroll-area-viewport]');
    if (!viewport) return;
    viewport.addEventListener('scroll', updateEdges, { passive: true });
    window.addEventListener('resize', updateEdges);
    return () => {
      viewport.removeEventListener('scroll', updateEdges);
      window.removeEventListener('resize', updateEdges);
    };
  }, [updateEdges]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = stripIcons.length - 1;
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      // RTL: ArrowRight = previous, ArrowLeft = next
      const dir = e.key === 'ArrowLeft' ? 1 : -1;
      nextIndex = (index + dir + stripIcons.length) % stripIcons.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = last;
    }

    if (nextIndex === null) return;
    e.preventDefault();
    const buttons = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[nextIndex]?.focus();
  };

  return (
    <div className="relative bg-card border rounded-xl shadow-sm py-2">
      {/* Edge fade hints for horizontal scroll */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 bottom-0 right-0 w-6 rounded-r-xl",
          "bg-gradient-to-l from-card to-transparent transition-opacity",
          edges.start ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 bottom-0 left-0 w-6 rounded-l-xl",
          "bg-gradient-to-r from-card to-transparent transition-opacity",
          edges.end ? "opacity-100" : "opacity-0",
        )}
      />

      <ScrollArea className="w-full" ref={scrollRef as React.RefObject<HTMLDivElement>}>
        <div
          className="flex items-center gap-1 px-2"
          role="tablist"
          aria-orientation="horizontal"
          aria-label="أقسام ملف العميل"
        >
          {stripIcons.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const badge = badges?.[item.id] ?? 0;
            const tone = toneClass[item.tone];

            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                aria-label={badge > 0 ? `${item.label} (${badge})` : item.label}
                tabIndex={isActive ? 0 : -1}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onClick={() => onSectionChange(activeSection === item.id ? 'none' : item.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 min-w-[56px] min-h-11 shrink-0",
                  "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive && tone.bg,
                )}
              >
                <div className={cn(
                  "relative flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                  isActive ? tone.bg : "bg-transparent",
                )}>
                  <Icon className={cn("h-[18px] w-[18px]", isActive ? tone.fg : "text-muted-foreground")} />
                  {badge > 0 && (
                    <span
                      className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none shadow"
                      aria-hidden
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-medium leading-none whitespace-nowrap",
                  isActive ? tone.fg : "text-muted-foreground",
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
});
