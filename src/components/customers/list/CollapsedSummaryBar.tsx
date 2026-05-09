import { memo } from "react";
import { ChevronDown, Filter as FilterIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  filteredCount: number;
  totalCount: number;
  hasActiveFilters?: boolean;
  sortLabel?: string;
  onExpand: () => void;
  className?: string;
}

/**
 * شريط رفيع يظهر عند تفعيل وضع التركيز (compact)، يلخّص الحالة ويسمح بإعادة الفتح بنقرة واحدة.
 */
export const CollapsedSummaryBar = memo(function CollapsedSummaryBar({
  filteredCount, totalCount, hasActiveFilters, sortLabel, onExpand, className,
}: Props) {
  const showCount = filteredCount !== totalCount
    ? `${filteredCount} من ${totalCount}`
    : `${totalCount} عميل`;

  return (
    <button
      type="button"
      onClick={onExpand}
      className={cn(
        "w-full flex items-center justify-between gap-2 h-9 px-3 rounded-lg",
        "bg-muted/40 border border-border/60 text-xs text-muted-foreground",
        "hover:bg-muted/70 active:scale-[0.99] transition-all",
        className,
      )}
      aria-label="إظهار شريط الأدوات"
    >
      <div className="flex items-center gap-2 min-w-0">
        {hasActiveFilters && <FilterIcon className="h-3.5 w-3.5 text-primary shrink-0" />}
        <span className="tabular-nums font-medium text-foreground">{showCount}</span>
        {sortLabel && (
          <>
            <span className="opacity-50">•</span>
            <span className="truncate">{sortLabel}</span>
          </>
        )}
      </div>
      <span className="flex items-center gap-1 shrink-0">
        <span className="text-[11px]">إظهار الأدوات</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </span>
    </button>
  );
});
