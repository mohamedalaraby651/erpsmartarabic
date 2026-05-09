import { memo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Merge, ScanSearch, Download, Loader2, MoreVertical, ChevronLeft } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CustomerSearchPreview } from "@/components/customers/filters/CustomerSearchPreview";

interface CustomerPageHeaderProps {
  isMobile: boolean;
  canEdit: boolean;
  exportAllLoading: boolean;
  onAdd: () => void;
  onDuplicates: () => void;
  onMerge: () => void;
  onImport: () => void;
  onExportAll: () => void;
  totalCount?: number;
  filteredCount?: number;
  // Mobile search-first
  searchQuery?: string;
  onSearchChange?: (v: string) => void;
  // Optional slot rendered next to the title (mobile) — e.g. alerts bell
  mobileTitleSlot?: ReactNode;
}

export const CustomerPageHeader = memo(function CustomerPageHeader({
  isMobile, canEdit, exportAllLoading,
  onAdd, onDuplicates, onMerge, onImport, onExportAll,
  totalCount = 0, filteredCount,
  searchQuery, onSearchChange, mobileTitleSlot,
}: CustomerPageHeaderProps) {
  const countLabel = filteredCount != null && filteredCount !== totalCount
    ? `${filteredCount} من ${totalCount}`
    : `${totalCount}`;

  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Search-first: prominent search bar */}
        {onSearchChange && (
          <CustomerSearchPreview
            value={searchQuery || ''}
            onChange={onSearchChange}
            className="w-full"
            mobileStyle
          />
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold">العملاء</h1>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full tabular-nums">
              {countLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {mobileTitleSlot}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center justify-center h-10 w-10 rounded-xl border border-border bg-card text-muted-foreground hover:bg-accent transition-colors"
                  aria-label="المزيد من الأدوات"
                >
                  <MoreVertical className="h-4.5 w-4.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onImport}>
                  <Upload className="h-4 w-4 ml-2" />استيراد
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportAll} disabled={exportAllLoading}>
                  <Download className="h-4 w-4 ml-2" />تصدير
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicates}>
                  <ScanSearch className="h-4 w-4 ml-2" />كشف المكررين
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onMerge}>
                  <Merge className="h-4 w-4 ml-2" />دمج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* "إضافة" button removed on mobile — global FAB (AppLayout) handles it. Advanced add stays in dropdown menu. */}
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="sr-only" aria-hidden="true" tabIndex={-1} />
                </DropdownMenuTrigger>
                <DropdownMenuContent />
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <span className="hover:text-foreground cursor-pointer transition-colors">الرئيسية</span>
          <ChevronLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">العملاء</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold">إدارة العملاء</h1>
          <span className="text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full tabular-nums">
            {countLabel}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4 ml-2" />أدوات
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onExportAll} disabled={exportAllLoading}>
              {exportAllLoading ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Download className="h-4 w-4 ml-2" />}
              تصدير متقدم
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onImport}>
              <Upload className="h-4 w-4 ml-2" />استيراد
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicates}>
              <ScanSearch className="h-4 w-4 ml-2" />كشف المكررين
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMerge}>
              <Merge className="h-4 w-4 ml-2" />دمج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {canEdit && (
          <Button onClick={onAdd} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 ml-2" />إضافة عميل
          </Button>
        )}
      </div>
    </div>
  );
});
