import React, { memo, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Search, CreditCard, Undo2, ArrowLeft } from "lucide-react";
import { EntityLink } from "@/components/shared/EntityLink";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { InvoicesReturnsSummary } from "@/components/customers/details/InvoicesReturnsSummary";
import { InvoiceLongPressSheet } from "@/components/customers/mobile/InvoiceLongPressSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type CreditNote = Database['public']['Tables']['credit_notes']['Row'];

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: 'مدفوع', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  partial: { label: 'جزئي', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  pending: { label: 'معلق', className: 'bg-destructive/10 text-destructive' },
  unpaid: { label: 'غير مدفوع', className: 'bg-destructive/10 text-destructive' },
  overdue: { label: 'متأخر', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

interface CustomerTabInvoicesProps {
  invoices: Invoice[];
  customerId: string;
  totalPaymentsFromLedger?: number;
  onQuickPay?: (invoiceId: string) => void;
  // Linked returns + balance for unified summary
  creditNotes?: CreditNote[];
  currentBalance?: number;
  onViewAllReturns?: () => void;
  // Server pagination props (optional — uses client pagination as fallback)
  paginatedData?: { data: Invoice[]; count: number };
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

export const CustomerTabInvoices = memo(function CustomerTabInvoices({
  invoices,
  customerId,
  totalPaymentsFromLedger,
  onQuickPay,
  creditNotes = [],
  currentBalance = 0,
  onViewAllReturns,
  paginatedData,
  currentPage = 1,
  pageSize = 20,
  onPageChange,
}: CustomerTabInvoicesProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [clientPage, setClientPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const useServerPagination = !!paginatedData && !!onPageChange;

  // Client-side filtering (applied on full dataset for summary, on paginated data for display)
  const filtered = useMemo(() => {
    let result = invoices;
    if (statusFilter !== 'all') {
      result = result.filter(inv => inv.payment_status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(inv => inv.invoice_number.toLowerCase().includes(q));
    }
    return result;
  }, [invoices, statusFilter, searchQuery]);

  // When using server pagination, display paginated data; otherwise client paginate
  const hasClientFilters = statusFilter !== 'all' || searchQuery.trim() !== '';
  const displayData = useMemo(() => {
    if (useServerPagination && !hasClientFilters) {
      return paginatedData.data;
    }
    // Client pagination fallback
    return filtered.slice((clientPage - 1) * pageSize, clientPage * pageSize);
  }, [useServerPagination, hasClientFilters, paginatedData, filtered, clientPage, pageSize]);

  const totalCount = useServerPagination && !hasClientFilters ? paginatedData.count : filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const activePage = useServerPagination && !hasClientFilters ? currentPage : clientPage;
  const handlePageChange = useServerPagination && !hasClientFilters ? onPageChange! : setClientPage;

  React.useEffect(() => { setClientPage(1); }, [statusFilter, searchQuery]);

  const unlinkedPayments = useMemo(() => {
    if (totalPaymentsFromLedger == null) return 0;
    const totalPaid = invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
    return Math.round((totalPaymentsFromLedger - totalPaid) * 100) / 100;
  }, [invoices, totalPaymentsFromLedger]);

  const recentReturns = useMemo(
    () => creditNotes.filter((c) => c.status !== 'cancelled').slice(0, 3),
    [creditNotes],
  );

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <CardTitle>الفواتير</CardTitle>
          <CardDescription>سجل فواتير العميل ({useServerPagination ? paginatedData.count : invoices.length})</CardDescription>
        </div>
        <Button size="sm" onClick={() => navigate('/invoices', { state: { prefillCustomerId: customerId } })}>
          <Plus className="h-4 w-4 ml-2" />فاتورة جديدة
        </Button>
      </CardHeader>

      <CardContent>
        {invoices.length === 0 && (!paginatedData || paginatedData.count === 0) ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">لا توجد فواتير لهذا العميل</p>
            <Button size="sm" onClick={() => navigate('/invoices', { state: { prefillCustomerId: customerId } })}>
              <FileText className="h-4 w-4 ml-2" />إنشاء أول فاتورة
            </Button>
          </div>
        ) : (
          <>
            {/* Unified summary: invoices ↔ returns ↔ balance */}
            <div className="mb-4 space-y-2">
              <InvoicesReturnsSummary
                invoices={invoices}
                creditNotes={creditNotes}
                currentBalance={currentBalance}
              />
              {unlinkedPayments > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 px-1">
                  <span className="font-medium">{unlinkedPayments.toLocaleString()} ج.م</span>
                  <span className="text-muted-foreground">دفعات غير مرتبطة بفواتير</span>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الفاتورة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 min-h-11 sm:h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[130px] min-h-11 sm:h-9">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                  <SelectItem value="partial">جزئي</SelectItem>
                  <SelectItem value="unpaid">غير مدفوع</SelectItem>
                  <SelectItem value="overdue">متأخر</SelectItem>
                  <SelectItem value="pending">معلق</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Invoice List */}
            <div className="space-y-2">
              {displayData.map((invoice) => {
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
                      <div className="flex items-center gap-2">
                        {remaining > 0 && onQuickPay && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-9 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                            onClick={() => onQuickPay(invoice.id)}
                          >
                            <CreditCard className="h-3.5 w-3.5 ml-1" />
                            سداد
                          </Button>
                        )}
                        <span className="font-bold">{total.toLocaleString()} ج.م</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground flex-wrap">
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

            {filtered.length === 0 && invoices.length > 0 && hasClientFilters && (
              <div className="text-center py-6 text-sm text-muted-foreground">لا توجد نتائج مطابقة للبحث</div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <ServerPagination
                currentPage={activePage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                hasNextPage={activePage < totalPages}
                hasPrevPage={activePage > 1}
              />
            )}

            {/* Linked returns (credit notes) — quick access */}
            {recentReturns.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Undo2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    المرتجعات المرتبطة
                    <span className="text-xs text-muted-foreground font-normal">({creditNotes.length})</span>
                  </h4>
                  {onViewAllReturns && creditNotes.length > recentReturns.length && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onViewAllReturns}>
                      عرض الكل
                      <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {recentReturns.map((cn) => (
                    <button
                      key={cn.id}
                      type="button"
                      onClick={() => navigate(`/credit-notes/${cn.id}`)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors text-right"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{cn.credit_note_number}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(cn.created_at).toLocaleDateString('ar-EG')}
                          {cn.reason ? ` • ${cn.reason}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
                        −{Number(cn.amount).toLocaleString()} ج.م
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});
