/**
 * Column filter system (OPA-UI-002).
 *
 * A single header cell that carries: the column label, an optional sort
 * control, and an optional filter control whose editor matches the column's
 * data type.
 *
 * Supported filter kinds:
 *   - `options` — searchable multi-select (several values at once, OR within
 *     the column, AND across columns)
 *   - `text`    — operator (contains / equals / starts / ends) + term
 *   - `date`    — quick presets + explicit from/to range
 *   - `number`  — operator (between / greater / less / equals) + bounds
 *
 * Presentation stays neutral (muted header, tokenised colours only) so long
 * reading sessions remain comfortable; an active filter is signalled by the
 * primary-tinted funnel and a value counter.
 */
import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Filter, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { TableHead } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type ColumnFilterKind = 'options' | 'text' | 'date' | 'number';
export type TextOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith';
export type NumberOperator = 'between' | 'gt' | 'lt' | 'eq';

export interface ColumnFilter {
  kind: ColumnFilterKind;
  /** `options` kind — one or more selected values (OR within the column). */
  values?: string[];
  operator?: TextOperator | NumberOperator;
  /** `text` kind — the search term. */
  text?: string;
  /** `date` / `number` kinds — inclusive bounds. */
  from?: string;
  to?: string;
  /** `date` kind — the preset that produced from/to, for display only. */
  preset?: string;
}

export type ColumnFilters = Record<string, ColumnFilter>;

export interface FilterOption {
  value: string;
  label: string;
}

export interface SortConfig {
  key: string | null;
  direction: 'asc' | 'desc';
}

const TEXT_OPERATORS: { value: TextOperator; label: string }[] = [
  { value: 'contains', label: 'يحتوي على' },
  { value: 'equals', label: 'يساوي' },
  { value: 'startsWith', label: 'يبدأ بـ' },
  { value: 'endsWith', label: 'ينتهي بـ' },
];

const NUMBER_OPERATORS: { value: NumberOperator; label: string }[] = [
  { value: 'between', label: 'بين' },
  { value: 'gt', label: 'أكبر من' },
  { value: 'lt', label: 'أصغر من' },
  { value: 'eq', label: 'يساوي' },
];

const DATE_PRESETS: { value: string; label: string }[] = [
  { value: 'today', label: 'اليوم' },
  { value: 'yesterday', label: 'أمس' },
  { value: 'last7', label: 'آخر ٧ أيام' },
  { value: 'last30', label: 'آخر ٣٠ يومًا' },
  { value: 'thisMonth', label: 'هذا الشهر' },
  { value: 'lastMonth', label: 'الشهر الماضي' },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function resolveDatePreset(preset: string): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'today':
      return { from: iso(start), to: iso(start) };
    case 'yesterday': {
      const y = new Date(start);
      y.setDate(y.getDate() - 1);
      return { from: iso(y), to: iso(y) };
    }
    case 'last7': {
      const f = new Date(start);
      f.setDate(f.getDate() - 6);
      return { from: iso(f), to: iso(start) };
    }
    case 'last30': {
      const f = new Date(start);
      f.setDate(f.getDate() - 29);
      return { from: iso(f), to: iso(start) };
    }
    case 'thisMonth':
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(start) };
    case 'lastMonth':
      return {
        from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: iso(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    default:
      return { from: '', to: '' };
  }
}

/** A filter only counts as active when it actually narrows the result set. */
export function isFilterActive(f: ColumnFilter | undefined): boolean {
  if (!f) return false;
  if (f.kind === 'options') return (f.values?.length ?? 0) > 0;
  // A text column may narrow either by a free term or by picked values
  // (OPA-UI-003: every filter is searchable and multi-selectable).
  if (f.kind === 'text') return !!f.text?.trim() || (f.values?.length ?? 0) > 0;
  return !!f.from || !!f.to;
}

