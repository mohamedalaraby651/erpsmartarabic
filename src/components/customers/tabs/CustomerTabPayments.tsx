import React, { memo, useState, lazy, Suspense, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, ChevronLeft, ChevronRight, Wallet, Banknote } from "lucide-react";
import { EntityLink } from "@/components/shared/EntityLink";
import type { Database } from "@/integrations/supabase/types";

const PaymentFormDialog = lazy(() => import("@/components/payments/PaymentFormDialog"));

type Payment = Database['public']['Tables']['payments']['Row'];
type PaymentWithInvoice = Payment & { invoices: { invoice_number: string } | null };

const PAGE_SIZE = 20;

const methodLabels: Record<string, string> = {
  cash: 'نقدي',
  bank_transfer: 'تحويل بنكي',
  credit: 'آجل',
  check: 'شيك',
};

const methodColors: Record<string, string> = {
  cash: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  bank_transfer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  credit: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  check: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

export const CustomerTabPayments = memo(function CustomerTabPayments({
  payments,
  customerId,
}: {
  payments: PaymentWithInvoice[];
  customerId: string;
}) {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const totalPages = Math.ceil(payments.length / PAGE_SIZE);
  const paged = payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalAmount = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.amount), 0),
    [payments]
  );

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <CardTitle>المدفوعات</CardTitle>
          <CardDescription>سجل مدفوعات العميل ({payments.length})</CardDescription>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 ml-2" />تسجيل دفعة
        </Button>
      </CardHeader>

      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">لا توجد مدفوعات لهذا العميل</p>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <CreditCard className="h-4 w-4 ml-2" />تسجيل أول دفعة
            </Button>
          </div>
        ) : (
          <>
            {/* Summary Bar */}
            <div className="grid grid-cols-2 gap-2 p-3 mb-4 rounded-lg bg-muted/50 border text-sm">
              <div className="flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-muted-foreground">الإجمالي:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {totalAmount.toLocaleString()} ج.م
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">العدد:</span>
                <span className="font-bold">{payments.length} دفعة</span>
              </div>
            </div>

            {/* Payment List */}
            <div className="space-y-2">
              {paged.map((payment) => (
                <div
                  key={payment.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{payment.payment_number}</span>
                      <Badge className={methodColors[payment.payment_method] || methodColors.cash} variant="secondary">
                        {methodLabels[payment.payment_method] || payment.payment_method}
                      </Badge>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {Number(payment.amount).toLocaleString()} ج.م
                    </span>
                  </div>

                  <div className="flex items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <span>{new Date(payment.payment_date).toLocaleDateString('ar-EG')}</span>
                    {payment.invoice_id && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          فاتورة: <EntityLink type="invoice" id={payment.invoice_id}>
                            {payment.invoices?.invoice_number || payment.invoice_id.slice(0, 8)}
                          </EntityLink>
                        </span>
                      </>
                    )}
                    {payment.reference_number && (
                      <>
                        <span>•</span>
                        <span>مرجع: {payment.reference_number}</span>
                      </>
                    )}
                    {payment.notes && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[200px]">{payment.notes}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="min-h-11 min-w-11" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="min-h-11 min-w-11" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Suspense fallback={null}>
        <PaymentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} prefillCustomerId={customerId} />
      </Suspense>
    </Card>
  );
});
