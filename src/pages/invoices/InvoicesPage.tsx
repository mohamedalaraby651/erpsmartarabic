import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Receipt, Edit, Printer, Download } from "lucide-react";
import InvoiceFormDialog from "@/components/invoices/InvoiceFormDialog";
import { InvoicePrintView } from "@/components/print/InvoicePrintView";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
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
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', searchQuery, paymentStatusFilter],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*, customers(name)')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('invoice_number', `%${searchQuery}%`);
      }
      if (paymentStatusFilter !== 'all') {
        query = query.eq('payment_status', paymentStatusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const stats = {
    total: invoices.length,
    unpaid: invoices.filter(i => i.payment_status === 'pending').length,
    totalValue: invoices.reduce((sum, i) => sum + Number(i.total_amount), 0),
    unpaidValue: invoices
      .filter(i => i.payment_status !== 'paid')
      .reduce((sum, i) => sum + (Number(i.total_amount) - Number(i.paid_amount || 0)), 0),
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
            data={invoices}
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الفاتورة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="حالة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="pending">غير مدفوع</SelectItem>
                <SelectItem value="partial">جزئي</SelectItem>
                <SelectItem value="paid">مدفوع</SelectItem>
              </SelectContent>
            </Select>
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
          ) : invoices.length === 0 ? (
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
                    <TableHead>رقم الفاتورة</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>المدفوع</TableHead>
                    <TableHead>المتبقي</TableHead>
                    <TableHead>حالة الدفع</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice: any) => {
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
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(invoice)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handlePrint(invoice.id)}>
                              <Printer className="h-4 w-4" />
                            </Button>
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
