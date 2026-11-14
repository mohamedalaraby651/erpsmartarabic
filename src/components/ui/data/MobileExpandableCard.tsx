import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface MobileCardField {
  label: string;
  value: ReactNode;
}

interface Props {
  title: ReactNode;
  amount?: ReactNode;
  status?: ReactNode;
  details?: MobileCardField[];
  actions?: ReactNode;
  defaultOpen?: boolean;
}

/** PRB-NAZRA-002 (329): compact card showing name/amount/status with an expandable details area. */
export function MobileExpandableCard({ title, amount, status, details = [], actions, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const hasDetails = details.length > 0;
  return (
    <div className="rounded-lg border bg-card p-3 text-card-foreground" dir="rtl">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="break-words font-medium">{title}</div>
          {amount !== undefined && <div className="mt-1 tabular-nums text-sm">{amount}</div>}
        </div>
        <div className="flex items-center gap-1">
          {status}
          {hasDetails && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-expanded={open}
              aria-label={open ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
              onClick={() => setOpen((o) => !o)}
              className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
            </Button>
          )}
        </div>
      </div>
      {open && hasDetails && (
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-2 text-sm">
          {details.map((f) => (
            <div key={f.label} className="contents">
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className="min-w-0 break-words text-end tabular-nums">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
