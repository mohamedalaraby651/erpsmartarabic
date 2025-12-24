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
import { Plus, Search, Wallet, CreditCard, Banknote } from "lucide-react";
import PaymentFormDialog from "@/components/payments/PaymentFormDialog";

const paymentMethodLabels: Record<string, string> = {
  cash: "نقدي",
  bank_transfer: "تحويل بنكي",
  credit: "آجل",
  advance_payment: "دفعة مقدمة",
  installment: "تقسيط",
};

const PaymentsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', searchQuery, methodFilter],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*, customers(name), invoices(invoice_number)')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('payment_number', `%${searchQuery}%`);
      }
      if (methodFilter !== 'all') {
        query = query.eq('payment_method', methodFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const stats = {
    total: payments.length,
    totalAmount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    cash: payments.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + Number(p.amount), 0),
    bank: payments.filter(p => p.payment_method === 'bank_transfer').reduce((sum, p) => sum + Number(p.amount), 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">التحصيل</h1>
          <p className="text-muted-foreground">سجل مدفوعات العملاء</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 ml-2" />
          تسجيل دفعة
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <p className="text-sm text-muted-foreground">إجمالي المبلغ (ج.م)</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
                <p className="text-sm text-muted-foreground">تحويل بنكي (ج.م)</p>
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
                placeholder="بحث برقم الدفعة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="طريقة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="cash">نقدي</SelectItem>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                <SelectItem value="credit">آجل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل المدفوعات</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد مدفوعات</p>
              <Button variant="link" onClick={() => setDialogOpen(true)}>تسجيل دفعة جديدة</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الدفعة</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>الفاتورة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>طريقة الدفع</TableHead>
                    <TableHead>المرجع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {payment.payment_number}
                        </code>
                      </TableCell>
                      <TableCell>{payment.customers?.name || '-'}</TableCell>
                      <TableCell>{payment.invoices?.invoice_number || '-'}</TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};

export default PaymentsPage;
