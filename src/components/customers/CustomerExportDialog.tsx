import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { toast } from "sonner";

interface CustomerExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions) => Promise<void>;
  totalCount: number;
  filteredCount: number;
}

export interface ExportOptions {
  format: 'excel' | 'csv' | 'pdf';
  scope: 'all' | 'filtered';
  columns: string[];
}

const ALL_COLUMNS = [
  { key: 'name', label: 'الاسم', default: true },
  { key: 'customer_type', label: 'النوع', default: true },
  { key: 'vip_level', label: 'مستوى VIP', default: true },
  { key: 'phone', label: 'الهاتف', default: true },
  { key: 'phone2', label: 'هاتف 2', default: false },
  { key: 'email', label: 'البريد', default: false },
  { key: 'governorate', label: 'المحافظة', default: true },
  { key: 'city', label: 'المدينة', default: false },
  { key: 'current_balance', label: 'الرصيد', default: true },
  { key: 'credit_limit', label: 'حد الائتمان', default: false },
  { key: 'is_active', label: 'الحالة', default: true },
  { key: 'total_purchases_cached', label: 'إجمالي المشتريات', default: false },
  { key: 'last_activity_at', label: 'آخر نشاط', default: false },
  { key: 'created_at', label: 'تاريخ الإضافة', default: false },
  { key: 'tax_number', label: 'الرقم الضريبي', default: false },
  { key: 'notes', label: 'ملاحظات', default: false },
];

const FORMAT_OPTIONS = [
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet, desc: 'ملف XLSX' },
  { value: 'csv', label: 'CSV', icon: FileDown, desc: 'ملف نصي' },
  { value: 'pdf', label: 'PDF', icon: FileText, desc: 'للطباعة' },
] as const;

export function CustomerExportDialog({ open, onOpenChange, onExport, totalCount, filteredCount }: CustomerExportDialogProps) {
  const [format, setFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const [scope, setScope] = useState<'all' | 'filtered'>('all');
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.key))
  );
  const [loading, setLoading] = useState(false);

  const toggleColumn = useCallback((key: string) => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev; // Keep at least one
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedColumns(new Set(ALL_COLUMNS.map(c => c.key)));
  }, []);

  const handleExport = async () => {
    setLoading(true);
    try {
      await onExport({ format, scope, columns: Array.from(selectedColumns) });
      onOpenChange(false);
    } catch {
      toast.error("حدث خطأ أثناء التصدير");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            تصدير العملاء
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Format */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">صيغة الملف</Label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-all ${
                    format === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:bg-accent text-muted-foreground'
                  }`}
                >
                  <opt.icon className="h-5 w-5" />
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-[10px]">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">نطاق البيانات</Label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as 'all' | 'filtered')}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="scope-all" />
                  <Label htmlFor="scope-all" className="text-sm cursor-pointer">
                    الكل ({totalCount})
                  </Label>
                </div>
                {filteredCount !== totalCount && (
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="filtered" id="scope-filtered" />
                    <Label htmlFor="scope-filtered" className="text-sm cursor-pointer">
                      المصفى ({filteredCount})
                    </Label>
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>

          {/* Columns */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">الأعمدة ({selectedColumns.size})</Label>
              <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={selectAll}>
                تحديد الكل
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {ALL_COLUMNS.map(col => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded-md p-1.5 transition-colors"
                >
                  <Checkbox
                    checked={selectedColumns.has(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Download className="h-4 w-4 ml-2" />}
            تصدير
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
