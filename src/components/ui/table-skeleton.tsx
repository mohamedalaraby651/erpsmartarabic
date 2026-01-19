import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
}

export function TableSkeleton({ rows = 5, columns = 6, className, showHeader = true }: TableSkeletonProps) {
  // Vary skeleton widths for more natural look
  const getColumnWidth = (colIndex: number) => {
    const widths = ['w-32', 'w-24', 'w-20', 'w-28', 'w-16', 'w-20', 'w-12'];
    return widths[colIndex % widths.length];
  };

  return (
    <div className={cn('rounded-md border overflow-hidden', className)}>
      <Table>
        {showHeader && (
          <TableHeader>
            <TableRow className="bg-muted/30">
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex} className="animate-pulse">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton className={cn('h-4', getColumnWidth(colIndex))} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Inline table loading (without border)
export function InlineTableSkeleton({ rows = 3, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className={cn('h-4', j === 0 ? 'w-1/3' : 'w-1/6')} />
          ))}
        </div>
      ))}
    </div>
  );
}
