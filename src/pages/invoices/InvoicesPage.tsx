import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Receipt, Printer, Eye, Calendar, CreditCard, CheckCircle, XCircle, Clock, Send, FileText, X, Loader2, ChevronDown, Keyboard } from "lucide-react";
import InvoiceFormDialog from "@/components/invoices/InvoiceFormDialog";
import PaymentFormDialog from "@/components/payments/PaymentFormDialog";
import { InvoicePrintView } from "@/components/print/InvoicePrintView";
import { BulkPrintConfirmDialog } from "@/components/invoices/BulkPrintConfirmDialog";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { ColumnFilterHeader, type ColumnFilterKind, type FilterOption } from "@/components/ui/column-filter";
import { ActiveFiltersBar } from "@/components/table/ActiveFiltersBar";
import { TableViewOptions } from "@/components/table/TableViewOptions";
import { DataTableToolbar } from "@/components/table/DataTableToolbar";
import { DENSITY_CLASS, useTableLayout } from "@/hooks/useTableLayout";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { EntityLink } from "@/components/shared/EntityLink";
import { useIsMobile } from "@/hooks/use-mobile";
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListStateRenderer } from "@/components/shared/ListStateRenderer";
import { MobileListSkeleton, MobileStatSkeleton } from "@/components/mobile/MobileListSkeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { VirtualizedMobileList } from "@/components/table/VirtualizedMobileList";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useInvoicesList, type InvoiceWithCustomer } from "@/hooks/invoices/useInvoicesList";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useListShortcuts } from "@/hooks/useListShortcuts";
import { ShortcutsHelp } from "@/components/shared/ShortcutsHelp";
import { InvoiceQuickView } from "@/components/invoices/InvoiceQuickView";
import type { Database } from "@/integrations/supabase/types";

// Legacy standalone key from the ungated M1 execution; cleaned up on mount so
// presentation preferences live only in the approved table-layout contract.
const LEGACY_SUMMARY_KEY = 'invoices:summary-strip';

const SHORTCUTS = [
  { keys: '/', description: 'الانتقال إلى حقل البحث' },
  { keys: 'N', description: 'فاتورة جديدة' },
  { keys: 'R', description: 'تحديث القائمة' },
  { keys: 'Esc', description: 'إغلاق النظرة السريعة أو إلغاء التحديد' },
  { keys: '؟ / ?', description: 'عرض هذه القائمة' },
];

type Invoice = Database['public']['Tables']['invoices']['Row'];

const paymentStatusLabels: Record<string, string> = { pending: "غير مدفوع", partial: "جزئي", paid: "مدفوع" };
const paymentStatusColors: Record<string, string> = { pending: "bg-destructive/10 text-destructive", partial: "bg-warning/10 text-warning", paid: "bg-success/10 text-success" };
const approvalStatusLabels: Record<string, string> = { draft: "مسودة", pending: "في انتظار الموافقة", approved: "معتمدة", rejected: "مرفوضة" };
const approvalStatusColors: Record<string, string> = { draft: "bg-muted text-muted-foreground", pending: "bg-warning/10 text-warning", approved: "bg-success/10 text-success", rejected: "bg-destructive/10 text-destructive" };
const approvalStatusIcons: Record<string, React.ElementType> = { draft: Clock, pending: Send, approved: CheckCircle, rejected: XCircle };

const toOptions = (labels: Record<string, string>): FilterOption[] =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/** Column definitions driving both the header cells and the active-filter chips. */
const INVOICE_FILTER_COLUMNS: {
  key: string;
  label: string;
  kind: ColumnFilterKind;
  sortable?: boolean;
  filterable?: boolean;
  options?: FilterOption[];
}[] = [
  { key: 'invoice_number', label: 'رقم الفاتورة', kind: 'text', sortable: true },
  { key: 'customer_name', label: 'العميل', kind: 'text' },
  { key: 'created_at', label: 'التاريخ', kind: 'date', sortable: true },
  { key: 'total_amount', label: 'الإجمالي', kind: 'number', sortable: true },
  { key: 'paid_amount', label: 'المدفوع', kind: 'number', sortable: true },
  // Remaining is derived (total - paid), so it is displayed but not filterable.
  { key: 'remaining', label: 'المتبقي', kind: 'number', filterable: false },
  { key: 'payment_status', label: 'حالة الدفع', kind: 'options', options: toOptions(paymentStatusLabels) },
  { key: 'approval_status', label: 'حالة الاعتماد', kind: 'options', options: toOptions(approvalStatusLabels) },
];

