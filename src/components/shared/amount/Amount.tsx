import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCompactEGP, formatEGP, formatTableAmount } from '@/lib/format/money';

interface AmountProps {
  value: number | null | undefined;
  /** table: zero → "-" ; full: always full value */
  variant?: 'table' | 'full';
  withSymbol?: boolean;
  className?: string;
}

/** Money value: tabular digits, neutral color, hidden by the balance-privacy toggle. */
export function Amount({ value, variant = 'table', withSymbol = true, className }: AmountProps) {
  const text = variant === 'table' ? formatTableAmount(value, { withSymbol }) : formatEGP(value ?? 0, { withSymbol });
  return (
    <span data-amount dir="ltr" className={cn('tabular-nums whitespace-nowrap', text === '-' && 'text-muted-foreground', className)}>
      {text}
    </span>
  );
}

/** KPI value: compact (1.45M ج.م) with exact amount on hover. */
export function KpiAmount({ value, className }: { value: number; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span data-amount dir="ltr" className={cn('tabular-nums whitespace-nowrap cursor-default', className)}>
          {formatCompactEGP(value)}
        </span>
      </TooltipTrigger>
      <TooltipContent><span dir="ltr" className="tabular-nums">{formatEGP(value)}</span></TooltipContent>
    </Tooltip>
  );
}
