import React, { memo, useCallback, useState, useRef, useEffect, useMemo } from "react";
import { LayoutGrid, LayoutList, Loader2, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CustomerListCard from "@/components/customers/CustomerListCard";
import CustomerGridCard from "@/components/customers/CustomerGridCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { CustomerEmptyState } from "@/components/customers/CustomerEmptyState";
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
}

export const CustomerMobileView = memo(function CustomerMobileView({
  data, isLoading, canEdit, canDelete, onNavigate, onEdit, onDelete, onRefresh,
  hasActiveFilters, onClearFilters, onAdd, onImport, onNewInvoice, onNewPayment,
  hasNextPage, isFetchingNextPage, onLoadMore, sortKey, onSortChange,
}: CustomerMobileViewProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const observerRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
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

  if (isLoading && data.length === 0) return <MobileListSkeleton count={5} />;

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
      {/* Sort + View toggle — segment control style */}
      <div className="flex items-center justify-between mb-3 gap-2">
        {onSortChange && (
          <Select value={sortKey || 'created_at'} onValueChange={onSortChange}>
            <SelectTrigger className="w-auto h-9 text-xs gap-1.5 px-3 rounded-xl border-border bg-card shadow-sm">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">تاريخ الإضافة</SelectItem>
              <SelectItem value="name">الاسم</SelectItem>
              <SelectItem value="current_balance">الرصيد</SelectItem>
              <SelectItem value="last_activity_at">آخر نشاط</SelectItem>
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-0.5 border rounded-xl p-1 bg-muted/50 shadow-sm">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200',
              viewMode === 'list'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200',
              viewMode === 'grid'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-2.5">
          {data.map((customer, i) => (
            <div key={customer.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <CustomerListCard
                customer={customer}
                onNavigate={onNavigate}
                onEdit={canEdit ? onEdit : undefined}
                onDelete={canDelete ? onDelete : undefined}
                onNewInvoice={onNewInvoice}
                onNewPayment={onNewPayment}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 min-[500px]:grid-cols-3 gap-2.5">
          {data.map((customer, i) => (
            <div key={customer.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <CustomerGridCard
                customer={customer}
                onClick={() => onNavigate(customer.id)}
                onEdit={canEdit ? () => onEdit(customer) : undefined}
                onDelete={canDelete ? () => onDelete(customer.id) : undefined}
                onNewInvoice={onNewInvoice ? () => onNewInvoice(customer.id) : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={observerRef} className="h-10 flex items-center justify-center mt-4">
        {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>
    </PullToRefresh>
  );
});
