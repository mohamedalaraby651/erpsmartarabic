import { memo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MobileSectionId } from "./CustomerIconStrip";

export interface SheetSectionItem {
  id: MobileSectionId;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface CustomerSectionsSheetProps {
  items: SheetSectionItem[];
  activeSection: MobileSectionId;
  onPick: (id: MobileSectionId) => void;
  /** سواء أحد الأقسام داخل الـ Sheet نشط حالياً (لإبراز زر "المزيد") */
  isAnyActive?: boolean;
}

export const CustomerSectionsSheet = memo(function CustomerSectionsSheet({
  items, activeSection, onPick, isAnyActive,
}: CustomerSectionsSheetProps) {
  const totalBadge = items.reduce((sum, it) => sum + (it.badge ?? 0), 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="المزيد من الأقسام"
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 min-w-[56px] min-h-11 shrink-0",
            "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isAnyActive && "bg-primary/10",
          )}
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg">
            <MoreHorizontal className={cn("h-[18px] w-[18px]", isAnyActive ? "text-primary" : "text-muted-foreground")} />
            {totalBadge > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none shadow" aria-hidden>
                {totalBadge > 99 ? '99+' : totalBadge}
              </span>
            )}
          </div>
          <span className={cn("text-[10px] font-medium leading-none", isAnyActive ? "text-primary" : "text-muted-foreground")}>المزيد</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>المزيد من الأقسام</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-2 mt-4 pb-4">
          {items.map(({ id, label, icon: Icon, badge }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onPick(id)}
                aria-label={badge ? `${label} (${badge})` : label}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl border transition-all min-h-16",
                  "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-primary/10 border-primary/30 text-primary" : "bg-card hover:bg-muted text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{label}</span>
                {badge && badge > 0 ? (
                  <span className="absolute top-1 right-1 min-w-[18px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
});
