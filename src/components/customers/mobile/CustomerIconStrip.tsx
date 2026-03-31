import { memo, useState } from "react";
import {
  FileText, CreditCard, Info, StickyNote, BarChart3, MoreHorizontal,
  MapPin, ShoppingCart, Bell, Printer, Clock, MessageSquare, Paperclip,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MobileSectionId =
  | 'none' | 'invoices' | 'payments' | 'info' | 'notes' | 'analytics'
  | 'sales' | 'statement' | 'aging' | 'reminders' | 'communications' | 'attachments';

interface CustomerIconStripProps {
  activeSection: MobileSectionId;
  onSectionChange: (section: MobileSectionId) => void;
}

const stripIcons = [
  { id: 'invoices' as const, label: 'فواتير', icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  { id: 'payments' as const, label: 'مدفوعات', icon: CreditCard, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  { id: 'info' as const, label: 'بيانات', icon: Info, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/40' },
  { id: 'notes' as const, label: 'ملاحظات', icon: StickyNote, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  { id: 'analytics' as const, label: 'تحليلات', icon: BarChart3, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/40' },
  { id: 'more' as const, label: 'المزيد', icon: MoreHorizontal, color: 'text-muted-foreground', bg: 'bg-muted' },
] as const;

const moreSheetGroups = [
  {
    title: 'المبيعات',
    tabs: [
      { id: 'sales' as MobileSectionId, label: 'العروض والطلبات', icon: ShoppingCart, color: 'text-orange-600 dark:text-orange-400' },
    ],
  },
  {
    title: 'التقارير',
    tabs: [
      { id: 'statement' as MobileSectionId, label: 'كشف الحساب', icon: Printer, color: 'text-sky-600 dark:text-sky-400' },
      { id: 'aging' as MobileSectionId, label: 'أعمار الديون', icon: Clock, color: 'text-red-600 dark:text-red-400' },
    ],
  },
  {
    title: 'الإداري',
    tabs: [
      { id: 'reminders' as MobileSectionId, label: 'التذكيرات', icon: Bell, color: 'text-yellow-600 dark:text-yellow-400' },
      { id: 'communications' as MobileSectionId, label: 'التواصل', icon: MessageSquare, color: 'text-teal-600 dark:text-teal-400' },
      { id: 'attachments' as MobileSectionId, label: 'المرفقات', icon: Paperclip, color: 'text-gray-600 dark:text-gray-400' },
    ],
  },
];

export const CustomerIconStrip = memo(function CustomerIconStrip({
  activeSection, onSectionChange,
}: CustomerIconStripProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const moreIds = moreSheetGroups.flatMap(g => g.tabs.map(t => t.id));
  const isMoreActive = moreIds.includes(activeSection);

  return (
    <>
      <div className="flex items-center justify-around py-2 px-1 bg-card border rounded-xl shadow-sm">
        {stripIcons.map((item) => {
          const Icon = item.icon;
          const isMore = item.id === 'more';
          const isActive = isMore ? isMoreActive : activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isMore) {
                  setSheetOpen(true);
                } else {
                  // Toggle: clicking active section closes it
                  onSectionChange(activeSection === item.id ? 'none' : item.id);
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 min-w-[52px] transition-all",
                isActive && !isMore && `${item.bg}`,
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                isActive && !isMore ? item.bg : "bg-transparent",
              )}>
                <Icon className={cn("h-4.5 w-4.5", isActive ? item.color : "text-muted-foreground")} />
              </div>
              <span className={cn(
                "text-[10px] font-medium leading-none",
                isActive ? item.color : "text-muted-foreground",
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle>المزيد من الأقسام</SheetTitle>
          </SheetHeader>
          <div className="mt-4 pb-4 space-y-4 overflow-y-auto">
            {moreSheetGroups.map((group) => (
              <div key={group.title}>
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">{group.title}</p>
                <div className="grid grid-cols-3 gap-2">
                  {group.tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeSection === tab.id;
                    return (
                      <Button
                        key={tab.id}
                        variant={isActive ? "default" : "outline"}
                        className="h-16 flex-col gap-1.5"
                        onClick={() => {
                          onSectionChange(tab.id);
                          setSheetOpen(false);
                        }}
                      >
                        <Icon className={cn("h-5 w-5", !isActive && tab.color)} />
                        <span className="text-[10px]">{tab.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
});
