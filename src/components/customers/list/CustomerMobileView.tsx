import React, { memo, useRef, useEffect } from "react";
import { Clock, Wallet, Activity, Star } from "lucide-react";
import CustomerListCard from "@/components/customers/list/CustomerListCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { CustomerEmptyState } from "@/components/customers/list/CustomerEmptyState";
import { CustomerMobileSkeleton } from "@/components/customers/list/CustomerMobileSkeleton";
import { CustomerSummaryBar } from "@/components/customers/list/CustomerSummaryBar";
import { cn } from "@/lib/utils";
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
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, checked: boolean) => void;
  /** عرض شريط الملخص الذكي. الافتراضي true. */
  showSummary?: boolean;
  /** عرض شريط الترتيب السريع. الافتراضي true. */
  showSort?: boolean;
}

export const CustomerMobileView = memo(function CustomerMobileView({
  data, isLoading, canEdit, canDelete, onNavigate, onEdit, onDelete, onRefresh,
  hasActiveFilters, onClearFilters, onAdd, onImport, onNewInvoice, onNewPayment,
  hasNextPage, isFetchingNextPage, onLoadMore, sortKey, onSortChange,
  alertCountByCustomer, errorCustomerIds, hasActiveSearch, activeQuickFilter, onQuickFilter,
  selectedIds, onToggleSelect,
}: CustomerMobileViewProps) {
  const observerRef = useRef<HTMLDivElement>(null);
  const selectionMode = !!(selectedIds && selectedIds.size > 0);

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

  if (isLoading && data.length === 0) return <CustomerMobileSkeleton count={6} />;

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

      {/* Quick sort chips — single tap */}
      {onSortChange && (
        <div
          className="flex items-center gap-1.5 mb-3 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide"
          role="toolbar"
          aria-label="ترتيب سريع"
        >
          {[
            { key: 'created_at', label: 'الأحدث', Icon: Clock },
            { key: 'last_activity_at', label: 'آخر نشاط', Icon: Activity },
            { key: 'current_balance', label: 'الأعلى مديونية', Icon: Wallet },
            { key: 'vip_level', label: 'VIP', Icon: Star },
          ].map(({ key, label, Icon }) => {
            const active = (sortKey || 'created_at') === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSortChange(key)}
                aria-pressed={active}
                className={cn(
                  'shrink-0 inline-flex items-center gap-1.5 h-9 min-h-9 px-3 rounded-full text-xs font-medium border transition-all',
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border active:scale-95',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
          <span className="ms-auto text-[11px] text-muted-foreground tabular-nums shrink-0 self-center pe-1" aria-live="polite">
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
              selectionMode={selectionMode}
              isSelected={selectedIds?.has(customer.id)}
              onSelect={onToggleSelect ? (id) => onToggleSelect(id, !selectedIds?.has(id)) : undefined}
            />
          </div>
        ))}
      </div>

      {/* Infinite scroll sentinel — skeleton أثناء جلب المزيد */}
      <div ref={observerRef} className="mt-3" aria-hidden={!isFetchingNextPage}>
        {isFetchingNextPage ? (
          <div className="space-y-2.5" role="status" aria-live="polite" aria-label="جارٍ تحميل المزيد">
            <span className="sr-only">جارٍ تحميل المزيد من العملاء…</span>
            <CustomerMobileSkeleton count={2} showSummary={false} showSortBar={false} />
          </div>
        ) : (
          <div className="h-6" />
        )}
      </div>

      {!hasNextPage && data.length > 0 && (
        <div className="text-center py-4 text-xs text-muted-foreground">
          تم عرض جميع النتائج ({data.length})
        </div>
      )}
    </PullToRefresh>
  );
});
