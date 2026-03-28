import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Receipt, Printer, Eye, Calendar, CreditCard, CheckCircle, XCircle, Clock, Send, Copy } from "lucide-react";
import InvoiceFormDialog from "@/components/invoices/InvoiceFormDialog";
import { InvoicePrintView } from "@/components/print/InvoicePrintView";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { EntityLink } from "@/components/shared/EntityLink";
import { useIsMobile } from "@/hooks/use-mobile";
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { EmptyState } from "@/components/shared/EmptyState";
import { MobileListSkeleton, MobileStatSkeleton } from "@/components/mobile/MobileListSkeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { VirtualizedMobileList } from "@/components/table/VirtualizedMobileList";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { useDebounce } from "@/hooks/useDebounce";
import { useServerPagination } from "@/hooks/useServerPagination";
import { useDuplicateInvoice } from "@/hooks/useDuplicateInvoice";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type InvoiceWithCustomer = Invoice & { customers: { name: string } | null };

const PAGE_SIZE = 25;

const paymentStatusLabels: Record<string, string> = {
  pending: "غير مدفوع",
  partial: "جزئي",
  paid: "مدفوع",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-destructive/10 text-destructive",
  partial: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
};

const approvalStatusLabels: Record<string, string> = {
  draft: "مسودة",
  pending: "في انتظار الموافقة",
  approved: "معتمدة",
  rejected: "مرفوضة",
};

const approvalStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const approvalStatusIcons: Record<string, React.ElementType> = {
  draft: Clock,
  pending: Send,
  approved: CheckCircle,
  rejected: XCircle,
};

const InvoicesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [prefillCustomerId, setPrefillCustomerId] = useState<string | undefined>(undefined);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null);
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { duplicate, isDuplicating } = useDuplicateInvoice();

  const canEdit = userRole === 'admin' || userRole === 'sales' || userRole === 'accountant';
  const canDelete = userRole === 'admin';

  // Handle action parameter from URL (FAB/QuickActions)
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Handle prefill from navigation state (e.g. from CustomerDetailsPage)
  useEffect(() => {
    const state = location.state as { prefillCustomerId?: string } | null;
    if (state?.prefillCustomerId) {
      setPrefillCustomerId(state.prefillCustomerId);
      setSelectedInvoice(null);
      setDialogOpen(true);
      // Clear state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Server-side count query
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['invoices-count', debouncedSearch],
    queryFn: async () => {
      let query = supabase.from('invoices').select('*', { count: 'exact', head: true });
      if (debouncedSearch) {
        query = query.or(`invoice_number.ilike.%${debouncedSearch}%`);
      }
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  const pagination = useServerPagination({ pageSize: PAGE_SIZE, totalCount });

  // Reset page when search changes
  useEffect(() => {
    pagination.resetPage();
  }, [debouncedSearch]);

  // Server-side paginated data query
  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ['invoices', debouncedSearch, pagination.currentPage],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })
        .range(pagination.range.from, pagination.range.to);

      if (debouncedSearch) {
        query = query.or(`invoice_number.ilike.%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Stats query (separate, lightweight)
  const { data: stats } = useQuery({
    queryKey: ['invoices-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('total_amount, paid_amount, payment_status');
      if (error) throw error;
      const all = data || [];
      return {
        total: all.length,
        unpaid: all.filter((i) => i.payment_status === 'pending').length,
        totalValue: all.reduce((sum, i) => sum + Number(i.total_amount), 0),
        unpaidValue: all
          .filter((i) => i.payment_status !== 'paid')
          .reduce((sum, i) => sum + (Number(i.total_amount) - Number(i.paid_amount || 0)), 0),
      };
    },
    staleTime: 30000,
  });

  const invoiceStats = stats || { total: 0, unpaid: 0, totalValue: 0, unpaidValue: 0 };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('invoice_items').delete().eq('invoice_id', id);
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-count'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-stats'] });
      toast({ title: "تم حذف الفاتورة بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في حذف الفاتورة", variant: "destructive" });
    },
  });

  const { filteredData, filters, setFilter } = useTableFilter(invoices);
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredData);

  const handleEdit = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setSelectedInvoice(null);
    setDialogOpen(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const statItems = useMemo(() => [
    { label: 'إجمالي الفواتير', value: invoiceStats.total, icon: Receipt, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'غير مدفوعة', value: invoiceStats.unpaid, icon: Receipt, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { label: 'إجمالي المبيعات', value: `${invoiceStats.totalValue.toLocaleString()}`, icon: CreditCard, color: 'text-success', bgColor: 'bg-success/10' },
    { label: 'مستحق التحصيل', value: `${invoiceStats.unpaidValue.toLocaleString()}`, icon: CreditCard, color: 'text-warning', bgColor: 'bg-warning/10' },
  ], [invoiceStats]);

  // Memoized mobile item renderer
  const renderMobileInvoiceItem = useCallback((invoice: InvoiceWithCustomer) => {
    const remaining = Number(invoice.total_amount) - Number(invoice.paid_amount || 0);
    return (
      <DataCard
        title={invoice.invoice_number}
        subtitle={invoice.customers?.name || 'بدون عميل'}
        badge={{
          text: paymentStatusLabels[invoice.payment_status],
          variant: invoice.payment_status === 'paid' ? 'default' : invoice.payment_status === 'partial' ? 'secondary' : 'destructive',
        }}
        icon={<Receipt className="h-5 w-5" />}
        fields={[
          { label: 'الإجمالي', value: `${Number(invoice.total_amount).toLocaleString()} ج.م` },
          { label: 'المتبقي', value: `${remaining.toLocaleString()} ج.م`, icon: remaining > 0 ? <CreditCard className="h-4 w-4" /> : undefined },
          { label: 'التاريخ', value: new Date(invoice.created_at).toLocaleDateString('ar-EG'), icon: <Calendar className="h-4 w-4" /> },
        ]}
        onClick={() => navigate(`/invoices/${invoice.id}`)}
        onView={() => navigate(`/invoices/${invoice.id}`)}
        onEdit={canEdit ? () => handleEdit(invoice) : undefined}
        onDelete={canDelete ? () => deleteMutation.mutate(invoice.id) : undefined}
      />
    );
  }, [navigate, canEdit, canDelete, handleEdit, deleteMutation]);

  // Mobile View
  const renderMobileView = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <MobileStatSkeleton count={4} />
          <MobileListSkeleton count={5} variant="invoice" />
        </div>
      );
    }

    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-4">
          {/* Mobile Stats */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {statItems.map((stat, i) => (
              <Card key={i} className="min-w-[140px] shrink-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم الفاتورة أو اسم العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Invoices List */}
          {sortedData.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="لا توجد فواتير"
              description="ابدأ بإضافة فاتورة جديدة"
              action={{
                label: "فاتورة جديدة",
                onClick: handleAdd,
                icon: Plus,
              }}
            />
          ) : (
            <>
              <VirtualizedMobileList
                data={sortedData as InvoiceWithCustomer[]}
                renderItem={renderMobileInvoiceItem}
                getItemKey={(invoice) => invoice.id}
                itemHeight={160}
              />
              <ServerPagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalCount={totalCount}
                pageSize={PAGE_SIZE}
                onPageChange={pagination.goToPage}
                hasNextPage={pagination.hasNextPage}
                hasPrevPage={pagination.hasPrevPage}
              />
            </>
          )}
        </div>
      </PullToRefresh>
    );
  };

  // Desktop View
  const renderTableView = () => {
    if (isLoading) {
      return <TableSkeleton rows={5} columns={8} />;
    }

    if (sortedData.length === 0) {
      return (
        <EmptyState
          icon={Receipt}
          title="لا توجد فواتير"
          description="ابدأ بإضافة فاتورة جديدة"
          action={{
            label: "فاتورة جديدة",
            onClick: handleAdd,
            icon: Plus,
          }}
        />
      );
    }

    return (
      <>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <DataTableHeader
                  label="رقم الفاتورة"
                  sortKey="invoice_number"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />
                <DataTableHeader label="العميل" />
                <DataTableHeader
                  label="التاريخ"
                  sortKey="created_at"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />
                <DataTableHeader
                  label="الإجمالي"
                  sortKey="total_amount"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />
                <DataTableHeader label="المدفوع" />
                <DataTableHeader label="المتبقي" />
                <DataTableHeader
                  label="حالة الدفع"
                  filterKey="payment_status"
                  filterType="select"
                  filterOptions={[
                    { value: 'pending', label: 'غير مدفوع' },
                    { value: 'partial', label: 'جزئي' },
                    { value: 'paid', label: 'مدفوع' },
                  ]}
                  filterValue={filters.payment_status as string}
                  onFilter={setFilter}
                />
                <DataTableHeader
                  label="حالة الاعتماد"
                  filterKey="approval_status"
                  filterType="select"
                  filterOptions={[
                    { value: 'draft', label: 'مسودة' },
                    { value: 'pending', label: 'في انتظار الموافقة' },
                    { value: 'approved', label: 'معتمدة' },
                    { value: 'rejected', label: 'مرفوضة' },
                  ]}
                  filterValue={filters.approval_status as string}
                  onFilter={setFilter}
                />
                <DataTableHeader label="إجراءات" className="text-left" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((invoice) => {
                const remaining = Number(invoice.total_amount) - Number(invoice.paid_amount || 0);
                return (
                  <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                    <TableCell>
                      <EntityLink type="invoice" id={invoice.id}>
                        {invoice.invoice_number}
                      </EntityLink>
                    </TableCell>
                    <TableCell>
                      {invoice.customers?.name ? (
                        <EntityLink type="customer" id={invoice.customer_id}>
                          {invoice.customers.name}
                        </EntityLink>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.created_at).toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell>
                      <span className="font-bold">
                        {Number(invoice.total_amount).toLocaleString()} ج.م
                      </span>
                    </TableCell>
                    <TableCell className="text-success">
                      {Number(invoice.paid_amount || 0).toLocaleString()} ج.م
                    </TableCell>
                    <TableCell className={remaining > 0 ? 'text-destructive' : ''}>
                      {remaining.toLocaleString()} ج.م
                    </TableCell>
                    <TableCell>
                      <Badge className={paymentStatusColors[invoice.payment_status]}>
                        {paymentStatusLabels[invoice.payment_status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const status = invoice.approval_status || 'draft';
                        const StatusIcon = approvalStatusIcons[status];
                        return (
                          <Badge className={`${approvalStatusColors[status]} gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {approvalStatusLabels[status]}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setPrintInvoiceId(invoice.id); setPrintDialogOpen(true); }}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => duplicate(invoice.id)} disabled={isDuplicating}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>نسخ الفاتورة</TooltipContent>
                        </Tooltip>
                        <DataTableActions
                          onEdit={() => handleEdit(invoice)}
                          onDelete={() => deleteMutation.mutate(invoice.id)}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          deleteDescription="سيتم حذف هذه الفاتورة وجميع بنودها نهائياً."
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <ServerPagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={pagination.goToPage}
          hasNextPage={pagination.hasNextPage}
          hasPrevPage={pagination.hasPrevPage}
        />
      </>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الفواتير</h1>
          <p className="text-muted-foreground">إدارة فواتير المبيعات</p>
        </div>
        <div className="flex gap-2">
          {!isMobile && (
            <ExportWithTemplateButton
              section="invoices"
              sectionLabel="الفواتير"
              data={sortedData}
              columns={[
                { key: 'invoice_number', label: 'رقم الفاتورة' },
                { key: 'customers.name', label: 'العميل' },
                { key: 'total_amount', label: 'الإجمالي' },
                { key: 'paid_amount', label: 'المدفوع' },
                { key: 'payment_status', label: 'حالة الدفع' },
                { key: 'created_at', label: 'التاريخ' },
              ]}
            />
          )}
          <Button onClick={handleAdd} size={isMobile ? "sm" : "default"}>
            <Plus className="h-4 w-4 ml-2" />
            {isMobile ? "جديد" : "فاتورة جديدة"}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isMobile ? renderMobileView() : (
        <>
          {/* Desktop Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statItems.map((stat, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الفاتورة أو اسم العميل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>قائمة الفواتير</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTableView()}
            </CardContent>
          </Card>
        </>
      )}

      <InvoiceFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setPrefillCustomerId(undefined);
        }}
        invoice={selectedInvoice}
        prefillCustomerId={prefillCustomerId}
      />

      {printInvoiceId && (
        <InvoicePrintView
          invoiceId={printInvoiceId}
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
        />
      )}
    </div>
  );
};

export default InvoicesPage;
