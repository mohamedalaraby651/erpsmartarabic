import { memo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Merge, ScanSearch, Download, Loader2, MoreVertical, ChevronLeft } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TapTooltip } from "@/components/ui/tap-tooltip";
import { CustomerSearchPreview } from "@/components/customers/filters/CustomerSearchPreview";
import { tooltips } from "@/lib/uiCopy";

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
  /** Optional "تخصيص العرض" entry rendered as a menu item (rendered as ReactNode). */
  layoutCustomizerSlot?: ReactNode;
}

export const CustomerPageHeader = memo(function CustomerPageHeader({
  isMobile, canEdit, exportAllLoading,
  onAdd, onDuplicates, onMerge, onImport, onExportAll,
  totalCount = 0, filteredCount,
  searchQuery, onSearchChange, mobileTitleSlot, layoutCustomizerSlot,
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
              <TapTooltip content={tooltips.moreToolsDetailed} side="bottom" autoCloseMs={1600}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center justify-center h-10 w-10 rounded-xl border border-border bg-card text-muted-foreground hover:bg-accent transition-colors"
                    aria-label={tooltips.moreTools}
                  >
                    <MoreVertical className="h-4.5 w-4.5" />
                  </button>
                </DropdownMenuTrigger>
              </TapTooltip>
              <DropdownMenuContent align="end" className="w-64">
                {canEdit && (
                  <DropdownMenuItem onClick={onAdd} className="flex-col items-start gap-0.5 py-2">
                    <span className="flex items-center font-medium"><Plus className="h-4 w-4 ml-2" />إضافة عميل</span>
                    <span className="text-[11px] text-muted-foreground pr-6">إضافة سريعة لعميل جديد</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onImport} className="flex-col items-start gap-0.5 py-2">
                  <span className="flex items-center font-medium"><Upload className="h-4 w-4 ml-2" />استيراد</span>
                  <span className="text-[11px] text-muted-foreground pr-6">رفع ملف Excel أو CSV لعملاء متعددين</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportAll} disabled={exportAllLoading} className="flex-col items-start gap-0.5 py-2">
                  <span className="flex items-center font-medium"><Download className="h-4 w-4 ml-2" />تصدير</span>
                  <span className="text-[11px] text-muted-foreground pr-6">تنزيل قائمة العملاء كملف Excel</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicates} className="flex-col items-start gap-0.5 py-2">
                  <span className="flex items-center font-medium"><ScanSearch className="h-4 w-4 ml-2" />كشف المكررين</span>
                  <span className="text-[11px] text-muted-foreground pr-6">البحث عن بيانات مكررة بين العملاء</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onMerge} className="flex-col items-start gap-0.5 py-2">
                  <span className="flex items-center font-medium"><Merge className="h-4 w-4 ml-2" />دمج</span>
                  <span className="text-[11px] text-muted-foreground pr-6">دمج عميلين في سجل واحد</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {layoutCustomizerSlot}
            {/* "إضافة" button removed on mobile — global FAB (AppLayout) handles new-customer entry. */}
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
          <TapTooltip content="استيراد، تصدير، كشف مكررين، ودمج" side="bottom" autoCloseMs={1600}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4 ml-2" />أدوات
              </Button>
            </DropdownMenuTrigger>
          </TapTooltip>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={onExportAll} disabled={exportAllLoading} className="flex-col items-start gap-0.5 py-2">
              <span className="flex items-center font-medium">
                {exportAllLoading ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Download className="h-4 w-4 ml-2" />}
                تصدير متقدم
              </span>
              <span className="text-[11px] text-muted-foreground pr-6">تخصيص الأعمدة والفلاتر قبل التصدير</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onImport} className="flex-col items-start gap-0.5 py-2">
              <span className="flex items-center font-medium"><Upload className="h-4 w-4 ml-2" />استيراد</span>
              <span className="text-[11px] text-muted-foreground pr-6">رفع ملف Excel أو CSV لعملاء متعددين</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicates} className="flex-col items-start gap-0.5 py-2">
              <span className="flex items-center font-medium"><ScanSearch className="h-4 w-4 ml-2" />كشف المكررين</span>
              <span className="text-[11px] text-muted-foreground pr-6">البحث عن سجلات متشابهة بين العملاء</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMerge} className="flex-col items-start gap-0.5 py-2">
              <span className="flex items-center font-medium"><Merge className="h-4 w-4 ml-2" />دمج</span>
              <span className="text-[11px] text-muted-foreground pr-6">دمج عميلين في سجل واحد مع نقل البيانات</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {layoutCustomizerSlot}
        {canEdit && (
          <TapTooltip content="إضافة سريعة لعميل جديد" side="bottom" autoCloseMs={1500}>
            <Button onClick={onAdd} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 ml-2" />إضافة عميل
            </Button>
          </TapTooltip>
        )}
      </div>
    </div>
  );
});
