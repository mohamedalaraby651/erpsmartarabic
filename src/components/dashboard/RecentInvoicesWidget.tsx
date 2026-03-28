import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Receipt } from 'lucide-react';

interface InvoiceWithCustomer {
  id: string;
  invoice_number: string;
  total_amount: number;
  payment_status: string;
  customers: { name: string } | null;
}

interface RecentInvoicesWidgetProps {
  invoices: InvoiceWithCustomer[] | undefined;
}

export function RecentInvoicesWidget({ invoices }: RecentInvoicesWidgetProps) {
  const navigate = useNavigate();

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">آخر الفواتير</CardTitle>
          <CardDescription>أحدث الفواتير المصدرة</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
          عرض الكل
          <ArrowLeft className="mr-2 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {invoices && invoices.length > 0 ? (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                onClick={() => navigate(`/invoices/${invoice.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{invoice.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.customers?.name || 'عميل'}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">{invoice.total_amount.toLocaleString()} ج.م</p>
                  <Badge
                    variant={
                      invoice.payment_status === 'paid' ? 'default' :
                      invoice.payment_status === 'partial' ? 'secondary' : 'destructive'
                    }
                    className="text-xs"
                  >
                    {invoice.payment_status === 'paid' ? 'مدفوع' :
                     invoice.payment_status === 'partial' ? 'جزئي' : 'معلق'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>لا توجد فواتير بعد</p>
          </div>
        )}
      </CardContent>
    </>
  );
}
