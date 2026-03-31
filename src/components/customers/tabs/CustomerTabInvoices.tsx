import React, { memo, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, ChevronLeft, ChevronRight, Wallet, AlertCircle } from "lucide-react";
import { EntityLink } from "@/components/shared/EntityLink";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];

const PAGE_SIZE = 20;

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: {
    label: 'مدفوع',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  partial: {
    label: 'جزئي',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  pending: {
    label: 'معلق',
    className: 'bg-destructive/10 text-destructive',
  },
};

export const CustomerTabInvoices = memo(function CustomerTabInvoices({
  invoices,
  customerId,
  totalPaymentsFromLedger,
}: {
  invoices: Invoice[];
  customerId: string;
  totalPaymentsFromLedger?: number;
}) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(invoices.length / PAGE_SIZE);
  const paged = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary = useMemo(() => {
    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount), 0);
    const totalPaid = invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
    return { totalInvoiced, totalPaid, outstanding: totalInvoiced - totalPaid };
  }, [invoices]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>الفواتير</CardTitle>
          <CardDescription>سجل فواتير العميل ({invoices.length})</CardDescription>
        </div>
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
            {/* Summary Bar */}
            <div className="flex items-center gap-4 p-3 mb-4 rounded-lg bg-muted/50 border text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">الإجمالي:</span>
                <span className="font-bold">{summary.totalInvoiced.toLocaleString()} ج.م</span>
              </div>
              <div className="w-px h-4 bg-border hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">المدفوع:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{summary.totalPaid.toLocaleString()} ج.م</span>
              </div>
              <div className="w-px h-4 bg-border hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-muted-foreground">المتبقي:</span>
                <span className="font-bold text-destructive">{summary.outstanding.toLocaleString()} ج.م</span>
              </div>
            </div>

            {/* Invoice List */}
            <div className="space-y-2">
              {paged.map((invoice) => {
                const paid = Number(invoice.paid_amount || 0);
                const total = Number(invoice.total_amount);
                const remaining = total - paid;
                const status = statusConfig[invoice.payment_status] || statusConfig.pending;

                return (
                  <div key={invoice.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <EntityLink type="invoice" id={invoice.id}>{invoice.invoice_number}</EntityLink>
                        <Badge className={status.className} variant="secondary">{status.label}</Badge>
                      </div>
                      <span className="font-bold">{total.toLocaleString()} ج.م</span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span>{new Date(invoice.created_at).toLocaleDateString('ar-EG')}</span>
                      {invoice.due_date && (
                        <>
                          <span>•</span>
                          <span>استحقاق: {new Date(invoice.due_date).toLocaleDateString('ar-EG')}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>
                        مدفوع: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{paid.toLocaleString()}</span>
                      </span>
                      {remaining > 0 && (
                        <>
                          <span>•</span>
                          <span>
                            متبقي: <span className="text-destructive font-medium">{remaining.toLocaleString()}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});
