import React, { memo, useCallback } from 'react';
import { VirtualizedTable, VirtualColumn } from '@/components/table/VirtualizedTable';
import { VirtualizedMobileList } from '@/components/table/VirtualizedMobileList';
import { useIsMobile } from '@/hooks/use-mobile';

interface VirtualizedDataSectionProps<T> {
  data: T[];
  getItemKey: (item: T) => string;
  
  // Desktop table config
  columns: VirtualColumn<T>[];
  rowHeight?: number;
  onRowClick?: (item: T) => void;
  
  // Mobile config
  renderMobileItem: (item: T, index: number) => React.ReactNode;
  mobileItemHeight?: number;
  
  // Common
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  desktopSkeleton?: React.ReactNode;
  mobileSkeleton?: React.ReactNode;
  maxHeight?: number;
  virtualizationThreshold?: number;
}

function VirtualizedDataSectionInner<T>({
  data,
  getItemKey,
  columns,
  rowHeight = 56,
  onRowClick,
  renderMobileItem,
  mobileItemHeight = 140,
  emptyState,
  isLoading,
  desktopSkeleton,
  mobileSkeleton,
  maxHeight = 600,
  virtualizationThreshold = 50,
}: VirtualizedDataSectionProps<T>) {
  const isMobile = useIsMobile();
  const shouldVirtualize = data.length > virtualizationThreshold;

  const handleRowClick = useCallback(
    (item: T) => {
      if (onRowClick) onRowClick(item);
    },
    [onRowClick]
  );

  // For mobile view
  if (isMobile) {
    if (shouldVirtualize) {
      return (
        <VirtualizedMobileList
          data={data}
          renderItem={renderMobileItem}
          getItemKey={getItemKey}
          itemHeight={mobileItemHeight}
          emptyState={emptyState}
          isLoading={isLoading}
          loadingSkeleton={mobileSkeleton}
        />
      );
    }
    
    // Non-virtualized mobile list
    if (isLoading && mobileSkeleton) return <>{mobileSkeleton}</>;
    if (data.length === 0 && emptyState) return <>{emptyState}</>;
    
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={getItemKey(item)}>{renderMobileItem(item, index)}</div>
        ))}
      </div>
    );
  }

  // Desktop view
  if (shouldVirtualize) {
    return (
      <VirtualizedTable
        data={data}
        columns={columns}
        rowHeight={rowHeight}
        maxHeight={maxHeight}
        onRowClick={handleRowClick}
        getRowKey={getItemKey}
        emptyState={emptyState}
        isLoading={isLoading}
        loadingSkeleton={desktopSkeleton}
      />
    );
  }

  // Non-virtualized fallback is handled by the parent component
  return null;
}

export const VirtualizedDataSection = memo(VirtualizedDataSectionInner) as typeof VirtualizedDataSectionInner;
