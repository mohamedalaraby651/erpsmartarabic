import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Plus, Search, Receipt, Printer, Eye, Calendar, CreditCard } from "lucide-react";
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
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];

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

const InvoicesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null);
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('invoice_items').delete().eq('invoice_id', id);
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: "تم حذف الفاتورة بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في حذف الفاتورة", variant: "destructive" });
    },
  });

  // Filter by search
  const searchFiltered = invoices.filter((inv: any) =>
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { filteredData, filters, setFilter } = useTableFilter(searchFiltered);
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredData);

  const stats = {
    total: invoices.length,
    unpaid: invoices.filter((i: any) => i.payment_status === 'pending').length,
    totalValue: invoices.reduce((sum: number, i: any) => sum + Number(i.total_amount), 0),
    unpaidValue: invoices
      .filter((i: any) => i.payment_status !== 'paid')
      .reduce((sum: number, i: any) => sum + (Number(i.total_amount) - Number(i.paid_amount || 0)), 0),
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedInvoice(null);
    setDialogOpen(true);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const statItems = [
    { label: 'إجمالي الفواتير', value: stats.total, icon: Receipt, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'غير مدفوعة', value: stats.unpaid, icon: Receipt, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { label: 'إجمالي المبيعات', value: `${stats.totalValue.toLocaleString()}`, icon: CreditCard, color: 'text-success', bgColor: 'bg-success/10' },
    { label: 'مستحق التحصيل', value: `${stats.unpaidValue.toLocaleString()}`, icon: CreditCard, color: 'text-warning', bgColor: 'bg-warning/10' },
  ];

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
            <div className="space-y-3">
              {sortedData.map((invoice: any) => {
                const remaining = Number(invoice.total_amount) - Number(invoice.paid_amount || 0);
                return (
                  <DataCard
                    key={invoice.id}
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
              })}
            </div>
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
              <DataTableHeader label="إجراءات" className="text-left" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((invoice: any) => {
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
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setPrintInvoiceId(invoice.id); setPrintDialogOpen(true); }}>
                        <Printer className="h-4 w-4" />
                      </Button>
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
        onOpenChange={setDialogOpen}
        invoice={selectedInvoice}
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
