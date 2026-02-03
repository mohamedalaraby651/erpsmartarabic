import React, { useRef, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface VirtualColumn<T> {
  key: keyof T | string;
  header: React.ReactNode;
  cell: (item: T, index: number) => React.ReactNode;
  width?: string;
  className?: string;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: VirtualColumn<T>[];
  rowHeight?: number;
  maxHeight?: number;
  onRowClick?: (item: T) => void;
  getRowKey: (item: T) => string;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  loadingSkeleton?: React.ReactNode;
  className?: string;
}

function VirtualizedTableInner<T>({
  data,
  columns,
  rowHeight = 56,
  maxHeight = 600,
  onRowClick,
  getRowKey,
  emptyState,
  isLoading,
  loadingSkeleton,
  className,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const handleRowClick = useCallback(
    (item: T) => {
      if (onRowClick) {
        onRowClick(item);
      }
    },
    [onRowClick]
  );

  if (isLoading && loadingSkeleton) {
    return <>{loadingSkeleton}</>;
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn('rounded-md border', className)}>
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              {columns.map((column, index) => (
                <TableHead
                  key={String(column.key) + index}
                  className={cn(column.className)}
                  style={{ width: column.width }}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Spacer for virtualization */}
            {rowVirtualizer.getVirtualItems().length > 0 && (
              <tr style={{ height: rowVirtualizer.getVirtualItems()[0]?.start || 0 }} />
            )}
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = data[virtualRow.index];
              return (
                <TableRow
                  key={getRowKey(item)}
                  data-index={virtualRow.index}
                  onClick={() => handleRowClick(item)}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-muted/50'
                  )}
                  style={{ height: rowHeight }}
                >
                  {columns.map((column, colIndex) => (
                    <TableCell
                      key={String(column.key) + colIndex}
                      className={cn(column.className)}
                    >
                      {column.cell(item, virtualRow.index)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            {/* End spacer */}
            {rowVirtualizer.getVirtualItems().length > 0 && (
              <tr
                style={{
                  height:
                    rowVirtualizer.getTotalSize() -
                    (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end || 0),
                }}
              />
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export const VirtualizedTable = memo(VirtualizedTableInner) as typeof VirtualizedTableInner;
