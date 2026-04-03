import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ServerPagination } from "@/components/shared/ServerPagination";

interface PaymentRow {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string | null;
  notes?: string | null;
}

interface SupplierPaymentsTabProps {
  supplierId: string;
  onAddPayment: () => void;
  // Server-side pagination props (optional for backward compat)
  payments?: PaymentRow[];
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'نقدي',
  bank_transfer: 'تحويل بنكي',
  credit: 'آجل',
  installment: 'تقسيط',
  advance_payment: 'دفعة مقدمة',
};

const SupplierPaymentsTab = ({
  supplierId,
  onAddPayment,
  payments,
  totalCount = 0,
  currentPage = 1,
  pageSize = 20,
  onPageChange,
  isLoading,
}: SupplierPaymentsTabProps) => {
  const totalPayments = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">سجل المدفوعات</CardTitle>
          {totalCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              إجمالي السجلات: <span className="font-bold">{totalCount}</span>
            </p>
          )}
        </div>
        <Button onClick={onAddPayment} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          تسجيل دفعة
        </Button>
      </CardHeader>
      <CardContent>
        {payments && payments.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الدفعة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>المرجع</TableHead>
                  <TableHead>ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">
                      {payment.payment_number}
                    </TableCell>
                    <TableCell>
                      {format(new Date(payment.payment_date), "d MMM yyyy", { locale: ar })}
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {Number(payment.amount).toLocaleString()} ج.م
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.reference_number || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {payment.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {onPageChange && totalPages > 1 && (
              <div className="mt-4">
                <ServerPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  pageSize={pageSize}
                  onPageChange={onPageChange}
                  hasNextPage={currentPage < totalPages}
                  hasPrevPage={currentPage > 1}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد مدفوعات مسجلة</p>
            <Button onClick={onAddPayment} variant="outline" size="sm" className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              تسجيل أول دفعة
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SupplierPaymentsTab;
