import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfiniteScrollContainerProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  observerRef: (node: HTMLElement | null) => void;
  emptyState?: React.ReactNode;
  loadingState?: React.ReactNode;
  className?: string;
  itemClassName?: string;
}

export function InfiniteScrollContainer<T>({
  items,
  renderItem,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  observerRef,
  emptyState,
  loadingState,
  className,
  itemClassName,
}: InfiniteScrollContainerProps<T>) {
  if (isLoading) {
    return loadingState || (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return emptyState || (
      <div className="text-center py-8 text-muted-foreground">
        لا توجد بيانات
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item, index) => (
        <div key={index} className={itemClassName}>
          {renderItem(item, index)}
        </div>
      ))}
      
      {/* Observer target for infinite scroll */}
      <div
        ref={observerRef}
        className="h-4 w-full"
      />
      
      {/* Loading indicator for next page */}
      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="mr-2 text-sm text-muted-foreground">جاري تحميل المزيد...</span>
        </div>
      )}
      
      {/* End of list indicator */}
      {!hasNextPage && items.length > 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          تم عرض جميع النتائج ({items.length})
        </div>
      )}
    </div>
  );
}
