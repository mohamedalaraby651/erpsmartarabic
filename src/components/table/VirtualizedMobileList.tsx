import React, { useRef, memo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VirtualizedMobileListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey: (item: T) => string;
  itemHeight?: number;
  gap?: number;
  className?: string;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  loadingSkeleton?: React.ReactNode;
  overscan?: number;
}

function VirtualizedMobileListInner<T>({
  data,
  renderItem,
  getItemKey,
  itemHeight = 140,
  gap = 12,
  className,
  emptyState,
  isLoading,
  loadingSkeleton,
  overscan = 5,
}: VirtualizedMobileListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight + gap,
    overscan,
  });

  const memoizedRenderItem = useCallback(
    (item: T, index: number) => renderItem(item, index),
    [renderItem]
  );

  if (isLoading && loadingSkeleton) {
    return <>{loadingSkeleton}</>;
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto h-[calc(100vh-300px)] min-h-[400px]', className)}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = data[virtualRow.index];
          return (
            <div
              key={getItemKey(item)}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                paddingBottom: gap,
              }}
            >
              {memoizedRenderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const VirtualizedMobileList = memo(VirtualizedMobileListInner) as typeof VirtualizedMobileListInner;
