import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Receipt, Printer, Eye, Calendar, CreditCard, CheckCircle, XCircle, Clock, Send, Copy, FileText, X, Loader2 } from "lucide-react";
import InvoiceFormDialog from "@/components/invoices/InvoiceFormDialog";
import { InvoicePrintView } from "@/components/print/InvoicePrintView";
import { BulkPrintConfirmDialog } from "@/components/invoices/BulkPrintConfirmDialog";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { EntityLink } from "@/components/shared/EntityLink";
import { useIsMobile } from "@/hooks/use-mobile";
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { EmptyState } from "@/components/shared/EmptyState";
import { MobileListSkeleton, MobileStatSkeleton } from "@/components/mobile/MobileListSkeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { VirtualizedMobileList } from "@/components/table/VirtualizedMobileList";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useInvoicesList, type InvoiceWithCustomer } from "@/hooks/invoices/useInvoicesList";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];

const paymentStatusLabels: Record<string, string> = { pending: "غير مدفوع", partial: "جزئي", paid: "مدفوع" };
const paymentStatusColors: Record<string, string> = { pending: "bg-destructive/10 text-destructive", partial: "bg-warning/10 text-warning", paid: "bg-success/10 text-success" };
const approvalStatusLabels: Record<string, string> = { draft: "مسودة", pending: "في انتظار الموافقة", approved: "معتمدة", rejected: "مرفوضة" };
const approvalStatusColors: Record<string, string> = { draft: "bg-muted text-muted-foreground", pending: "bg-warning/10 text-warning", approved: "bg-success/10 text-success", rejected: "bg-destructive/10 text-destructive" };
const approvalStatusIcons: Record<string, React.ElementType> = { draft: Clock, pending: Send, approved: CheckCircle, rejected: XCircle };

const InvoicesPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const list = useInvoicesList();
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);

  // Invoices that match the current selection — used by the preview dialog.
  const selectedInvoices = useMemo(
    () => (list.sortedData as InvoiceWithCustomer[]).filter((i) => list.selectedIds.has(i.id)),
    [list.sortedData, list.selectedIds]
  );

  const handleConfirmBulkPrint = useCallback(async () => {
    await list.bulkPrint();
    setBulkPreviewOpen(false);
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

  const statItems = useMemo(() => [
    { label: 'إجمالي الفواتير', value: list.invoiceStats.total, icon: Receipt, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'غير مدفوعة', value: list.invoiceStats.unpaid, icon: Receipt, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { label: 'إجمالي المبيعات', value: `${list.invoiceStats.totalValue.toLocaleString()}`, icon: CreditCard, color: 'text-success', bgColor: 'bg-success/10' },
    { label: 'مستحق التحصيل', value: `${list.invoiceStats.unpaidValue.toLocaleString()}`, icon: CreditCard, color: 'text-warning', bgColor: 'bg-warning/10' },
  ], [list.invoiceStats]);

  const renderMobileView = () => {
    if (list.isLoading) return <div className="space-y-4"><MobileStatSkeleton count={4} /><MobileListSkeleton count={5} variant="invoice" /></div>;
    return (
      <PullToRefresh onRefresh={list.handleRefresh}>
        <div className="space-y-4">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {statItems.map((stat, i) => (
              <Card key={i} className="min-w-[140px] shrink-0"><CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}><stat.icon className={`h-4 w-4 ${stat.color}`} /></div>
                  <div><p className="text-lg font-bold">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.label}</p></div>
                </div>
              </CardContent></Card>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث برقم الفاتورة أو اسم العميل..." value={list.searchQuery} onChange={(e) => list.setSearchQuery(e.target.value)} className="pr-10" />
          </div>
          {list.sortedData.length === 0 ? (
            <EmptyState icon={Receipt} title="لا توجد فواتير" description="ابدأ بإضافة فاتورة جديدة" action={{ label: "فاتورة جديدة", onClick: list.handleAdd, icon: Plus }} />
          ) : (
            <>
              <VirtualizedMobileList data={list.sortedData as InvoiceWithCustomer[]} renderItem={renderMobileInvoiceItem} getItemKey={(inv) => inv.id} itemHeight={160} />
              <ServerPagination currentPage={list.pagination.currentPage} totalPages={list.pagination.totalPages} totalCount={list.totalCount} pageSize={list.PAGE_SIZE} onPageChange={list.pagination.goToPage} hasNextPage={list.pagination.hasNextPage} hasPrevPage={list.pagination.hasPrevPage} />
            </>
          )}
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

    return (
      <>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="w-10">
                  <Checkbox
                    checked={allSelected}
                    aria-label="تحديد الكل"
                    onCheckedChange={toggleAll}
                    {...(someSelected && !allSelected ? { 'data-state': 'indeterminate' as const } : {})}
                  />
                </TableCell>
                <DataTableHeader label="رقم الفاتورة" sortKey="invoice_number" sortConfig={list.sortConfig} onSort={list.requestSort} />
                <DataTableHeader label="العميل" />
                <DataTableHeader label="التاريخ" sortKey="created_at" sortConfig={list.sortConfig} onSort={list.requestSort} />
                <DataTableHeader label="الإجمالي" sortKey="total_amount" sortConfig={list.sortConfig} onSort={list.requestSort} />
                <DataTableHeader label="المدفوع" />
                <DataTableHeader label="المتبقي" />
                <DataTableHeader label="حالة الدفع" filterKey="payment_status" filterType="select" filterOptions={[{ value: 'pending', label: 'غير مدفوع' }, { value: 'partial', label: 'جزئي' }, { value: 'paid', label: 'مدفوع' }]} filterValue={list.filters.payment_status as string} onFilter={list.setFilter} />
                <DataTableHeader label="حالة الاعتماد" filterKey="approval_status" filterType="select" filterOptions={[{ value: 'draft', label: 'مسودة' }, { value: 'pending', label: 'في انتظار الموافقة' }, { value: 'approved', label: 'معتمدة' }, { value: 'rejected', label: 'مرفوضة' }]} filterValue={list.filters.approval_status as string} onFilter={list.setFilter} />
                <DataTableHeader label="إجراءات" className="text-left" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.sortedData.map((invoice) => {
                const remaining = Number(invoice.total_amount) - Number(invoice.paid_amount || 0);
                const isSelected = list.selectedIds.has(invoice.id);
                return (
                  <TableRow key={invoice.id} data-state={isSelected ? 'selected' : undefined} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onCheckedChange={() => list.toggleSelect(invoice.id)} aria-label={`تحديد فاتورة ${invoice.invoice_number}`} />
                    </TableCell>
                    <TableCell><EntityLink type="invoice" id={invoice.id}>{invoice.invoice_number}</EntityLink></TableCell>
                    <TableCell>{invoice.customers?.name ? <EntityLink type="customer" id={invoice.customer_id}>{invoice.customers.name}</EntityLink> : '-'}</TableCell>
                    <TableCell>{new Date(invoice.created_at).toLocaleDateString('ar-EG')}</TableCell>
                    <TableCell><span className="font-bold">{Number(invoice.total_amount).toLocaleString()} ج.م</span></TableCell>
                    <TableCell className="text-success">{Number(invoice.paid_amount || 0).toLocaleString()} ج.م</TableCell>
                    <TableCell className={remaining > 0 ? 'text-destructive' : ''}>{remaining.toLocaleString()} ج.م</TableCell>
                    <TableCell><Badge className={paymentStatusColors[invoice.payment_status]}>{paymentStatusLabels[invoice.payment_status]}</Badge></TableCell>
                    <TableCell>{(() => { const status = invoice.approval_status || 'draft'; const StatusIcon = approvalStatusIcons[status]; return <Badge className={`${approvalStatusColors[status]} gap-1`}><StatusIcon className="h-3 w-3" />{approvalStatusLabels[status]}</Badge>; })()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/invoices/${invoice.id}`)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { list.setPrintInvoiceId(invoice.id); list.setPrintDialogOpen(true); }}><Printer className="h-4 w-4" /></Button>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => list.duplicate(invoice.id)} disabled={list.isDuplicating}><Copy className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>نسخ الفاتورة</TooltipContent></Tooltip>
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold">الفواتير</h1><p className="text-muted-foreground">إدارة فواتير المبيعات</p></div>
        <div className="flex gap-2">
          {!isMobile && <ExportWithTemplateButton section="invoices" sectionLabel="الفواتير" data={list.sortedData} columns={[{ key: 'invoice_number', label: 'رقم الفاتورة' }, { key: 'customers.name', label: 'العميل' }, { key: 'total_amount', label: 'الإجمالي' }, { key: 'paid_amount', label: 'المدفوع' }, { key: 'payment_status', label: 'حالة الدفع' }, { key: 'created_at', label: 'التاريخ' }]} />}
          <Button onClick={list.handleAdd} size={isMobile ? "sm" : "default"}><Plus className="h-4 w-4 ml-2" />{isMobile ? "جديد" : "فاتورة جديدة"}</Button>
        </div>
      </div>

      {isMobile ? renderMobileView() : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statItems.map((stat, i) => (
              <Card key={i}><CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
                  <div><p className="text-2xl font-bold">{stat.value}</p><p className="text-sm text-muted-foreground">{stat.label}</p></div>
                </div>
              </CardContent></Card>
            ))}
          </div>
          <Card><CardContent className="p-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث برقم الفاتورة أو اسم العميل..." value={list.searchQuery} onChange={(e) => list.setSearchQuery(e.target.value)} className="pr-10" />
            </div>
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
            return (
              <Card className={list.selectedIds.size > 0 ? 'border-primary/40 bg-primary/5' : ''}>
                <CardContent className="p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Checkbox
                      checked={allOnPageSelected}
                      aria-label={allOnPageSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                      onCheckedChange={toggleAllOnPage}
                      {...(someOnPageSelected && !allOnPageSelected ? { 'data-state': 'indeterminate' as const } : {})}
                    />
                    <Badge variant="outline" className={`font-bold ${stateBadgeClass[selectionState]}`}>
                      {stateLabel[selectionState]}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">المحدد:</span>
                      <span className="font-bold text-primary">{list.selectedIds.size}</span>
                      <span className="text-muted-foreground">من</span>
                      <span className="font-medium">{list.totalCount}</span>
                    </div>
                    {list.selectedIds.size > 0 && (
                      <div className="flex items-center gap-2 text-sm border-r pr-3 mr-1">
                        <span className="text-muted-foreground">إجمالي المحدد:</span>
                        <span className="font-bold text-success">{selectedTotal.toLocaleString()} ج.م</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={toggleAllOnPage} disabled={pageData.length === 0}>
                      {allOnPageSelected ? 'إلغاء تحديد الصفحة' : 'تحديد الصفحة'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setBulkPreviewOpen(true)}
                      disabled={list.isBulkPrinting || list.selectedIds.size === 0}
                    >
                      {list.isBulkPrinting ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <FileText className="h-4 w-4 ml-2" />}
                      معاينة وطباعة دفعية PDF
                    </Button>
                    {list.selectedIds.size > 0 && (
                      <Button size="sm" variant="ghost" onClick={list.clearSelection}>
                        <X className="h-4 w-4 ml-1" />إلغاء التحديد
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
          <Card><CardHeader><CardTitle>قائمة الفواتير</CardTitle></CardHeader><CardContent>{renderTableView()}</CardContent></Card>
        </>
      )}

      <InvoiceFormDialog open={list.dialogOpen} onOpenChange={(open) => { list.setDialogOpen(open); if (!open) list.setPrefillCustomerId(undefined); }} invoice={list.selectedInvoice} prefillCustomerId={list.prefillCustomerId} />
      {list.printInvoiceId && <InvoicePrintView invoiceId={list.printInvoiceId} open={list.printDialogOpen} onOpenChange={list.setPrintDialogOpen} />}
      <BulkPrintConfirmDialog
        open={bulkPreviewOpen}
        onOpenChange={setBulkPreviewOpen}
        invoices={selectedInvoices}
        onConfirm={handleConfirmBulkPrint}
        isProcessing={list.isBulkPrinting}
      />
    </div>
  );
};

export default InvoicesPage;
