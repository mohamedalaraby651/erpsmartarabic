import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "@/lib/router-compat";
import { useServerPagination } from "@/hooks/useServerPagination";
import { useDebounce } from "@/hooks/useDebounce";
import { LoadMoreFooter } from "@/components/ui/data/LoadMoreFooter";
import { WorkspaceTable, type WorkspaceColumn } from "@/components/table/WorkspaceTable";
import { TableViewOptions } from "@/components/table/TableViewOptions";
import { useTableLayout } from "@/hooks/useTableLayout";
import { MobileExpandableCard } from "@/components/ui/data/MobileExpandableCard";
import { Amount, KpiAmount } from "@/components/shared/amount/Amount";
import { ListErrorState } from "@/components/shared/ListErrorState";
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
import { Plus, Search, Wallet, CreditCard, Banknote, Calendar, ArrowLeftRight } from "lucide-react";
import { EntityLink } from "@/components/shared/EntityLink";
import PaymentFormDialog from "@/components/payments/PaymentFormDialog";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { logErrorSafely } from "@/lib/errorHandler";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { EmptyState } from "@/components/shared/EmptyState";
import MultiInvoiceSettlement from "@/components/payments/MultiInvoiceSettlement";
import {
  usePaymentsList,
  usePaymentsCount,
  useDeletePayment,
} from "@/hooks/usePayments";
import type { PaymentWithRelations } from "@/lib/repositories/paymentRepository";

const paymentMethodLabels: Record<string, string> = {
  cash: "نقدي",
  bank_transfer: "تحويل بنكي",
  credit: "آجل",
  advance_payment: "دفعة مقدمة",
  installment: "تقسيط",
};

const PAGE_SIZE = 25;
const COLUMN_KEYS = ['payment_number', 'customer', 'invoice', 'date', 'amount', 'method', 'reference', 'actions'];

