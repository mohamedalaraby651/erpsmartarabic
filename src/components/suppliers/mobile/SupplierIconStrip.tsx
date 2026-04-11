import { memo } from "react";
import {
  Info, CreditCard, BarChart3, ShoppingCart, Package,
  Star, Activity, Paperclip, Printer, StickyNote,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type SupplierMobileSectionId =
  | 'none' | 'info' | 'financial' | 'orders' | 'payments'
  | 'analytics' | 'products' | 'rating' | 'activity' | 'attachments' | 'statement' | 'notes';

interface SupplierIconStripProps {
  activeSection: SupplierMobileSectionId;
  onSectionChange: (section: SupplierMobileSectionId) => void;
}

const stripIcons = [
  { id: 'info' as const, label: 'بيانات', icon: Info, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/40' },
  { id: 'financial' as const, label: 'مالي', icon: CreditCard, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  { id: 'orders' as const, label: 'طلبات', icon: ShoppingCart, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  { id: 'payments' as const, label: 'مدفوعات', icon: CreditCard, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/40' },
  { id: 'analytics' as const, label: 'تحليلات', icon: BarChart3, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/40' },
  { id: 'products' as const, label: 'منتجات', icon: Package, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  { id: 'rating' as const, label: 'تقييم', icon: Star, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/40' },
  { id: 'activity' as const, label: 'نشاطات', icon: Activity, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/40' },
  { id: 'attachments' as const, label: 'مرفقات', icon: Paperclip, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-900/40' },
  { id: 'statement' as const, label: 'كشف حساب', icon: Printer, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900/40' },
  { id: 'notes' as const, label: 'ملاحظات', icon: StickyNote, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-100 dark:bg-pink-900/40' },
] as const;

export const SupplierIconStrip = memo(function SupplierIconStrip({
  activeSection, onSectionChange,
}: SupplierIconStripProps) {
  return (
    <div className="bg-card border rounded-xl shadow-sm py-2">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-1 px-2">
          {stripIcons.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(activeSection === item.id ? 'none' : item.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 min-w-[52px] shrink-0 transition-all",
                  isActive && item.bg,
                )}
              >
                <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg transition-all", isActive ? item.bg : "bg-transparent")}>
                  <Icon className={cn("h-4.5 w-4.5", isActive ? item.color : "text-muted-foreground")} />
                </div>
                <span className={cn("text-[10px] font-medium leading-none whitespace-nowrap", isActive ? item.color : "text-muted-foreground")}>
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
