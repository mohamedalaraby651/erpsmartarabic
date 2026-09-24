import { memo, type ReactNode } from 'react';
import { Crown, MessageCircle, FileText, CreditCard, Edit2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CustomerAvatar from '@/components/customers/shared/CustomerAvatar';
import { HighlightText } from '@/components/shared/HighlightText';
import { isRowActivationTarget } from '@/hooks/useListShortcuts';
import { cn } from '@/lib/utils';
import { vipLabels, typeLabels, getBalanceColor } from '@/lib/customerConstants';
import type { Customer } from '@/lib/customerConstants';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ColumnFilterHeader, type ColumnFilters, type FilterOption } from '@/components/ui/column-filter';
import { DENSITY_CLASS, type TableLayout } from '@/hooks/useTableLayout';
import { DataTableHeader } from '@/components/ui/data-table-header';
import { CUSTOMER_TABLE_COLUMNS } from './customerTableColumns';

/**
 * Customers workspace table (OPA-CUST-001).
 *
 * Presentation only: it renders the customer read model handed to it, emits
 * intents upwards and owns no query, financial or domain behaviour.
 */

const NUMERIC_COLUMNS = new Set(['balance', 'credit_limit', 'purchases']);

const vipPillStyle: Record<string, string> = {
  silver: 'bg-muted text-muted-foreground',
  gold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  platinum: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
};

