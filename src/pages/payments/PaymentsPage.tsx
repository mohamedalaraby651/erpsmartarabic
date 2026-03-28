import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
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
import { Plus, Search, Wallet, CreditCard, Banknote, Calendar } from "lucide-react";
import { EntityLink } from "@/components/shared/EntityLink";
import PaymentFormDialog from "@/components/payments/PaymentFormDialog";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import { logErrorSafely } from "@/lib/errorHandler";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Database } from "@/integrations/supabase/types";

type PaymentWithRelations = Database['public']['Tables']['payments']['Row'] & {
  customers: { name: string } | null;
  invoices: { invoice_number: string } | null;
};

const paymentMethodLabels: Record<string, string> = {
  cash: "نقدي",
  bank_transfer: "تحويل بنكي",
  credit: "آجل",
  advance_payment: "دفعة مقدمة",
  installment: "تقسيط",
};

const PaymentsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const { data: payments = [], isLoading, refetch } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, customers(name), invoices(invoice_number)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { deletePayment } = await import('@/lib/services/paymentService');
      await deletePayment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: "تم حذف الدفعة بنجاح" });
    },
    onError: (error) => {
      if (error.message === 'UNAUTHORIZED') {
        toast({ title: "غير مصرح", description: "ليس لديك صلاحية حذف المدفوعات", variant: "destructive" });
      } else {
        toast({ title: "خطأ في حذف الدفعة", variant: "destructive" });
      }
      logErrorSafely('PaymentsPage.delete', error);
    },
  });

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
  const renderPaymentCard = (payment: PaymentWithRelations) => (
    <DataCard
      key={payment.id}
      title={payment.customers?.name || "عميل غير معروف"}
      subtitle={`#${payment.payment_number}`}
      icon={<Wallet className="h-5 w-5" />}
      badge={{ text: paymentMethodLabels[payment.payment_method] || payment.payment_method, variant: "outline" }}
      fields={[
        { label: "المبلغ", value: <span className="font-bold text-success">{Number(payment.amount).toLocaleString()} ج.م</span> },
        { label: "التاريخ", value: new Date(payment.payment_date).toLocaleDateString('ar-EG'), icon: <Calendar className="h-3 w-3" /> },
        payment.invoices?.invoice_number && { label: "الفاتورة", value: payment.invoices.invoice_number },
      ].filter(Boolean) as any[]}
      onDelete={canDelete ? () => deleteMutation.mutate(payment.id) : undefined}
    />
  );

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
                <p className="text-2xl font-bold">{stats.totalAmount.toLocaleString()}</p>
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
                    <p className="text-2xl font-bold">{stats.cash.toLocaleString()}</p>
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
                    <p className="text-2xl font-bold">{stats.bank.toLocaleString()}</p>
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
      ) : sortedData.length === 0 ? (
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
          <CardHeader>
            <CardTitle>سجل المدفوعات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <DataTableHeader
                      label="رقم الدفعة"
                      sortKey="payment_number"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    />
                    <DataTableHeader label="العميل" />
                    <DataTableHeader label="الفاتورة" />
                    <DataTableHeader
                      label="التاريخ"
                      sortKey="payment_date"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    />
                    <DataTableHeader
                      label="المبلغ"
                      sortKey="amount"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    />
                    <DataTableHeader
                      label="طريقة الدفع"
                      filterKey="payment_method"
                      filterType="select"
                      filterOptions={[
                        { value: 'cash', label: 'نقدي' },
                        { value: 'bank_transfer', label: 'تحويل بنكي' },
                        { value: 'credit', label: 'آجل' },
                      ]}
                      filterValue={filters.payment_method as string}
                      onFilter={setFilter}
                    />
                    <DataTableHeader label="المرجع" />
                    <DataTableHeader label="إجراءات" className="text-left" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sortedData as PaymentWithRelations[]).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {payment.payment_number}
                        </code>
                      </TableCell>
                      <TableCell>
                        {payment.customers?.name ? (
                          <EntityLink type="customer" id={payment.customer_id}>
                            {payment.customers.name}
                          </EntityLink>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {payment.invoices?.invoice_number ? (
                          <EntityLink type="invoice" id={payment.invoice_id}>
                            {payment.invoices.invoice_number}
                          </EntityLink>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-success">
                          {Number(payment.amount).toLocaleString()} ج.م
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.reference_number || '-'}</TableCell>
                      <TableCell>
                        <DataTableActions
                          onDelete={() => deleteMutation.mutate(payment.id)}
                          canEdit={false}
                          canDelete={canDelete}
                          deleteDescription="سيتم حذف هذه الدفعة نهائياً."
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <PaymentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
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
