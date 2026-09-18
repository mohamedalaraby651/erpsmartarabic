import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings2, ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

export interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
}

/**
 * Presentation-only column catalogue for the customers workspace (OPA-CUST-001).
 * Every key maps to a field that already exists on the customer read model.
 */
export const ALL_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'الاسم', defaultVisible: true },
  { key: 'type', label: 'النوع', defaultVisible: true },
  { key: 'vip', label: 'VIP', defaultVisible: true },
  { key: 'phone', label: 'الهاتف', defaultVisible: true },
  { key: 'governorate', label: 'المحافظة', defaultVisible: true },
  { key: 'balance', label: 'الرصيد', defaultVisible: true },
  { key: 'last_activity', label: 'آخر نشاط', defaultVisible: true },
  { key: 'status', label: 'الحالة', defaultVisible: true },
  { key: 'email', label: 'البريد', defaultVisible: false },
  { key: 'tax_number', label: 'الرقم الضريبي', defaultVisible: false },
  { key: 'contact_person', label: 'مسؤول التواصل', defaultVisible: false },
  { key: 'credit_limit', label: 'حد الائتمان', defaultVisible: false },
  { key: 'purchases', label: 'المشتريات', defaultVisible: false },
  { key: 'created_at', label: 'تاريخ الإضافة', defaultVisible: false },
];

const STORAGE_KEY = 'customer-visible-columns';
const VALID_KEYS = new Set(ALL_COLUMNS.map(c => c.key));

export const defaultColumns = () => ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key);

function loadColumns(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultColumns();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultColumns();
    const cleaned = parsed.filter((k): k is string => typeof k === 'string' && VALID_KEYS.has(k));
    return cleaned.length ? cleaned : defaultColumns();
  } catch {
    return defaultColumns();
  }
}

interface CustomerColumnSettingsProps {
  visibleColumns: string[];
  onChange: (columns: string[]) => void;
}

export function CustomerColumnSettings({ visibleColumns, onChange }: CustomerColumnSettingsProps) {
  const toggleColumn = useCallback((key: string) => {
    if (visibleColumns.includes(key)) {
      if (visibleColumns.length <= 2) return;
      onChange(visibleColumns.filter(k => k !== key));
      return;
    }
    onChange([...visibleColumns, key]);
  }, [onChange, visibleColumns]);

  const move = useCallback((key: string, delta: -1 | 1) => {
    const index = visibleColumns.indexOf(key);
    const target = index + delta;
    if (index === -1 || target < 0 || target >= visibleColumns.length) return;
    const next = [...visibleColumns];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }, [onChange, visibleColumns]);

  const reset = useCallback(() => onChange(defaultColumns()), [onChange]);

  const hidden = ALL_COLUMNS.filter(c => !visibleColumns.includes(c.key));
  const labelOf = (key: string) => ALL_COLUMNS.find(c => c.key === key)?.label ?? key;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" aria-label="التحكم في الأعمدة">
          <Settings2 className="h-3.5 w-3.5" />
          الأعمدة
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">الأعمدة الظاهرة (بالترتيب)</p>
          <Button variant="ghost" size="sm" className="text-[11px] gap-1" onClick={reset}>
            <RotateCcw className="h-3 w-3" />
            الافتراضي
          </Button>
        </div>

        <ul className="space-y-1 max-h-56 overflow-y-auto" aria-label="الأعمدة الظاهرة">
          {visibleColumns.map((key, i) => (
            <li key={key} className="flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-accent">
              <Checkbox
                checked
                onCheckedChange={() => toggleColumn(key)}
                aria-label={`إخفاء عمود ${labelOf(key)}`}
              />
              <span className="flex-1 text-sm truncate">{labelOf(key)}</span>
              <Button
                variant="ghost" size="icon" className="h-9 w-9"
                disabled={i === 0}
                onClick={() => move(key, -1)}
                aria-label={`تحريك ${labelOf(key)} لأعلى`}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-9 w-9"
                disabled={i === visibleColumns.length - 1}
                onClick={() => move(key, 1)}
                aria-label={`تحريك ${labelOf(key)} لأسفل`}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>

        {hidden.length > 0 && (
          <>
            <p className="text-xs font-medium text-muted-foreground mt-3 mb-1">أعمدة مخفية</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {hidden.map(col => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded-md px-2 py-1.5 transition-colors"
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => toggleColumn(col.key)}
                    aria-label={`إظهار عمود ${col.label}`}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function useVisibleColumns() {
  const [columns, setColumns] = useState<string[]>(loadColumns);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);
  return { visibleColumns: columns, setVisibleColumns: setColumns };
}
