import { memo, useState } from "react";
import { Wallet, FileText, CreditCard, MoreHorizontal, MapPin, BarChart3, StickyNote, Paperclip, Bell, Printer, Clock, MessageSquare } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CustomerBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const mainTabs = [
  { value: 'financial', label: 'الملخص', icon: Wallet },
  { value: 'financials', label: 'الفواتير', icon: FileText },
  { value: 'payments-tab', label: 'المدفوعات', icon: CreditCard },
  { value: 'more-menu', label: 'المزيد', icon: MoreHorizontal },
] as const;

const moreGroups = [
  {
    title: 'البيانات',
    tabs: [
      { value: 'more', label: 'البيانات الأساسية', icon: MapPin },
      { value: 'sales', label: 'المبيعات', icon: FileText },
    ],
  },
  {
    title: 'التحليلات',
    tabs: [
      { value: 'analysis', label: 'الرسوم البيانية', icon: BarChart3 },
    ],
  },
  {
    title: 'الإداري',
    tabs: [
      { value: 'notes', label: 'الملاحظات', icon: StickyNote },
      { value: 'reminders', label: 'التذكيرات', icon: Bell },
      { value: 'communications', label: 'التواصل', icon: MessageSquare },
    ],
  },
  {
    title: 'التقارير',
    tabs: [
      { value: 'statement', label: 'كشف الحساب', icon: Printer },
      { value: 'aging', label: 'أعمار الديون', icon: Clock },
    ],
  },
];

export const CustomerBottomNav = memo(function CustomerBottomNav({
  activeTab, onTabChange,
}: CustomerBottomNavProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // Check if active tab is in "more" section
  const isMoreActive = moreGroups.some(g => g.tabs.some(t => t.value === activeTab));

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-background border-t safe-area-pb">
        <div className="flex items-center justify-around h-14">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isMore = tab.value === 'more-menu';
            const isActive = isMore ? isMoreActive : activeTab === tab.value;

            return (
              <button
                key={tab.value}
                onClick={() => {
                  if (isMore) {
                    setSheetOpen(true);
                  } else {
                    onTabChange(tab.value);
                  }
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-colors min-w-[64px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {isActive && (
                  <div className="absolute top-0 inset-x-4 h-0.5 bg-primary rounded-b-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle>التبويبات</SheetTitle>
          </SheetHeader>
          <div className="mt-4 pb-4 space-y-4 overflow-y-auto">
            {moreGroups.map((group) => (
              <div key={group.title}>
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">{group.title}</p>
                <div className="grid grid-cols-3 gap-2">
                  {group.tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.value;
                    return (
                      <Button
                        key={tab.value}
                        variant={isActive ? "default" : "outline"}
                        className="h-16 flex-col gap-1.5"
                        onClick={() => {
                          onTabChange(tab.value);
                          setSheetOpen(false);
                        }}
                      >
                        <Icon className="h-5 w-5" />
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
