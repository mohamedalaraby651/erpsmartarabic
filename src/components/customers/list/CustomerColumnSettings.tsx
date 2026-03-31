import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings2 } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

export interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'الاسم', defaultVisible: true },
  { key: 'type', label: 'النوع', defaultVisible: true },
  { key: 'vip', label: 'VIP', defaultVisible: true },
  { key: 'phone', label: 'الهاتف', defaultVisible: true },
  { key: 'governorate', label: 'المحافظة', defaultVisible: true },
  { key: 'balance', label: 'الرصيد', defaultVisible: true },
  { key: 'status', label: 'الحالة', defaultVisible: true },
  { key: 'credit_limit', label: 'حد الائتمان', defaultVisible: false },
  { key: 'last_activity', label: 'آخر نشاط', defaultVisible: false },
  { key: 'purchases', label: 'المشتريات', defaultVisible: false },
  { key: 'payment_ratio', label: 'نسبة السداد', defaultVisible: false },
  { key: 'created_at', label: 'تاريخ الإضافة', defaultVisible: false },
];

const STORAGE_KEY = 'customer-visible-columns';

function loadColumns(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key);
  } catch {
    return ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key);
  }
}

interface CustomerColumnSettingsProps {
  onChange?: (columns: string[]) => void;
}

export function CustomerColumnSettings({ onChange }: CustomerColumnSettingsProps) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadColumns);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
    onChange?.(visibleColumns);
  }, [visibleColumns, onChange]);

  const toggleColumn = useCallback((key: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(key)) {
        if (prev.length <= 2) return prev;
        return prev.filter(k => k !== key);
      }
      return [...prev, key];
    });
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          الأعمدة
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3" align="end">
        <p className="text-xs font-medium text-muted-foreground mb-2">الأعمدة الظاهرة</p>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {ALL_COLUMNS.map(col => (
            <label
              key={col.key}
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded-md px-2 py-1.5 transition-colors"
            >
              <Checkbox
                checked={visibleColumns.includes(col.key)}
                onCheckedChange={() => toggleColumn(col.key)}
              />
              {col.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function useVisibleColumns() {
  const [columns, setColumns] = useState<string[]>(loadColumns);
  return { visibleColumns: columns, setVisibleColumns: setColumns };
}
