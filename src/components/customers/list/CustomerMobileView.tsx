import React, { memo, useRef, useEffect } from "react";
import { Loader2, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CustomerListCard from "@/components/customers/list/CustomerListCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { CustomerEmptyState } from "@/components/customers/list/CustomerEmptyState";
import { CustomerMobileSkeleton } from "@/components/customers/list/CustomerMobileSkeleton";
import { CustomerSummaryBar } from "@/components/customers/list/CustomerSummaryBar";
import type { Customer } from "@/lib/customerConstants";

interface CustomerMobileViewProps {
  data: Customer[];
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onNavigate: (id: string) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onRefresh: () => Promise<void>;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onAdd?: () => void;
  onImport?: () => void;
  onNewInvoice?: (id: string) => void;
  onNewPayment?: (id: string) => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  sortKey?: string;
  onSortChange?: (key: string) => void;
  alertCountByCustomer?: Map<string, number>;
  errorCustomerIds?: Set<string>;
  hasActiveSearch?: boolean;
  activeQuickFilter?: string | null;
  onQuickFilter?: (id: string | null) => void;
}

export const CustomerMobileView = memo(function CustomerMobileView({
  data, isLoading, canEdit, canDelete, onNavigate, onEdit, onDelete, onRefresh,
  hasActiveFilters, onClearFilters, onAdd, onImport, onNewInvoice, onNewPayment,
  hasNextPage, isFetchingNextPage, onLoadMore, sortKey, onSortChange,
  alertCountByCustomer, errorCustomerIds, hasActiveSearch, activeQuickFilter, onQuickFilter,
}: CustomerMobileViewProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasNextPage || !onLoadMore || isFetchingNextPage) return;
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore(); },
      { threshold: 0.1, rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, onLoadMore, isFetchingNextPage, data.length]);

  if (isLoading && data.length === 0) return <CustomerListSkeleton count={6} />;

  if (data.length === 0) {
    return (
      <CustomerEmptyState
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
        onAdd={canEdit ? onAdd : undefined}
        onImport={onImport}
      />
    );
  }

  return (
    <PullToRefresh onRefresh={onRefresh}>
      {/* شريط الملخص الذكي — مخفي عند البحث/الفلترة */}
      <CustomerSummaryBar
        customers={data}
        hidden={hasActiveSearch || hasActiveFilters}
        activeQuickFilter={activeQuickFilter}
        onQuickFilter={onQuickFilter}
      />

      {/* Sort */}
      {onSortChange && (
        <div className="flex items-center justify-between mb-3" role="toolbar" aria-label="ترتيب وإحصاء القائمة">
          <Select value={sortKey || 'created_at'} onValueChange={onSortChange}>
            <SelectTrigger
              className="w-auto h-9 text-xs gap-1.5 px-3 rounded-xl border-border bg-card shadow-sm min-h-11 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              aria-label="ترتيب القائمة حسب"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">تاريخ الإضافة</SelectItem>
              <SelectItem value="name">الاسم (أ-ي)</SelectItem>
              <SelectItem value="current_balance">الأعلى رصيداً</SelectItem>
              <SelectItem value="last_activity_at">آخر نشاط</SelectItem>
              <SelectItem value="vip_level">VIP أولاً</SelectItem>
              <SelectItem value="total_purchases_cached">الأكثر شراءً</SelectItem>
            </SelectContent>
          </Select>
          <span
            className="text-xs text-muted-foreground tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {data.length} عميل
          </span>
        </div>
      )}

      <div className="space-y-2.5" role="list" aria-label="قائمة العملاء">
        {data.map((customer, i) => (
          <div key={customer.id} role="listitem" className="animate-fade-in" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
            <CustomerListCard
              customer={customer}
              onNavigate={onNavigate}
              onEdit={canEdit ? onEdit : undefined}
              onDelete={canDelete ? onDelete : undefined}
              onNewInvoice={onNewInvoice}
              onNewPayment={onNewPayment}
              alertCount={alertCountByCustomer?.get(customer.id)}
              hasErrorAlert={errorCustomerIds?.has(customer.id)}
            />
          </div>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={observerRef} className="h-10 flex items-center justify-center mt-4">
        {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {!hasNextPage && data.length > 0 && (
        <div className="text-center py-4 text-xs text-muted-foreground">
          تم عرض جميع النتائج ({data.length})
        </div>
      )}
    </PullToRefresh>
  );
});
