import React, { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { EntityLink } from "@/components/shared/EntityLink";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];

const PAGE_SIZE = 20;

export const CustomerTabInvoices = memo(function CustomerTabInvoices({ invoices, customerId }: { invoices: Invoice[]; customerId: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(invoices.length / PAGE_SIZE);
  const paged = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>الفواتير</CardTitle><CardDescription>سجل فواتير العميل ({invoices.length})</CardDescription></div>
        <Button size="sm" onClick={() => navigate('/invoices', { state: { prefillCustomerId: customerId } })}>
          <Plus className="h-4 w-4 ml-2" />فاتورة جديدة
        </Button>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">لا توجد فواتير لهذا العميل</p>
            <Button size="sm" onClick={() => navigate('/invoices', { state: { prefillCustomerId: customerId } })}>
              <FileText className="h-4 w-4 ml-2" />إنشاء أول فاتورة
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paged.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <EntityLink type="invoice" id={invoice.id}>{invoice.invoice_number}</EntityLink>
                    <span className="text-muted-foreground mr-4 text-sm">{new Date(invoice.created_at).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={invoice.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {invoice.payment_status === 'paid' ? 'مدفوع' : invoice.payment_status === 'partial' ? 'جزئي' : 'معلق'}
                    </Badge>
                    <span className="font-bold">{Number(invoice.total_amount).toLocaleString()} ج.م</span>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronRight className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronLeft className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});
