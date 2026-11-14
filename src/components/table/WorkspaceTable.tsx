import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { DENSITY_CLASS, type TableLayout } from '@/hooks/useTableLayout';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp } from 'lucide-react';

export interface WorkspaceColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  header?: ReactNode;
  onSort?: () => void;
  sortDirection?: 'asc' | 'desc' | null;
}

/** Presentation only: data, actions and query scope remain owned by the page. */
export function WorkspaceTable<T extends { id: string }>({ rows, columns, layout, selection }: {
  rows: readonly T[];
  columns: readonly WorkspaceColumn<T>[];
  layout: TableLayout;
  selection?: { header: ReactNode; render: (row: T) => ReactNode };
}) {
  const visible = layout.visibleKeys.flatMap(key => {
    const column = columns.find(column => column.key === key);
    return column ? [column] : [];
  });
  const pinned = (index: number, key: string) => cn(
    index === 0 && 'sticky right-0 z-10 bg-card',
    key === 'actions' && 'sticky left-0 z-10 bg-card',
  );
  return (
    <div className="max-w-full overflow-auto" style={{ maxHeight: layout.bodyHeight || undefined }}>
      <Table containerClassName="overflow-visible" className={cn('min-w-max', DENSITY_CLASS[layout.density])}>
        <TableHeader className="sticky top-0 z-20 bg-card">
          <TableRow>
            {selection && <TableHead className="w-11">{selection.header}</TableHead>}
            {visible.map((column, index) => <TableHead key={column.key} className={pinned(index, column.key)}>{column.onSort ? <Button variant="ghost" size="sm" className="gap-1 px-0" onClick={column.onSort}>{column.label}{column.sortDirection === 'asc' && <ArrowUp className="h-3 w-3" />}{column.sortDirection === 'desc' && <ArrowDown className="h-3 w-3" />}</Button> : column.header ?? column.label}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => <TableRow key={row.id}>
            {selection && <TableCell>{selection.render(row)}</TableCell>}
            {visible.map((column, index) => <TableCell key={column.key} className={cn('max-w-80 whitespace-normal break-words', pinned(index, column.key))}>{column.render(row)}</TableCell>)}
          </TableRow>)}
        </TableBody>
      </Table>
    </div>
  );
}