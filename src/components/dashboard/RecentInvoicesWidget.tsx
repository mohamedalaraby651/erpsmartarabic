import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Receipt } from 'lucide-react';
import { InvoiceQuickActions } from './InvoiceQuickActions';

interface InvoiceWithCustomer {
  id: string;
  invoice_number: string;
  total_amount: number;
  amount_paid: number | null;
  payment_status: string;
  due_date: string | null;
  created_at: string;
  customer_id: string;
  customers: { name: string } | null;
}

interface RecentInvoicesWidgetProps {
  invoices: InvoiceWithCustomer[] | undefined;
}

export const RecentInvoicesWidget = memo(function RecentInvoicesWidget({ invoices }: RecentInvoicesWidgetProps) {
  const navigate = useNavigate();

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between px-3 pt-2.5 pb-1.5 sm:px-6 sm:pt-6">
        <div className="min-w-0">
          <CardTitle className="text-[13px] sm:text-lg">آخر الفواتير</CardTitle>
          <CardDescription className="text-[10px] sm:text-sm leading-tight">أحدث الفواتير المصدرة</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-[11px] sm:h-8 sm:text-xs shrink-0 px-2" onClick={() => navigate('/invoices')}>
          عرض الكل
          <ArrowLeft className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 min-h-[180px]">
        {invoices === undefined ? (
          <div className="space-y-1.5" aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 animate-pulse h-[46px]" />
            ))}
          </div>
        ) : invoices.length > 0 ? (
          <div className="space-y-1.5 animate-fade-in">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between gap-1.5 px-2 py-1.5 sm:p-3 rounded-lg bg-muted/50 md:hover:bg-muted transition-colors min-h-[44px]"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-right active:scale-[0.99] transition-transform"
                >
                  <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="font-medium text-[12.5px] sm:text-sm truncate leading-tight">
                      {invoice.customers?.name || 'عميل'}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate leading-tight">
                      {invoice.invoice_number}
                    </p>
                  </div>
                </button>

                <div className="flex flex-col items-end shrink-0 min-w-0">
                  <p className="font-bold text-[12.5px] sm:text-sm tabular-nums truncate leading-tight">
                    {invoice.total_amount.toLocaleString()} ج.م
                  </p>
                  <Badge
                    variant={
                      invoice.payment_status === 'paid' ? 'default' :
                      invoice.payment_status === 'partial' ? 'secondary' : 'destructive'
                    }
                    className="text-[9px] sm:text-xs mt-0.5 px-1.5 py-0 h-4 sm:h-5"
                  >
                    {invoice.payment_status === 'paid' ? 'مدفوع' :
                     invoice.payment_status === 'partial' ? 'جزئي' : 'معلق'}
                  </Badge>
                </div>

                <InvoiceQuickActions
                  invoiceId={invoice.id}
                  invoiceNumber={invoice.invoice_number}
                  customerId={invoice.customer_id}
                  customerName={invoice.customers?.name || 'عميل'}
                  totalAmount={invoice.total_amount}
                  amountPaid={invoice.amount_paid || 0}
                  paymentStatus={invoice.payment_status}
                  dueDate={invoice.due_date}
                  createdAt={invoice.created_at}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 px-4">
            <Receipt className="h-9 w-9 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium mb-1">لا توجد فواتير بعد</p>
            <p className="text-xs text-muted-foreground mb-3">أنشئ أول فاتورة لبدء تتبّع المبيعات</p>
            <Button size="sm" variant="outline" onClick={() => navigate('/invoices?action=new')}>
              إنشاء فاتورة
            </Button>
          </div>
        )}
      </CardContent>
    </>
  );
});
