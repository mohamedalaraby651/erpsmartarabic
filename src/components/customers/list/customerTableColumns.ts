import type { ColumnFilterKind, FilterOption } from '@/components/ui/column-filter';
import { egyptGovernorates } from '@/lib/egyptLocations';
import { typeLabels, vipLabels } from '@/lib/customerConstants';

export interface CustomerTableColumn {
  key: string;
  label: string;
  kind: ColumnFilterKind;
  defaultVisible: boolean;
  sortKey?: string;
  filterable?: boolean;
  options?: FilterOption[];
  numeric?: boolean;
}

const optionsFromLabels = (labels: Record<string, string>): FilterOption[] =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export const CUSTOMER_TABLE_COLUMNS: CustomerTableColumn[] = [
  { key: 'name', label: 'الاسم', kind: 'text', defaultVisible: true, sortKey: 'name' },
  { key: 'type', label: 'النوع', kind: 'options', defaultVisible: true, options: optionsFromLabels(typeLabels) },
  { key: 'vip', label: 'VIP', kind: 'options', defaultVisible: true, options: optionsFromLabels(vipLabels) },
  { key: 'phone', label: 'الهاتف', kind: 'text', defaultVisible: true },
  {
    key: 'governorate',
    label: 'المحافظة',
    kind: 'options',
    defaultVisible: true,
    options: egyptGovernorates.map((value) => ({ value, label: value })),
  },
  { key: 'city', label: 'المدينة', kind: 'options', defaultVisible: false },
  { key: 'balance', label: 'الرصيد', kind: 'number', defaultVisible: true, sortKey: 'current_balance', numeric: true },
  { key: 'last_activity', label: 'آخر نشاط', kind: 'date', defaultVisible: true, sortKey: 'last_activity_at' },
  {
    key: 'status',
    label: 'الحالة',
    kind: 'options',
    defaultVisible: true,
    options: [
      { value: 'true', label: 'نشط' },
      { value: 'false', label: 'غير نشط' },
    ],
  },
  { key: 'email', label: 'البريد', kind: 'text', defaultVisible: false },
  { key: 'tax_number', label: 'الرقم الضريبي', kind: 'text', defaultVisible: false },
  { key: 'contact_person', label: 'مسؤول التواصل', kind: 'text', defaultVisible: false },
  { key: 'credit_limit', label: 'حد الائتمان', kind: 'number', defaultVisible: false, sortKey: 'credit_limit', numeric: true },
  { key: 'purchases', label: 'المشتريات', kind: 'number', defaultVisible: false, sortKey: 'total_purchases_cached', numeric: true },
  { key: 'created_at', label: 'تاريخ الإضافة', kind: 'date', defaultVisible: false, sortKey: 'created_at' },
];

export const CUSTOMER_COLUMN_KEYS = CUSTOMER_TABLE_COLUMNS.map((column) => column.key);
export const CUSTOMER_COLUMN_LABELS = CUSTOMER_TABLE_COLUMNS.map(({ key, label }) => ({ key, label }));
export const CUSTOMER_DEFAULT_COLUMNS = CUSTOMER_TABLE_COLUMNS
  .filter((column) => column.defaultVisible)
  .map((column) => column.key);

export const CUSTOMER_FILTER_META = Object.fromEntries(
  CUSTOMER_TABLE_COLUMNS.map((column) => [column.key, { label: column.label, options: column.options }]),
);