const PaymentsPage = () => {
  const layout = useTableLayout('payments', COLUMN_KEYS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { userRole } = useAuth();

  // Listen for URL action parameter to open dialog
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const canEdit = userRole === 'admin' || userRole === 'accountant';
  const canDelete = userRole === 'admin';

  const paymentFilters = { search: debouncedSearch };

  // Count
  const { data: totalCount = 0 } = usePaymentsCount(paymentFilters);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [debouncedSearch]);

  const {
    data: listResult,
    isLoading,
    isFetching,
    error,
    refetch,
  } = usePaymentsList(paymentFilters, 1, visibleCount);
  const payments = listResult?.data ?? [];

  const deleteMutation = useDeletePayment();

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast({ title: "تم حذف الدفعة بنجاح" });
        },
        onError: (error: Error) => {
          if (error.message === "UNAUTHORIZED") {
            toast({
              title: "غير مصرح",
              description: "ليس لديك صلاحية حذف المدفوعات",
              variant: "destructive",
            });
          } else {
            toast({ title: "خطأ في حذف الدفعة", variant: "destructive" });
          }
          logErrorSafely("PaymentsPage.delete", error);
        },
      });
    },
    [deleteMutation, toast],
  );

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);


  // Filter by search
  const searchFiltered = (payments as PaymentWithRelations[]).filter((p) =>
    p.payment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { filteredData, filters, setFilter } = useTableFilter(searchFiltered);
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredData);

  const stats = {
    total: payments.length,
    totalAmount: (payments as PaymentWithRelations[]).reduce((sum: number, p) => sum + Number(p.amount), 0),
    cash: (payments as PaymentWithRelations[]).filter((p) => p.payment_method === 'cash').reduce((sum: number, p) => sum + Number(p.amount), 0),
    bank: (payments as PaymentWithRelations[]).filter((p) => p.payment_method === 'bank_transfer').reduce((sum: number, p) => sum + Number(p.amount), 0),
  };

  // Mobile Payment Card
  const actions = (payment: PaymentWithRelations) => <DataTableActions onDelete={() => handleDelete(payment.id)} canEdit={false} canDelete={canDelete} deleteDescription="سيتم تطبيق قواعد إلغاء الدفعة المعتمدة." />;
  const renderPaymentCard = (payment: PaymentWithRelations) => <MobileExpandableCard
    key={payment.id}
    title={payment.customers?.name ? <EntityLink type="customer" id={payment.customer_id}>{payment.customers.name}</EntityLink> : payment.payment_number}
    amount={<Amount value={Number(payment.amount)} />}
    status={<Badge variant="outline">{paymentMethodLabels[payment.payment_method] || payment.payment_method}</Badge>}
    details={[{ label: 'رقم الدفعة', value: payment.payment_number }, { label: 'التاريخ', value: new Date(payment.payment_date).toLocaleDateString('ar-EG') }, { label: 'الفاتورة', value: payment.invoices?.invoice_number || '-' }, { label: 'المرجع', value: payment.reference_number || '-' }]}
    actions={actions(payment)}
  />;
  const columns: WorkspaceColumn<PaymentWithRelations>[] = [
    { key: 'payment_number', onSort: () => requestSort('payment_number'), sortDirection: sortConfig.key === 'payment_number' ? sortConfig.direction : null, label: 'رقم الدفعة', render: p => p.payment_number },
    { key: 'customer', label: 'العميل', render: p => p.customers?.name ? <EntityLink type="customer" id={p.customer_id}>{p.customers.name}</EntityLink> : '-' },
    { key: 'invoice', label: 'الفاتورة', render: p => p.invoices?.invoice_number ? <EntityLink type="invoice" id={p.invoice_id}>{p.invoices.invoice_number}</EntityLink> : '-' },
    { key: 'date', onSort: () => requestSort('payment_date'), sortDirection: sortConfig.key === 'payment_date' ? sortConfig.direction : null, label: 'التاريخ', render: p => new Date(p.payment_date).toLocaleDateString('ar-EG') },
    { key: 'amount', onSort: () => requestSort('amount'), sortDirection: sortConfig.key === 'amount' ? sortConfig.direction : null, label: 'المبلغ', render: p => <Amount value={Number(p.amount)} /> },
    { key: 'method', label: 'طريقة الدفع', render: p => <Badge variant="outline">{paymentMethodLabels[p.payment_method] || p.payment_method}</Badge> },
    { key: 'reference', label: 'المرجع', render: p => p.reference_number || '-' },
    { key: 'actions', label: 'إجراءات', render: actions },
  ];

  const pageContent = (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">التحصيل</h1>
          <p className="text-muted-foreground">سجل مدفوعات العملاء</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {!isMobile && (
            <ExportWithTemplateButton
              section="payments"
              sectionLabel="المدفوعات"
              data={sortedData}
              columns={[
                { key: 'payment_number', label: 'رقم الدفعة' },
                { key: 'customers.name', label: 'العميل' },
                { key: 'invoices.invoice_number', label: 'الفاتورة' },
                { key: 'amount', label: 'المبلغ' },
                { key: 'payment_method', label: 'طريقة الدفع' },
                { key: 'payment_date', label: 'التاريخ' },
              ]}
            />
          )}
          <Button variant="outline" onClick={() => setSettlementOpen(true)} className="flex-1 sm:flex-none">
            <ArrowLeftRight className="h-4 w-4 ml-2" />
            تسوية فواتير
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 ml-2" />
            تسجيل دفعة
          </Button>
        </div>
      </div>

      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">إجمالي المدفوعات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Wallet className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-bold"><KpiAmount value={stats.totalAmount} /></p>
                <p className="text-sm text-muted-foreground">إجمالي المبلغ</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {!isMobile && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <Banknote className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-xl font-bold"><KpiAmount value={stats.cash} /></p>
                    <p className="text-sm text-muted-foreground">نقدي (ج.م)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <CreditCard className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xl font-bold"><KpiAmount value={stats.bank} /></p>
                    <p className="text-sm text-muted-foreground">تحويل بنكي</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم الدفعة أو اسم العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        isMobile ? (
          <MobileListSkeleton count={5} />
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </CardContent>
          </Card>
        )
      ) : error ? <ListErrorState error={error} onRetry={() => refetch()} /> : sortedData.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="لا توجد مدفوعات"
          description="ابدأ بتسجيل دفعة جديدة"
          action={{
            label: "تسجيل دفعة",
            onClick: () => setDialogOpen(true)
          }}
        />
      ) : isMobile ? (
        <div className="space-y-3">
          {sortedData.map(renderPaymentCard)}
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>سجل المدفوعات</CardTitle>
            <TableViewOptions layout={layout} columns={columns} />
          </CardHeader>
          <CardContent><WorkspaceTable rows={sortedData as PaymentWithRelations[]} columns={columns} layout={layout} /></CardContent>
        </Card>
      )}

      <LoadMoreFooter shown={payments.length} total={totalCount} hasMore={payments.length < totalCount} loading={isFetching} onLoadMore={() => setVisibleCount(count => count + PAGE_SIZE)} />

      <PaymentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <MultiInvoiceSettlement
        open={settlementOpen}
        onOpenChange={setSettlementOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['payments'] });
        }}
      />
    </div>
  );

  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        {pageContent}
      </PullToRefresh>
    );
  }

  return pageContent;
};

export default PaymentsPage;
