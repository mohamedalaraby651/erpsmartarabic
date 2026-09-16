/**
 * Canonical data-table toolbar shell (OPA-TBL-001).
 *
 * Layout only: it arranges search, view/filter controls, secondary actions,
 * and optional status content. It owns no query or domain behaviour.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataTableToolbarProps {
  search: ReactNode;
  controls?: ReactNode;
  actions?: ReactNode;
  status?: ReactNode;
  className?: string;
}

export function DataTableToolbar({
  search,
  controls,
  actions,
  status,
  className,
}: DataTableToolbarProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">{search}</div>
        {(controls || actions) && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {controls}
            {actions}
          </div>
        )}
      </div>
      {status}
    </div>
  );
}