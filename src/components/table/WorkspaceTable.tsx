import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { DENSITY_CLASS, type TableLayout } from '@/hooks/useTableLayout';

export interface WorkspaceColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  header?: ReactNode;
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
      <Table className={cn('min-w-max', DENSITY_CLASS[layout.density])}>
        <TableHeader className="sticky top-0 z-20 bg-card">
          <TableRow>
            {selection && <TableHead className="w-11">{selection.header}</TableHead>}
            {visible.map((column, index) => <TableHead key={column.key} className={pinned(index, column.key)}>{column.header ?? column.label}</TableHead>)}
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