/** Human-readable summary of a filter, used by the active-filter chips. */
export function describeFilter(
  f: ColumnFilter,
  options?: FilterOption[],
): string {
  if (f.kind === 'options') {
    const labels = (f.values ?? []).map(
      (v) => options?.find((o) => o.value === v)?.label ?? v,
    );
    return labels.length > 2
      ? `${labels.slice(0, 2).join('، ')} +${labels.length - 2}`
      : labels.join('، ');
  }
  if (f.kind === 'text') {
    const picked = f.values ?? [];
    if (picked.length > 0) {
      const labels = picked.map((v) => options?.find((o) => o.value === v)?.label ?? v);
      return labels.length > 2
        ? `${labels.slice(0, 2).join('، ')} +${labels.length - 2}`
        : labels.join('، ');
    }
    const op = TEXT_OPERATORS.find((o) => o.value === f.operator)?.label ?? 'يحتوي على';
    return `${op} «${f.text}»`;
  }
  if (f.kind === 'date') {
    const preset = DATE_PRESETS.find((p) => p.value === f.preset)?.label;
    if (preset) return preset;
    if (f.from && f.to) return `${f.from} ← ${f.to}`;
    return f.from ? `من ${f.from}` : `حتى ${f.to}`;
  }
  const op = NUMBER_OPERATORS.find((o) => o.value === f.operator)?.label ?? 'بين';
  if (f.operator === 'between' || !f.operator) return `${op} ${f.from || '—'} و ${f.to || '—'}`;
  return `${op} ${f.from || f.to}`;
}

export interface ColumnFilterHeaderProps {
  label: string;
  className?: string;
  /** Sorting */
  sortKey?: string;
  sortConfig?: SortConfig;
  onSort?: (key: string) => void;
  /** Filtering */
  filterKey?: string;
  filterKind?: ColumnFilterKind;
  options?: FilterOption[];
  /** Loading indicator for options fetched from the server. */
  optionsLoading?: boolean;
  value?: ColumnFilter;
  onChange?: (key: string, filter: ColumnFilter | undefined) => void;
  /** Column sizing (OPA-UI-003 / COL-001) */
  width?: number;
  onResize?: (key: string, width: number) => void;
  onAutoFit?: (key: string) => void;
}

export const MIN_COLUMN_WIDTH = 72;
export const MAX_COLUMN_WIDTH = 640;

/**
 * Widest natural content in a column (header + body cells), clamped to the
 * min/max bounds. Pure DOM measurement — no query, no refetch (COL-001).
 */
export function measureColumnWidth(cell: HTMLTableCellElement): number {
  const row = cell.parentElement as HTMLTableRowElement | null;
  const table = cell.closest('table');
  if (!row || !table) return MIN_COLUMN_WIDTH;
  const index = Array.from(row.children).indexOf(cell);
  if (index < 0) return MIN_COLUMN_WIDTH;
  let widest = (cell.firstElementChild as HTMLElement | null)?.scrollWidth ?? cell.scrollWidth;
  table.querySelectorAll('tbody > tr').forEach((r) => {
    const c = r.children[index] as HTMLElement | undefined;
    if (c) widest = Math.max(widest, c.scrollWidth);
  });
  // Cell padding on both sides plus a little breathing room.
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.ceil(widest) + 34));
}

