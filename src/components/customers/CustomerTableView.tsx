import React, { memo, useState, useCallback, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Building2, Users, Crown } from "lucide-react";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { CustomerActionMenu } from "@/components/customers/CustomerActionMenu";
import CustomerAvatar from "@/components/customers/CustomerAvatar";
import { VirtualizedTable, VirtualColumn } from "@/components/table/VirtualizedTable";
import { vipColors, vipLabels, getBalanceColor } from "@/lib/customerConstants";
import type { Customer } from "@/lib/customerConstants";
import type { SortConfig } from "@/hooks/useTableSort";

const VIRTUALIZATION_THRESHOLD = 80;

interface CustomerTableViewProps {
  data: Customer[];
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  onNavigate: (id: string) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onNewInvoice: (id: string) => void;
  onWhatsApp: (phone: string) => void;
  onRowHover: (id: string) => void;
  onRowLeave: () => void;
  canEdit: boolean;
  canDelete: boolean;
  deletingId: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  isAllSelected: boolean;
}

export const CustomerTableView = memo(function CustomerTableView({
  data, sortConfig, onSort, onNavigate, onEdit, onDelete,
  onNewInvoice, onWhatsApp, onRowHover, onRowLeave,
  canEdit, canDelete, deletingId,
  selectedIds, onToggleSelect, onToggleSelectAll, isAllSelected,
}: CustomerTableViewProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const tableRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = data.length > VIRTUALIZATION_THRESHOLD;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (data.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, data.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        if (focusedIndex >= 0 && focusedIndex < data.length) {
          onNavigate(data[focusedIndex].id);
        }
        break;
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < data.length) {
          const customer = data[focusedIndex];
          onToggleSelect(customer.id, !selectedIds.has(customer.id));
        }
        break;
      case 'Delete':
        if (canDelete && focusedIndex >= 0 && focusedIndex < data.length) {
          onDelete(data[focusedIndex].id);
        }
        break;
    }
  }, [data, focusedIndex, onNavigate, onToggleSelect, selectedIds, canDelete, onDelete]);

  // Scroll focused row into view (non-virtualized only)
  useEffect(() => {
    if (focusedIndex < 0 || !tableRef.current || shouldVirtualize) return;
    const rows = tableRef.current.querySelectorAll('tbody tr');
    rows[focusedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, shouldVirtualize]);

  // Virtualized rendering
  if (shouldVirtualize) {
    const columns: VirtualColumn<Customer>[] = [
      ...(canDelete ? [{
        key: 'select' as string,
        header: <Checkbox checked={isAllSelected} onCheckedChange={(c: boolean | 'indeterminate') => onToggleSelectAll(!!c)} />,
        width: '40px',
        cell: (customer: Customer) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedIds.has(customer.id)}
              onCheckedChange={(c) => onToggleSelect(customer.id, !!c)}
            />
          </div>
        ),
      }] : []),
      {
        key: 'name',
        header: <DataTableHeader label="الاسم" sortKey="name" sortConfig={sortConfig} onSort={onSort} />,
        cell: (customer: Customer) => (
          <div className="flex items-center gap-3">
            <CustomerAvatar name={customer.name} imageUrl={customer.image_url} customerType={customer.customer_type} size="sm" />
            <div>
              <p className="font-medium">{customer.name}</p>
              {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
            </div>
          </div>
        ),
      },
      {
        key: 'customer_type',
        header: 'النوع',
        cell: (customer: Customer) => (
          <Badge variant="outline">
            {customer.customer_type === 'company' ? <><Building2 className="h-3 w-3 ml-1" /> شركة</> : customer.customer_type === 'farm' ? <>مزرعة</> : <><Users className="h-3 w-3 ml-1" /> فرد</>}
          </Badge>
        ),
      },
      { key: 'phone', header: 'الهاتف', cell: (c: Customer) => <>{c.phone || '-'}</> },
      { key: 'governorate', header: 'المحافظة', cell: (c: Customer) => <span className="text-sm text-muted-foreground">{c.governorate || '-'}</span> },
      {
        key: 'vip_level',
        header: 'مستوى VIP',
        cell: (customer: Customer) => (
          <Badge className={vipColors[customer.vip_level] || vipColors.regular}>
            <Crown className="h-3 w-3 ml-1" />
            {vipLabels[customer.vip_level] || vipLabels.regular}
          </Badge>
        ),
      },
      {
        key: 'current_balance',
        header: <DataTableHeader label="الرصيد" sortKey="current_balance" sortConfig={sortConfig} onSort={onSort} />,
        cell: (customer: Customer) => (
          <span className={getBalanceColor(Number(customer.current_balance), Number(customer.credit_limit))}>
            {Number(customer.current_balance).toLocaleString()} ج.م
          </span>
        ),
      },
      {
        key: 'is_active',
        header: 'الحالة',
        cell: (customer: Customer) => (
          <Badge variant={customer.is_active ? "default" : "secondary"}>{customer.is_active ? "نشط" : "غير نشط"}</Badge>
        ),
      },
      {
        key: 'actions',
        header: 'إجراءات',
        className: 'text-left',
        cell: (customer: Customer) => (
          <div onClick={(e) => e.stopPropagation()}>
            <CustomerActionMenu
              customer={customer}
              variant="table"
              canEdit={canEdit}
              canDelete={canDelete}
              isDeleting={deletingId === customer.id}
              onView={() => onNavigate(customer.id)}
              onEdit={() => onEdit(customer)}
              onDelete={() => onDelete(customer.id)}
              onNewInvoice={() => onNewInvoice(customer.id)}
              onWhatsApp={() => customer.phone && onWhatsApp(customer.phone)}
            />
          </div>
        ),
      },
    ];

    return (
      <VirtualizedTable
        data={data}
        columns={columns}
        rowHeight={56}
        maxHeight={700}
        onRowClick={(customer) => onNavigate(customer.id)}
        getRowKey={(customer) => customer.id}
      />
    );
  }

  // Non-virtualized (original) rendering for small datasets
  return (
    <div
      ref={tableRef}
      className="overflow-x-auto"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="grid"
      aria-label="جدول العملاء"
    >
      <Table>
        <TableHeader>
          <TableRow>
            {canDelete && (
              <TableHead className="w-10">
                <Checkbox checked={isAllSelected} onCheckedChange={(c) => onToggleSelectAll(!!c)} />
              </TableHead>
            )}
            <TableHead><DataTableHeader label="الاسم" sortKey="name" sortConfig={sortConfig} onSort={onSort} /></TableHead>
            <TableHead>النوع</TableHead>
            <TableHead>الهاتف</TableHead>
            <TableHead>المحافظة</TableHead>
            <TableHead>مستوى VIP</TableHead>
            <TableHead><DataTableHeader label="الرصيد" sortKey="current_balance" sortConfig={sortConfig} onSort={onSort} /></TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead className="text-left">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((customer, index) => (
            <TableRow
              key={customer.id}
              className={`hover:bg-muted/50 cursor-pointer transition-colors ${
                focusedIndex === index ? 'ring-2 ring-primary/50 bg-muted/30' : ''
              }`}
              onClick={() => onNavigate(customer.id)}
              onMouseEnter={() => { onRowHover(customer.id); setFocusedIndex(index); }}
              onMouseLeave={onRowLeave}
              aria-selected={selectedIds.has(customer.id)}
            >
              {canDelete && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(customer.id)}
                    onCheckedChange={(c) => onToggleSelect(customer.id, !!c)}
                  />
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-3">
                  <CustomerAvatar name={customer.name} imageUrl={customer.image_url} customerType={customer.customer_type} size="sm" />
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {customer.customer_type === 'company' ? <><Building2 className="h-3 w-3 ml-1" /> شركة</> : customer.customer_type === 'farm' ? <>مزرعة</> : <><Users className="h-3 w-3 ml-1" /> فرد</>}
                </Badge>
              </TableCell>
              <TableCell>{customer.phone || '-'}</TableCell>
              <TableCell><span className="text-sm text-muted-foreground">{customer.governorate || '-'}</span></TableCell>
              <TableCell>
                <Badge className={vipColors[customer.vip_level] || vipColors.regular}>
                  <Crown className="h-3 w-3 ml-1" />
                  {vipLabels[customer.vip_level] || vipLabels.regular}
                </Badge>
              </TableCell>
              <TableCell>
                <span className={getBalanceColor(Number(customer.current_balance), Number(customer.credit_limit))}>
                  {Number(customer.current_balance).toLocaleString()} ج.م
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={customer.is_active ? "default" : "secondary"}>{customer.is_active ? "نشط" : "غير نشط"}</Badge>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <CustomerActionMenu
                  customer={customer}
                  variant="table"
                  canEdit={canEdit}
                  canDelete={canDelete}
                  isDeleting={deletingId === customer.id}
                  onView={() => onNavigate(customer.id)}
                  onEdit={() => onEdit(customer)}
                  onDelete={() => onDelete(customer.id)}
                  onNewInvoice={() => onNewInvoice(customer.id)}
                  onWhatsApp={() => customer.phone && onWhatsApp(customer.phone)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});