export interface CustomerTableProps {
  customers: Customer[];
  layout: TableLayout;
  columnFilters: ColumnFilters;
  onColumnFilterChange: (key: string, filter: ColumnFilters[string] | undefined) => void;
  searchQuery?: string;
  sortKey: string;
  sortDirection: 'asc' | 'desc' | null;
  onSort: (dbColumn: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  isAllSelected: boolean;
  onToggleSelectAll: (checked: boolean) => void;
  onNavigate: (id: string) => void;
  onEdit?: (customer: Customer) => void;
  onNewInvoice?: (id: string) => void;
  onNewPayment?: (id: string) => void;
  onWhatsApp?: (phone: string) => void;
  onRowHover?: (id: string) => void;
  onRowLeave?: () => void;
  alertCountByCustomer?: Map<string, number>;
  errorCustomerIds?: Set<string>;
  headerTools?: ReactNode;
  filterOptions?: Partial<Record<string, FilterOption[]>>;
  filterOptionsLoading?: boolean;
}

function CustomerTableInner({
  customers, layout, columnFilters, onColumnFilterChange, searchQuery,
  sortKey, sortDirection, onSort,
  selectedIds, onToggleSelect, isAllSelected, onToggleSelectAll,
  onNavigate, onEdit, onNewInvoice, onNewPayment, onWhatsApp,
  onRowHover, onRowLeave, alertCountByCustomer, errorCustomerIds,
  headerTools, filterOptions = {}, filterOptionsLoading = false,
}: CustomerTableProps) {
  const columns = layout.visibleKeys
    .map((key) => CUSTOMER_TABLE_COLUMNS.find((column) => column.key === key))
    .filter((column): column is (typeof CUSTOMER_TABLE_COLUMNS)[number] => Boolean(column));

  const renderCell = (customer: Customer, key: string) => {
    const balance = Number(customer.current_balance || 0);
    const creditLimit = Number(customer.credit_limit || 0);
    const alertCount = alertCountByCustomer?.get(customer.id) ?? 0;

    switch (key) {
      case 'name':
        return (
          <div className="flex items-center gap-2 min-w-0">
            <CustomerAvatar
              name={customer.name}
              imageUrl={customer.image_url}
              customerType={customer.customer_type}
              size="sm"
              shape="circle"
              className="shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onNavigate(customer.id)}
                  className="max-w-full truncate bg-transparent p-0 text-start text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <HighlightText text={customer.name} query={searchQuery} />
                </button>
                {alertCount > 0 && (
                  <span
                    className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold px-1"
                    aria-label={`${alertCount} تنبيه`}
                  >
                    {alertCount}
                  </span>
                )}
              </div>
              {customer.city && (
                <span className="text-[11px] text-muted-foreground truncate block">{customer.city}</span>
              )}
            </div>
          </div>
        );
      case 'type':
        return <span className="text-xs">{typeLabels[customer.customer_type] || customer.customer_type}</span>;
      case 'vip':
        return customer.vip_level && customer.vip_level !== 'regular' ? (
          <span className={cn(
            'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
            vipPillStyle[customer.vip_level],
          )}>
            <Crown className="h-2.5 w-2.5" aria-hidden />
            {vipLabels[customer.vip_level]}
          </span>
        ) : <span className="text-muted-foreground">—</span>;
      case 'phone':
        return customer.phone
          ? <span dir="ltr" className="text-xs tabular-nums"><HighlightText text={customer.phone} query={searchQuery} /></span>
          : <span className="text-muted-foreground">—</span>;
      case 'email':
        return customer.email
          ? <span dir="ltr" className="text-xs truncate block max-w-[180px]"><HighlightText text={customer.email} query={searchQuery} /></span>
          : <span className="text-muted-foreground">—</span>;
      case 'tax_number':
        return customer.tax_number
          ? <span dir="ltr" className="text-xs tabular-nums"><HighlightText text={customer.tax_number} query={searchQuery} /></span>
          : <span className="text-muted-foreground">—</span>;
      case 'contact_person':
        return customer.contact_person
          ? <span className="text-xs truncate block max-w-[160px]">{customer.contact_person}</span>
          : <span className="text-muted-foreground">—</span>;
      case 'governorate':
        return customer.governorate
          ? <span className="text-xs">{customer.governorate}</span>
          : <span className="text-muted-foreground">—</span>;
      case 'city':
        return customer.city
          ? <span className="text-xs">{customer.city}</span>
          : <span className="text-muted-foreground">—</span>;
      case 'balance':
        return (
          <span className={cn('font-bold text-sm tabular-nums', getBalanceColor(balance, creditLimit))}>
            {balance.toLocaleString()}
          </span>
        );
      case 'credit_limit':
        return <span className="text-xs tabular-nums">{creditLimit > 0 ? creditLimit.toLocaleString() : '—'}</span>;
      case 'purchases':
        return <span className="text-xs tabular-nums">{Number(customer.total_purchases_cached || 0).toLocaleString()}</span>;
      case 'last_activity':
        return (
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {customer.last_activity_at
              ? format(new Date(customer.last_activity_at), 'd MMM yyyy', { locale: ar })
              : '—'}
          </span>
        );
      case 'created_at':
        return (
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {format(new Date(customer.created_at), 'd MMM yyyy', { locale: ar })}
          </span>
        );
      case 'status': {
        const isActive = customer.is_active !== false;
        return (
          <span className={cn(
            'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full',
            isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground',
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-emerald-500' : 'bg-muted-foreground/50')} aria-hidden />
            {isActive ? 'نشط' : 'غير نشط'}
          </span>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-md border border-border">
      {/* G1 fix: the stats strip is the table's header band but must not scroll
          horizontally with wide column sets — it stays pinned to the visible width. */}
      {headerTools && (
        <div className="border-b border-border bg-muted/30 px-3 py-2" role="group" aria-label="تصفية سريعة لقائمة العملاء">
          {headerTools}
        </div>
      )}
    <div
      className="w-full overflow-auto"
      style={layout.bodyHeight ? { maxHeight: layout.bodyHeight } : undefined}
    >
      <Table className={DENSITY_CLASS[layout.density]}>
        <caption className="sr-only">قائمة العملاء</caption>
        <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_hsl(var(--border))]">

          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={(checked) => onToggleSelectAll(!!checked)}
                aria-label="تحديد كل العملاء المعروضين"
              />
            </TableHead>
            {columns.map((column) => (
              <ColumnFilterHeader
                key={column.key}
                label={column.label}
                sortKey={column.sortKey}
                sortConfig={sortDirection ? { key: sortKey, direction: sortDirection } : undefined}
                onSort={column.sortKey ? onSort : undefined}
                filterKey={column.filterable === false ? undefined : column.key}
                filterKind={column.kind}
                options={filterOptions[column.key] ?? column.options}
                optionsLoading={filterOptionsLoading && (column.key === 'name' || column.key === 'city')}
                value={columnFilters[column.key]}
                onChange={onColumnFilterChange}
                width={layout.widths[column.key]}
                onResize={layout.setWidth}
                onAutoFit={layout.autoFitWidth}
                className={column.numeric ? 'text-end' : undefined}
              />
            ))}
            <DataTableHeader label="إجراءات" className="w-40 text-end" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map(customer => {
            const selected = selectedIds.has(customer.id);
            return (
              <TableRow
                key={customer.id}
                data-state={selected ? 'selected' : undefined}
                onClick={(e) => { if (isRowActivationTarget(e.target)) onNavigate(customer.id); }}
                onMouseEnter={() => onRowHover?.(customer.id)}
                onMouseLeave={() => onRowLeave?.()}
                className={cn(
                   'h-14 cursor-pointer group',
                  customer.is_active === false && 'opacity-70',
                  errorCustomerIds?.has(customer.id) && 'bg-destructive/5',
                )}
              >
                <TableCell className="py-2">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) => onToggleSelect(customer.id, !!checked)}
                    aria-label={`تحديد ${customer.name}`}
                  />
                </TableCell>
                {columns.map(column => (
                  <TableCell key={column.key} className={cn('py-2', NUMERIC_COLUMNS.has(column.key) && 'text-end')}>
                    {renderCell(customer, column.key)}
                  </TableCell>
                ))}
                <TableCell className="py-2">
                   <div className="flex items-center justify-end gap-0.5 opacity-80 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {onNewInvoice && (
                       <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`فاتورة جديدة لـ${customer.name}`}
                        onClick={() => onNewInvoice(customer.id)}>
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onNewPayment && (
                       <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`تسجيل دفعة لـ${customer.name}`}
                        onClick={() => onNewPayment(customer.id)}>
                        <CreditCard className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {customer.phone && onWhatsApp && (
                       <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`واتساب ${customer.name}`}
                        onClick={() => onWhatsApp(customer.phone!)}>
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </Button>
                    )}
                    {onEdit && (
                       <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`تعديل ${customer.name}`}
                        onClick={() => onEdit(customer)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    </div>
  );
}

export const CustomerTable = memo(CustomerTableInner);