export function ColumnFilterHeader({
  label,
  className,
  sortKey,
  sortConfig,
  onSort,
  filterKey,
  filterKind,
  options,
  optionsLoading,
  value,
  onChange,
  width,
  onResize,
  onAutoFit,
}: ColumnFilterHeaderProps) {
  const cellRef = React.useRef<HTMLTableCellElement>(null);
  const resizeKey = filterKey ?? sortKey ?? label;

  /** Pointer-driven column resize; RTL-aware (the handle sits on the left edge). */
  const startResize = (e: React.PointerEvent) => {
    if (!onResize) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = width ?? cellRef.current?.offsetWidth ?? MIN_COLUMN_WIDTH;
    const rtl = typeof document !== 'undefined' && document.dir === 'rtl';
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const next = Math.min(
        MAX_COLUMN_WIDTH,
        Math.max(MIN_COLUMN_WIDTH, startWidth + (rtl ? -dx : dx)),
      );
      onResize(resizeKey, next);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<ColumnFilter>(
    value ?? { kind: filterKind ?? 'text' },
  );
  const [optionSearch, setOptionSearch] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setDraft(value ?? { kind: filterKind ?? 'text' });
      setOptionSearch('');
    }
  }, [open, value, filterKind]);

  const active = isFilterActive(value);
  const pickedCount = value?.values?.length ?? 0;
  const activeCount = pickedCount > 0 ? pickedCount : active ? 1 : 0;
  const sorted = sortKey && sortConfig?.key === sortKey;
  const SortIcon = sorted ? (sortConfig?.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  const commit = (next: ColumnFilter | undefined) => {
    if (filterKey && onChange) onChange(filterKey, next && isFilterActive(next) ? next : undefined);
    setOpen(false);
  };

  const filteredOptions = (options ?? []).filter((o) =>
    o.label.toLowerCase().includes(optionSearch.trim().toLowerCase()),
  );
  const draftValues = draft.values ?? [];
  const kind: ColumnFilterKind = filterKind ?? 'text';
  const toggleValue = (v: string) =>
    setDraft((d) => {
      const cur = d.values ?? [];
      return { ...d, kind, values: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });
  /** A text column may also expose a pick list of existing values. */
  const hasValueList = (options?.length ?? 0) > 0 || !!optionsLoading;

  return (
    <TableHead
      ref={cellRef}
      className={cn('relative whitespace-nowrap', className)}
      style={width ? { width, minWidth: width, maxWidth: width } : undefined}
    >
      <div className="flex items-center gap-1 overflow-hidden">
        {sortKey && onSort ? (
          <button
            type="button"
            onClick={() => onSort(sortKey)}
            className={cn(
              'inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              sorted && 'text-primary',
            )}
            aria-label={`ترتيب حسب ${label}`}
          >
            {label}
            <SortIcon className="h-3.5 w-3.5 opacity-70" />
          </button>
        ) : (
          <span className="px-1 font-semibold text-foreground">{label}</span>
        )}

        {filterKey && filterKind && onChange && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              {/* The counter lives INSIDE the trigger so it stays attached to
                  the funnel icon (OPA-UI-003 / DSP-004). */}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 shrink-0 gap-1 px-1.5',
                  active && 'bg-primary/10 text-primary hover:bg-primary/15',
                )}
                aria-label={`تصفية ${label}`}
              >
                <Filter className={cn('h-3.5 w-3.5', active && 'fill-current')} />
                {activeCount > 1 && (
                  <span className="rounded-sm bg-primary/15 px-1 text-[10px] font-semibold tabular-nums text-primary">
                    {activeCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-0">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-semibold">تصفية: {label}</span>
                {active && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => commit(undefined)}>
                    مسح
                  </Button>
                )}
              </div>
              <Separator />

              <div className="space-y-3 p-3">
                {filterKind === 'options' && (
                  <>
                    <div className="relative">
                      <Search className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={optionSearch}
                        onChange={(e) => setOptionSearch(e.target.value)}
                        placeholder="ابحث في الخيارات..."
                        className="h-8 pe-8 text-sm"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{draftValues.length} محدد</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() =>
                            setDraft((d) => ({ ...d, kind: 'options', values: filteredOptions.map((o) => o.value) }))
                          }
                        >
                          تحديد الكل
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setDraft((d) => ({ ...d, kind: 'options', values: [] }))}
                        >
                          إلغاء التحديد
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="max-h-56">
                      <div className="space-y-0.5 pe-1">
                        {filteredOptions.length === 0 && (
                          <p className="py-4 text-center text-xs text-muted-foreground">لا توجد خيارات مطابقة</p>
                        )}
                        {filteredOptions.map((o) => {
                          const checked = draftValues.includes(o.value);
                          return (
                            <button
                              key={o.value}
                              type="button"
                              onClick={() => toggleValue(o.value)}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm transition-colors hover:bg-muted',
                                checked && 'bg-primary/5',
                              )}
                            >
                              <Checkbox checked={checked} className="pointer-events-none" />
                              <span className="flex-1 truncate">{o.label}</span>
                              {checked && <Check className="h-3.5 w-3.5 text-primary" />}
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </>
                )}

                {filterKind === 'text' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">الشرط</Label>
                      <Select
                        value={(draft.operator as string) ?? 'contains'}
                        onValueChange={(v) => setDraft((d) => ({ ...d, kind: 'text', operator: v as TextOperator }))}
                      >
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TEXT_OPERATORS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">القيمة</Label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          autoFocus
                          value={draft.text ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, kind: 'text', text: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') commit({ ...draft, kind: 'text' }); }}
                          placeholder="اكتب للبحث..."
                          className="h-8 pe-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Existing values of this column — search then pick several
                        at once (OPA-UI-003 / FLT-001). */}
                    {hasValueList && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">اختيار من القيم الموجودة</Label>
                          <span className="text-[11px] text-muted-foreground">{draftValues.length} محدد</span>
                        </div>
                        {optionsLoading ? (
                          <p className="py-3 text-center text-xs text-muted-foreground">جارٍ تحميل القيم...</p>
                        ) : (
                          <ScrollArea className="max-h-44 rounded-md border border-border">
                            <div className="space-y-0.5 p-1">
                              {(options ?? [])
                                .filter((o) =>
                                  o.label.toLowerCase().includes((draft.text ?? '').trim().toLowerCase()),
                                )
                                .slice(0, 200)
                                .map((o) => {
                                  const checked = draftValues.includes(o.value);
                                  return (
                                    <button
                                      key={o.value}
                                      type="button"
                                      onClick={() => toggleValue(o.value)}
                                      className={cn(
                                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm transition-colors hover:bg-muted',
                                        checked && 'bg-primary/5',
                                      )}
                                    >
                                      <Checkbox checked={checked} className="pointer-events-none" />
                                      <span className="flex-1 truncate">{o.label}</span>
                                      {checked && <Check className="h-3.5 w-3.5 text-primary" />}
                                    </button>
                                  );
                                })}
                              {(options ?? []).length === 0 && (
                                <p className="py-3 text-center text-xs text-muted-foreground">لا توجد قيم</p>
                              )}
                            </div>
                          </ScrollArea>
                        )}
                        {draftValues.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setDraft((d) => ({ ...d, kind: 'text', values: [] }))}
                          >
                            إلغاء التحديد
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}

                {filterKind === 'date' && (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {DATE_PRESETS.map((p) => (
                        <Button
                          key={p.value}
                          type="button"
                          variant={draft.preset === p.value ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            setDraft({ kind: 'date', preset: p.value, ...resolveDatePreset(p.value) })
                          }
                        >
                          {p.label}
                        </Button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">من</Label>
                        <Input
                          type="date"
                          value={draft.from ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, kind: 'date', preset: undefined, from: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">إلى</Label>
                        <Input
                          type="date"
                          value={draft.to ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, kind: 'date', preset: undefined, to: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                {filterKind === 'number' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">الشرط</Label>
                      <Select
                        value={(draft.operator as string) ?? 'between'}
                        onValueChange={(v) => setDraft((d) => ({ ...d, kind: 'number', operator: v as NumberOperator }))}
                      >
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {NUMBER_OPERATORS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          {(draft.operator ?? 'between') === 'between' ? 'من' : 'القيمة'}
                        </Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={draft.from ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, kind: 'number', from: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      {(draft.operator ?? 'between') === 'between' && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">إلى</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            value={draft.to ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, kind: 'number', to: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <Separator />
              <div className="flex justify-end gap-2 p-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button size="sm" onClick={() => commit({ ...draft, kind: filterKind })}>تطبيق</Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {onResize && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`تغيير عرض عمود ${label}`}
          onPointerDown={startResize}
          onDoubleClick={() => {
            // Auto-fit measures the real content of this column (COL-001).
            if (cellRef.current && onResize) onResize(resizeKey, measureColumnWidth(cellRef.current));
            else onAutoFit?.(resizeKey);
          }}
          className="absolute inset-y-1 left-0 w-1.5 cursor-col-resize rounded-full bg-transparent transition-colors hover:bg-primary/40"
        />
      )}
    </TableHead>
  );
}

export { X as FilterChipCloseIcon };
