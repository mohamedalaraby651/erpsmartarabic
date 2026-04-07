import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download, MoreVertical, ChevronLeft, Search } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface SupplierPageHeaderProps {
  isMobile: boolean;
  canEdit: boolean;
  onAdd: () => void;
  onImport: () => void;
  totalCount?: number;
  searchQuery?: string;
  onSearchChange?: (v: string) => void;
}

export const SupplierPageHeader = memo(function SupplierPageHeader({
  isMobile, canEdit, onAdd, onImport, totalCount = 0,
  searchQuery, onSearchChange,
}: SupplierPageHeaderProps) {
  const countLabel = `${totalCount}`;

  if (isMobile) {
    return (
      <div className="space-y-3">
        {onSearchChange && (
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الهاتف..."
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pr-10"
            />
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold">الموردين</h1>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full tabular-nums">{countLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center h-10 w-10 rounded-xl border border-border bg-card text-muted-foreground hover:bg-accent transition-colors">
                  <MoreVertical className="h-4.5 w-4.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onImport}><Upload className="h-4 w-4 ml-2" />استيراد</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canEdit && (
              <Button onClick={onAdd} size="sm" className="h-10 px-4 rounded-xl shadow-sm shadow-primary/20">
                <Plus className="h-4 w-4 ml-1.5" />إضافة
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <span className="hover:text-foreground cursor-pointer transition-colors">الرئيسية</span>
          <ChevronLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">الموردين</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold">إدارة الموردين</h1>
          <span className="text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full tabular-nums">{countLabel}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"><MoreVertical className="h-4 w-4 ml-2" />أدوات</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onImport}><Upload className="h-4 w-4 ml-2" />استيراد</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {canEdit && (
          <Button onClick={onAdd} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 ml-2" />إضافة مورد
          </Button>
        )}
      </div>
    </div>
  );
});
