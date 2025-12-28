import { useState } from "react";
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
import { Plus, Search, Receipt, Printer } from "lucide-react";
import InvoiceFormDialog from "@/components/invoices/InvoiceFormDialog";
import { InvoicePrintView } from "@/components/print/InvoicePrintView";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null);
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canEdit = userRole === 'admin' || userRole === 'sales' || userRole === 'accountant';
  const canDelete = userRole === 'admin';

  const { data: invoices = [], isLoading } = useQuery({
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

  const handlePrint = (invoiceId: string) => {
    setPrintInvoiceId(invoiceId);
    setPrintDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الفواتير</h1>
          <p className="text-muted-foreground">إدارة فواتير المبيعات</p>
        </div>
        <div className="flex gap-2">
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
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 ml-2" />
            فاتورة جديدة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">إجمالي الفواتير</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Receipt className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unpaid}</p>
                <p className="text-sm text-muted-foreground">غير مدفوعة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Receipt className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalValue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">إجمالي المبيعات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Receipt className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unpaidValue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">مستحق التحصيل</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>قائمة الفواتير</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : sortedData.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد فواتير</p>
              <Button variant="link" onClick={handleAdd}>إضافة فاتورة جديدة</Button>
            </div>
          ) : (
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
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {invoice.invoice_number}
                          </code>
                        </TableCell>
                        <TableCell>{invoice.customers?.name || '-'}</TableCell>
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
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handlePrint(invoice.id)}>
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
          )}
        </CardContent>
      </Card>

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