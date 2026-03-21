import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';

interface ServerPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

function ServerPaginationInner({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  hasNextPage,
  hasPrevPage,
}: ServerPaginationProps) {
  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between gap-4 py-3 px-1">
      <p className="text-sm text-muted-foreground">
        عرض {from} - {to} من {totalCount}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(1)} disabled={!hasPrevPage}>
          <ChevronsRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage - 1)} disabled={!hasPrevPage}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm px-2 min-w-[80px] text-center">
          {currentPage} / {totalPages}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage + 1)} disabled={!hasNextPage}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(totalPages)} disabled={!hasNextPage}>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export const ServerPagination = memo(ServerPaginationInner);