const FILTER_COLUMN_META = Object.fromEntries(
  INVOICE_FILTER_COLUMNS.map((c) => [c.key, { label: c.label, options: c.options }]),
);

const INVOICE_COLUMN_KEYS = INVOICE_FILTER_COLUMNS.map((c) => c.key);
const INVOICE_COLUMN_LABELS = INVOICE_FILTER_COLUMNS.map((c) => ({ key: c.key, label: c.label }));

const InvoicesPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const list = useInvoicesList();
  const { userRole } = useAuth();
  const { customRole, hasPermission, canViewField } = usePermissions();
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceWithCustomer | null>(null);
  const [quickInvoice, setQuickInvoice] = useState<InvoiceWithCustomer | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // Per-user table presentation (widths, density, visible columns, height,
  // summary collapse). Presentation preferences only — no business filters.
  const layout = useTableLayout('invoices', INVOICE_COLUMN_KEYS);
  const summaryOpen = !layout.summaryCollapsed;

  useEffect(() => {
    try { window.localStorage.removeItem(LEGACY_SUMMARY_KEY); } catch { /* storage unavailable */ }
  }, []);

  // Escape closes the highest-priority transient UI first, then clears selection.
  const shortcutHandlers = useMemo(() => ({
    onFocusSearch: () => searchRef.current?.focus(),
    onNew: () => list.handleAdd(),
    onRefresh: () => list.handleRefresh(),
    onEscape: () => {
      if (helpOpen) { setHelpOpen(false); return; }
      if (quickInvoice) { setQuickInvoice(null); return; }
      if (list.selectedIds.size > 0) list.clearSelection();
    },
    onToggleHelp: () => setHelpOpen((prev) => !prev),
  }), [list, quickInvoice, helpOpen]);
  useListShortcuts(shortcutHandlers, !isMobile);

  // Invoices that match the current selection — used by the preview dialog.
  const selectedInvoices = useMemo(
    () => (list.sortedData as InvoiceWithCustomer[]).filter((i) => list.selectedIds.has(i.id)),
    [list.sortedData, list.selectedIds]
  );

  const selectedIdsArr = useMemo(() => Array.from(list.selectedIds), [list.selectedIds]);

  const handleDownloaded = useCallback(() => {
    list.clearSelection();
  }, [list]);

  const renderMobileInvoiceItem = useCallback((invoice: InvoiceWithCustomer) => {
    const remaining = Number(invoice.total_amount) - Number(invoice.paid_amount || 0);
    return (
      <DataCard
        title={invoice.invoice_number}
        subtitle={invoice.customers?.name || 'بدون عميل'}
        badge={{ text: paymentStatusLabels[invoice.payment_status], variant: invoice.payment_status === 'paid' ? 'default' : invoice.payment_status === 'partial' ? 'secondary' : 'destructive' }}
        icon={<Receipt className="h-5 w-5" />}
        fields={[
          { label: 'الإجمالي', value: `${Number(invoice.total_amount).toLocaleString()} ج.م` },
          { label: 'المتبقي', value: `${remaining.toLocaleString()} ج.م`, icon: remaining > 0 ? <CreditCard className="h-4 w-4" /> : undefined },
          { label: 'التاريخ', value: new Date(invoice.created_at).toLocaleDateString('ar-EG'), icon: <Calendar className="h-4 w-4" /> },
        ]}
        onClick={() => navigate(`/invoices/${invoice.id}`)}
        onView={() => navigate(`/invoices/${invoice.id}`)}
        onEdit={list.canEdit ? () => list.handleEdit(invoice as unknown as Invoice) : undefined}
        onDelete={list.canDelete ? () => list.deleteMutation.mutate(invoice.id) : undefined}
      />
    );
  }, [navigate, list.canEdit, list.canDelete, list.handleEdit, list.deleteMutation]);

  const builtInFinancialAccess = userRole === 'admin' || userRole === 'accountant';
  const canViewFinancialSummary = (customRole ? hasPermission('payments', 'view') : builtInFinancialAccess)
    && canViewField('invoices', 'total_amount')
    && canViewField('invoices', 'paid_amount');

  const statItems = useMemo(() => {
    const common = [
      { label: 'إجمالي الفواتير', value: list.invoiceStats.total, icon: Receipt, tone: 'primary', statuses: undefined },
      { label: 'غير مدفوعة', value: list.invoiceStats.unpaid, icon: Clock, tone: 'destructive', statuses: ['pending'] },
    ];
    if (canViewFinancialSummary) {
      return [
        ...common,
        { label: 'إجمالي المبيعات', value: `${list.invoiceStats.totalValue.toLocaleString()} ج.م`, icon: CreditCard, tone: 'success', statuses: undefined },
        { label: 'مستحق التحصيل', value: `${list.invoiceStats.unpaidValue.toLocaleString()} ج.م`, icon: CreditCard, tone: 'warning', statuses: ['pending', 'partial'] },
      ];
    }
    return [
      ...common,
      { label: 'مدفوعة جزئيًا', value: list.invoiceStats.partial, icon: CreditCard, tone: 'warning', statuses: ['partial'] },
      { label: 'مكتملة السداد', value: list.invoiceStats.paid, icon: CheckCircle, tone: 'success', statuses: ['paid'] },
    ];
  }, [canViewFinancialSummary, list.invoiceStats]);

  const applySummaryFilter = useCallback((statuses?: string[]) => {
    list.columnFilters.setFilter('payment_status', statuses
      ? { kind: 'options', values: statuses }
      : undefined);
  }, [list.columnFilters]);

  const isSummaryActive = useCallback((statuses?: string[]) => {
    const active = list.columnFilters.filters.payment_status?.values ?? [];
    if (!statuses) return active.length === 0;
    return active.length === statuses.length && statuses.every((status) => active.includes(status));
  }, [list.columnFilters.filters.payment_status]);

  const statToneClasses: Record<string, string> = {
    primary: 'text-primary bg-primary/10',
    destructive: 'text-destructive bg-destructive/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
  };

  const renderMobileView = () => {
    if (list.isLoading && list.sortedData.length === 0) {
      return <div className="space-y-5"><div className="h-11 rounded-md bg-muted animate-pulse" /><MobileStatSkeleton count={4} /><MobileListSkeleton count={5} variant="invoice" /></div>;
    }
    const hasFilters = !!list.searchQuery;
    return (
      <PullToRefresh onRefresh={list.handleRefresh}>
        <div className="space-y-5">
          {/* 1. Search — primary action, top of view */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="بحث برقم الفاتورة أو اسم العميل..."
              value={list.searchQuery}
              onChange={(e) => list.setSearchQuery(e.target.value)}
              className="pr-10 h-11"
              inputMode="search"
            />
          </div>

          {/* 2. Stats chips — secondary info, compact */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            {statItems.map((stat, i) => (
              <Button
                key={i}
                type="button"
                variant="outline"
                aria-pressed={isSummaryActive(stat.statuses)}
                onClick={() => applySummaryFilter(stat.statuses)}
                className="h-auto min-w-[140px] shrink-0 justify-start border-border/60 p-0 text-start shadow-xs aria-pressed:border-primary aria-pressed:bg-primary/5"
              >
                <span className="w-full p-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md p-1.5 ${statToneClasses[stat.tone]}`}><stat.icon className="h-3.5 w-3.5" /></span>
                    <div className="min-w-0">
                      <p className="text-base font-bold tabular-nums leading-tight">{stat.value}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight truncate">{stat.label}</p>
                    </div>
                  </div>
                </span>
              </Button>
            ))}
          </div>

          {/* 3. Results */}
          <ListStateRenderer
            data={list.sortedData}
            isLoading={false}
            error={list.error}
            hasFilters={hasFilters}
            onRetry={() => list.refetch()}
            onClearFilters={() => list.setSearchQuery('')}
            empty={{
              icon: Receipt,
              title: 'لا توجد فواتير',
              description: 'ابدأ بإصدار فاتورتك الأولى لمتابعة المبيعات والتحصيل.',
              action: { label: 'فاتورة جديدة', onClick: list.handleAdd, icon: Plus },
            }}
            skeletonVariant="invoice"
          >
            <VirtualizedMobileList data={list.sortedData as InvoiceWithCustomer[]} renderItem={renderMobileInvoiceItem} getItemKey={(inv) => inv.id} itemHeight={160} />
            <ServerPagination currentPage={list.pagination.currentPage} totalPages={list.pagination.totalPages} totalCount={list.totalCount} pageSize={list.PAGE_SIZE} onPageChange={list.pagination.goToPage} hasNextPage={list.pagination.hasNextPage} hasPrevPage={list.pagination.hasPrevPage} />
          </ListStateRenderer>
        </div>
      </PullToRefresh>
    );
  };

  const renderTableView = () => {
    if (list.isLoading) return <TableSkeleton rows={5} columns={9} />;
    if (list.sortedData.length === 0) return <EmptyState icon={Receipt} title="لا توجد فواتير" description="ابدأ بإضافة فاتورة جديدة" action={{ label: "فاتورة جديدة", onClick: list.handleAdd, icon: Plus }} />;

    const allSelected = list.sortedData.length > 0 && list.sortedData.every((i) => list.selectedIds.has(i.id));
    const someSelected = list.sortedData.some((i) => list.selectedIds.has(i.id));
    const toggleAll = () => {
      if (allSelected) list.clearSelection();
      else list.sortedData.forEach((i) => { if (!list.selectedIds.has(i.id)) list.toggleSelect(i.id); });
    };

    /** One renderer per column id so hiding / reordering stays data-driven. */
    const renderCell = (key: string, invoice: InvoiceWithCustomer) => {
      const remaining = Number(invoice.total_amount) - Number(invoice.paid_amount || 0);
      switch (key) {
        case 'invoice_number':
          return <EntityLink type="invoice" id={invoice.id}>{invoice.invoice_number}</EntityLink>;
        case 'customer_name':
          return invoice.customers?.name
            ? <EntityLink type="customer" id={invoice.customer_id}>{invoice.customers.name}</EntityLink>
            : '-';
        case 'created_at':
          return new Date(invoice.created_at).toLocaleDateString('ar-EG');
        case 'total_amount':
          return <span className="font-bold tabular-nums">{Number(invoice.total_amount).toLocaleString()} ج.م</span>;
        case 'paid_amount':
          return <span className="tabular-nums text-success">{Number(invoice.paid_amount || 0).toLocaleString()} ج.م</span>;
        case 'remaining':
          return <span className={`tabular-nums ${remaining > 0 ? 'text-destructive' : ''}`}>{remaining.toLocaleString()} ج.م</span>;
        case 'payment_status':
          return <Badge className={`${paymentStatusColors[invoice.payment_status]} whitespace-nowrap`}>{paymentStatusLabels[invoice.payment_status]}</Badge>;
        case 'approval_status': {
          const status = invoice.approval_status || 'draft';
          const StatusIcon = approvalStatusIcons[status];
          return (
            <Badge className={`${approvalStatusColors[status]} gap-1 whitespace-nowrap`}>
              <StatusIcon className="h-3 w-3" />{approvalStatusLabels[status]}
            </Badge>
          );
        }
        default:
          return null;
      }
    };

    const visibleColumns = layout.visibleKeys
      .map((key) => INVOICE_FILTER_COLUMNS.find((c) => c.key === key))
      .filter(Boolean) as typeof INVOICE_FILTER_COLUMNS;

    return (
      <>
        <div
          className="w-full overflow-auto rounded-md border border-border"
          style={layout.bodyHeight ? { maxHeight: layout.bodyHeight } : undefined}
        >
          <Table className={DENSITY_CLASS[layout.density]}>
            <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_hsl(var(--border))]">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    aria-label="تحديد الكل"
                    onCheckedChange={toggleAll}
                    {...(someSelected && !allSelected ? { 'data-state': 'indeterminate' as const } : {})}
                  />
                </TableHead>
                {visibleColumns.map((col) => (
                  <ColumnFilterHeader
                    key={col.key}
                    label={col.label}
                    sortKey={col.sortable ? col.key : undefined}
                    sortConfig={list.sortConfig}
                    onSort={list.requestSort}
                    filterKey={col.filterable === false ? undefined : col.key}
                    filterKind={col.kind}
                    options={col.key === 'customer_name' ? list.customerOptions
                      : col.key === 'invoice_number' ? list.invoiceNumberOptions
                      : col.options}
                    optionsLoading={col.key === 'customer_name' ? list.customerOptionsLoading
                      : col.key === 'invoice_number' ? list.invoiceNumberOptionsLoading
                      : false}
                    value={list.columnFilters.filters[col.key]}
                    onChange={list.columnFilters.setFilter}
                    width={layout.widths[col.key]}
                    onResize={layout.setWidth}
                    onAutoFit={layout.autoFitWidth}
                  />
                ))}
                <DataTableHeader label="إجراءات" className="text-end" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.sortedData as InvoiceWithCustomer[]).map((invoice) => {
                const isSelected = list.selectedIds.has(invoice.id);
                return (
                  <TableRow key={invoice.id} data-state={isSelected ? 'selected' : undefined} className="cursor-pointer hover:bg-muted/50" onClick={() => setQuickInvoice(invoice)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onCheckedChange={() => list.toggleSelect(invoice.id)} aria-label={`تحديد فاتورة ${invoice.invoice_number}`} />
                    </TableCell>
                    {visibleColumns.map((col) => (
                      <TableCell
                        key={col.key}
                        className="truncate whitespace-nowrap"
                        style={layout.widths[col.key] ? { width: layout.widths[col.key], maxWidth: layout.widths[col.key] } : undefined}
                      >
                        {renderCell(col.key, invoice)}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/invoices/${invoice.id}`)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { list.setPrintInvoiceId(invoice.id); list.setPrintDialogOpen(true); }}><Printer className="h-4 w-4" /></Button>
                        {invoice.payment_status !== 'paid' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`تسجيل دفعة للفاتورة ${invoice.invoice_number}`}
                                onClick={() => setPaymentInvoice(invoice)}
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>تسجيل دفعة</TooltipContent>
                          </Tooltip>
                        )}
                        <DataTableActions onEdit={() => list.handleEdit(invoice as unknown as Invoice)} onDelete={() => list.deleteMutation.mutate(invoice.id)} canEdit={list.canEdit} canDelete={list.canDelete} deleteDescription="سيتم حذف هذه الفاتورة وجميع بنودها نهائياً." />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <ServerPagination currentPage={list.pagination.currentPage} totalPages={list.pagination.totalPages} totalCount={list.totalCount} pageSize={list.PAGE_SIZE} onPageChange={list.pagination.goToPage} hasNextPage={list.pagination.hasNextPage} hasPrevPage={list.pagination.hasPrevPage} />
      </>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
            <Receipt className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">الفواتير</h1>
            <p className="text-sm text-muted-foreground">إدارة فواتير المبيعات والتحصيل</p>
          </div>
        </div>
        <Badge variant="secondary" className="h-8 px-3 text-sm font-medium">
          {list.totalCount.toLocaleString()} فاتورة
        </Badge>
      </div>

      {isMobile ? renderMobileView() : (
        <>
          <section aria-label={canViewFinancialSummary ? 'الملخص المالي للفواتير' : 'ملخص متابعة الفواتير'}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => layout.setSummaryCollapsed(summaryOpen)}
                aria-expanded={summaryOpen}
                className="flex items-center gap-2 rounded-md px-1 py-1 text-sm font-medium hover:text-primary"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${summaryOpen ? '' : '-rotate-90'}`} />
                {canViewFinancialSummary ? 'الملخص المالي' : 'متابعة حالات السداد'}
              </button>
              <p className="text-xs text-muted-foreground">
                {summaryOpen ? 'اختر بطاقة لتصفية القائمة' : 'الملخص مطوي — اضغط لعرضه'}
              </p>
            </div>
            {summaryOpen && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {statItems.map((stat, i) => (
              <Button
                key={i}
                type="button"
                variant="outline"
                aria-pressed={isSummaryActive(stat.statuses)}
                onClick={() => applySummaryFilter(stat.statuses)}
                className="h-auto min-h-20 justify-start border-border/70 p-3 text-start shadow-xs transition-colors aria-pressed:border-primary aria-pressed:bg-primary/5"
              >
                <span className="flex w-full items-center gap-3">
                  <span className={`rounded-md p-2 ${statToneClasses[stat.tone]}`}><stat.icon className="h-5 w-5" /></span>
                  <span className="min-w-0">
                    <span className="block text-xl font-bold tabular-nums">{stat.value}</span>
                    <span className="block text-sm font-normal text-muted-foreground">{stat.label}</span>
                  </span>
                </span>
              </Button>
            ))}
            </div>
            )}
          </section>
          <Card className="sticky top-0 z-20 shadow-sm"><CardContent className="p-4">
            <DataTableToolbar
              search={(
                <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  placeholder="بحث برقم الفاتورة أو اسم العميل... (اضغط /)"
                  value={list.searchQuery}
                  onChange={(e) => list.setSearchQuery(e.target.value)}
                  className="pr-10 pl-9"
                />
                {list.searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="مسح البحث"
                    className="absolute left-1 top-1/2 h-7 w-7 -translate-y-1/2"
                    onClick={() => { list.setSearchQuery(''); searchRef.current?.focus(); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                </div>
              )}
              status={(
                <div className="flex w-full items-center justify-between gap-2">
                  <ActiveFiltersBar
                    section="invoices"
                    filters={list.columnFilters.filters}
                    columns={FILTER_COLUMN_META}
                    resultCount={list.totalCount}
                    onRemove={list.columnFilters.removeFilter}
                    onClearAll={list.columnFilters.clearFilters}
                    onApplySet={list.columnFilters.replaceFilters}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="اختصارات لوحة المفاتيح"
                        onClick={() => setHelpOpen(true)}
                      >
                        <Keyboard className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>اختصارات لوحة المفاتيح (؟)</TooltipContent>
                  </Tooltip>
                </div>
              )}
            />
          </CardContent></Card>
          {(() => {
            const pageData = list.sortedData as InvoiceWithCustomer[];
            const allOnPageSelected = pageData.length > 0 && pageData.every((i) => list.selectedIds.has(i.id));
            const someOnPageSelected = pageData.some((i) => list.selectedIds.has(i.id));
            const selectedTotal = selectedInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
            const selectionState: 'all' | 'partial' | 'none' = allOnPageSelected
              ? 'all'
              : someOnPageSelected || list.selectedIds.size > 0
              ? 'partial'
              : 'none';
            const toggleAllOnPage = () => {
              if (allOnPageSelected) list.clearSelection();
              else pageData.forEach((i) => { if (!list.selectedIds.has(i.id)) list.toggleSelect(i.id); });
            };
            const stateLabel: Record<typeof selectionState, string> = {
              all: 'تم تحديد كل فواتير الصفحة',
              partial: 'تحديد جزئي',
              none: 'لم يتم تحديد أي فاتورة',
            };
            const stateBadgeClass: Record<typeof selectionState, string> = {
              all: 'bg-success/10 text-success border-success/30',
              partial: 'bg-warning/10 text-warning border-warning/30',
              none: 'bg-muted text-muted-foreground border-border',
            };
            // The bar only exists while something is selected, so it never
            // steals vertical space from the table in the default state.
            if (list.selectedIds.size === 0) return null;
            return (
              <div
                className="sticky bottom-4 z-30 flex flex-col lg:flex-row flex-wrap items-start lg:items-center justify-between gap-3 rounded-lg border border-primary/30 bg-card/95 p-3 shadow-lg backdrop-blur animate-fade-in"
                role="region"
                aria-label="أدوات التحديد الجمعي للفواتير"
                aria-live="polite"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Checkbox
                    checked={allOnPageSelected}
                    aria-label={allOnPageSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                    onCheckedChange={toggleAllOnPage}
                    {...(someOnPageSelected && !allOnPageSelected ? { 'data-state': 'indeterminate' as const } : {})}
                  />
                  <Badge variant="outline" className={`font-bold ${stateBadgeClass[selectionState]}`}>
                    {stateLabel[selectionState]}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    المحدد: <strong className="text-foreground">{list.selectedIds.size}</strong> من <span className="font-medium">{list.totalCount}</span>
                  </span>
                  {list.selectedIds.size > 0 && (
                    <span className="flex items-center gap-2 border-r pr-3 text-sm text-muted-foreground">
                      إجمالي المحدد: <strong className="text-success">{selectedTotal.toLocaleString()} ج.م</strong>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={toggleAllOnPage} disabled={pageData.length === 0}>
                    {allOnPageSelected ? 'إلغاء تحديد الصفحة' : 'تحديد الصفحة'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={list.selectAllFiltered}
                    disabled={list.isSelectingAll || list.totalCount === 0}
                    title={list.debouncedSearch ? 'تحديد كل الفواتير المطابقة للبحث' : 'تحديد كل الفواتير المعروضة'}
                  >
                    {list.isSelectingAll && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                    تحديد كل المعروض ({list.totalCount})
                  </Button>
                  <Button
                    size="sm"
                    variant={list.selectedIds.size > 0 ? 'default' : 'outline'}
                    onClick={() => setBulkPreviewOpen(true)}
                    disabled={list.isBulkPrinting || list.selectedIds.size === 0}
                  >
                    {list.isBulkPrinting ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <FileText className="h-4 w-4 ml-2" />}
                    معاينة وطباعة PDF
                  </Button>
                  {list.selectedIds.size > 0 && (
                    <Button size="sm" variant="ghost" onClick={list.clearSelection}>
                      <X className="h-4 w-4 ml-1" />إلغاء التحديد
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
          <Card>
            <CardHeader className="flex flex-col gap-4 space-y-0 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <CardTitle className="text-lg">قائمة الفواتير</CardTitle>
                  <p className="text-xs text-muted-foreground">{list.totalCount.toLocaleString()} فاتورة مطابقة</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={list.handleAdd}>
                  <Plus className="h-4 w-4 ml-2" />
                  فاتورة جديدة
                </Button>
                <span className="h-6 w-px bg-border" aria-hidden="true" />
                <ExportWithTemplateButton section="invoices" sectionLabel="الفواتير" data={list.sortedData} columns={[{ key: 'invoice_number', label: 'رقم الفاتورة' }, { key: 'customers.name', label: 'العميل' }, { key: 'total_amount', label: 'الإجمالي' }, { key: 'paid_amount', label: 'المدفوع' }, { key: 'payment_status', label: 'حالة الدفع' }, { key: 'created_at', label: 'التاريخ' }]} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <TableViewOptions layout={layout} columns={INVOICE_COLUMN_LABELS} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>تخصيص عرض الجدول</TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>{renderTableView()}</CardContent>
          </Card>
        </>
      )}

      <InvoiceFormDialog open={list.dialogOpen} onOpenChange={(open) => { list.setDialogOpen(open); if (!open) list.setPrefillCustomerId(undefined); }} invoice={list.selectedInvoice} prefillCustomerId={list.prefillCustomerId} />
      <PaymentFormDialog
        open={paymentInvoice !== null}
        onOpenChange={(open) => { if (!open) setPaymentInvoice(null); }}
        prefillCustomerId={paymentInvoice?.customer_id}
        prefillInvoiceId={paymentInvoice?.id}
      />
      <InvoiceQuickView
        invoice={quickInvoice}
        open={quickInvoice !== null}
        onOpenChange={(open) => { if (!open) setQuickInvoice(null); }}
        onOpenFull={(id) => { setQuickInvoice(null); navigate(`/invoices/${id}`); }}
        onPrint={(id) => { setQuickInvoice(null); list.setPrintInvoiceId(id); list.setPrintDialogOpen(true); }}
        onRecordPayment={(invoice) => { setQuickInvoice(null); setPaymentInvoice(invoice); }}
        paymentStatusLabels={paymentStatusLabels}
        paymentStatusColors={paymentStatusColors}
        approvalStatusLabels={approvalStatusLabels}
      />
      <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} shortcuts={SHORTCUTS} />
      {list.printInvoiceId && <InvoicePrintView invoiceId={list.printInvoiceId} open={list.printDialogOpen} onOpenChange={list.setPrintDialogOpen} />}
      <BulkPrintConfirmDialog
        open={bulkPreviewOpen}
        onOpenChange={setBulkPreviewOpen}
        invoices={selectedInvoices}
        selectedIds={selectedIdsArr}
        onDownloaded={handleDownloaded}
      />
    </div>
  );
};

export default InvoicesPage;
