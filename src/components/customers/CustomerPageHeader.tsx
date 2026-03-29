import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Merge, ScanSearch, Download, Loader2 } from "lucide-react";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
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
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex-1">
        <h1 className="text-xl md:text-2xl font-bold">إدارة العملاء</h1>
        <p className="text-sm text-muted-foreground">إدارة بيانات العملاء والتصنيفات</p>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {!isMobile && (
          <>
            <Button variant="outline" size="sm" onClick={onDuplicates}>
              <ScanSearch className="h-4 w-4 ml-2" />كشف المكررين
            </Button>
            <Button variant="outline" size="sm" onClick={onMerge}>
              <Merge className="h-4 w-4 ml-2" />دمج
            </Button>
            <Button variant="outline" size="sm" onClick={onImport}>
              <Upload className="h-4 w-4 ml-2" />استيراد
            </Button>
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
              تصدير الكل (Excel)
            </Button>
          </>
        )}
        {canEdit && (
          <Button onClick={onAdd} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 ml-2" />إضافة عميل
          </Button>
        )}
      </div>
    </div>
  );
});
