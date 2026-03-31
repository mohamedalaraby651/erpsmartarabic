import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Merge, ScanSearch, Download, Loader2, MoreVertical } from "lucide-react";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Customer } from "@/lib/customerConstants";

interface CustomerPageHeaderProps {
  isMobile: boolean;
  canEdit: boolean;
  customers: Customer[];
  exportAllLoading: boolean;
  onAdd: () => void;
  onDuplicates: () => void;
  onMerge: () => void;
  onImport: () => void;
  onExportAll: () => void;
}

export const CustomerPageHeader = memo(function CustomerPageHeader({
  isMobile, canEdit, customers, exportAllLoading,
  onAdd, onDuplicates, onMerge, onImport, onExportAll,
}: CustomerPageHeaderProps) {
  if (isMobile) {
    return (
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">العملاء</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center h-10 w-10 rounded-xl border border-border bg-card text-muted-foreground hover:bg-accent transition-colors">
                <MoreVertical className="h-4.5 w-4.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onImport}>
                <Upload className="h-4 w-4 ml-2" />استيراد
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportAll} disabled={exportAllLoading}>
                <Download className="h-4 w-4 ml-2" />تصدير الكل
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
            <Button onClick={onAdd} size="sm" className="h-10 px-4 rounded-xl shadow-sm shadow-primary/20">
              <Plus className="h-4 w-4 ml-1.5" />إضافة
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex-1">
        <h1 className="text-xl md:text-2xl font-bold">إدارة العملاء</h1>
        <p className="text-sm text-muted-foreground">إدارة بيانات العملاء والتصنيفات</p>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4 ml-2" />أدوات
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onDuplicates}>
              <ScanSearch className="h-4 w-4 ml-2" />كشف المكررين
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMerge}>
              <Merge className="h-4 w-4 ml-2" />دمج
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onImport}>
              <Upload className="h-4 w-4 ml-2" />استيراد
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ExportWithTemplateButton
          section="customers" sectionLabel="العملاء" data={customers}
          columns={[
            { key: 'name', label: 'الاسم' }, { key: 'phone', label: 'الهاتف' },
            { key: 'email', label: 'البريد الإلكتروني' }, { key: 'customer_type', label: 'النوع' },
            { key: 'vip_level', label: 'مستوى VIP' }, { key: 'current_balance', label: 'الرصيد' },
            { key: 'credit_limit', label: 'حد الائتمان' },
          ]}
        />
        <Button variant="outline" size="sm" disabled={exportAllLoading} onClick={onExportAll}>
          {exportAllLoading ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Download className="h-4 w-4 ml-2" />}
          تصدير الكل
        </Button>
        {canEdit && (
          <Button onClick={onAdd} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 ml-2" />إضافة عميل
          </Button>
        )}
      </div>
    </div>
  );
});
