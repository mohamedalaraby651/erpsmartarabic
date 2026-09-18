import React, { memo, useRef, useEffect } from "react";
import { Clock, Wallet, Activity, Star } from "lucide-react";
import CustomerListCard from "@/components/customers/list/CustomerListCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { CustomerEmptyState } from "@/components/customers/list/CustomerEmptyState";
import { CustomerMobileSkeleton } from "@/components/customers/list/CustomerMobileSkeleton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { tooltips, regions } from "@/lib/uiCopy";
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
  /** Visual-only highlight of the active search term. */
  searchQuery?: string;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, checked: boolean) => void;
  /** عرض شريط الترتيب السريع. الافتراضي true. */
  showSort?: boolean;
}

export const CustomerMobileView = memo(function CustomerMobileView({
  data, isLoading, canEdit, canDelete, onNavigate, onEdit, onDelete, onRefresh,
  hasActiveFilters, onClearFilters, onAdd, onImport, onNewInvoice, onNewPayment,
  hasNextPage, isFetchingNextPage, onLoadMore, sortKey, onSortChange,
  alertCountByCustomer, errorCustomerIds, searchQuery,
  selectedIds, onToggleSelect,
  showSort = true,
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
      {/* Quick sort chips — single tap */}
      {showSort && onSortChange && (
        <div
          className="flex items-center gap-1.5 mb-3 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide"
          role="toolbar"
          aria-label={tooltips.quickSort}
        >
          {[
            { key: 'created_at', label: 'الأحدث', Icon: Clock },
            { key: 'last_activity_at', label: 'آخر نشاط', Icon: Activity },
            { key: 'current_balance', label: 'الأعلى مديونية', Icon: Wallet },
            { key: 'vip_level', label: 'VIP', Icon: Star },
          ].map(({ key, label, Icon }) => {
            const active = (sortKey || 'created_at') === key;
            return (
              <Button
                key={key}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => onSortChange(key)}
                aria-pressed={active}
                className={cn(
                  'shrink-0 gap-1.5 min-h-11 rounded-full text-xs font-medium',
                  active
                    ? 'shadow-sm'
                    : 'text-muted-foreground active:scale-95',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            );
          })}
          <span className="ms-auto text-[11px] text-muted-foreground tabular-nums shrink-0 self-center pe-1" aria-live="polite">
            {data.length} عميل
          </span>
        </div>
      )}

      <div className="space-y-2.5" role="list" aria-label={regions.customerList}>
        {data.map((customer) => (
          <div key={customer.id} role="listitem">
            <CustomerListCard
              customer={customer}
              onNavigate={onNavigate}
              onEdit={canEdit ? onEdit : undefined}
              onDelete={canDelete ? onDelete : undefined}
              onNewInvoice={onNewInvoice}
              onNewPayment={onNewPayment}
              searchQuery={searchQuery}
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
          <div className="space-y-2.5" role="status" aria-live="polite" aria-label={regions.loadingMore}>
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
