import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { prefetchByPath } from '@/lib/prefetch';

export type ChipTone = 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted';

const toneClasses: Record<ChipTone, { icon: string; count: string }> = {
  primary: { icon: 'text-primary', count: 'bg-primary/10 text-primary' },
  success: { icon: 'text-success', count: 'bg-success/10 text-success' },
  warning: { icon: 'text-warning', count: 'bg-warning/10 text-warning' },
  destructive: { icon: 'text-destructive', count: 'bg-destructive/10 text-destructive' },
  info: { icon: 'text-accent-foreground', count: 'bg-accent text-accent-foreground' },
  muted: { icon: 'text-muted-foreground', count: 'bg-muted text-foreground' },
};

interface DashboardChipProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: ChipTone;
  href?: string;
  trend?: number | null;
}

/**
 * Compact chip matching CustomerStatsBar pattern.
 * h-9 px-3 rounded-lg, icon h-3.5, value pill h-[18px] text-[10px].
 */
export const DashboardChip = memo(function DashboardChip({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  href,
  trend,
}: DashboardChipProps) {
  const navigate = useNavigate();
  const t = toneClasses[tone];
  const onClick = href ? () => navigate(href) : undefined;
  const onHover = href ? () => prefetchByPath(href.split('?')[0]) : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onTouchStart={onHover}
      className={cn(
        'shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium border',
        'bg-card text-foreground border-border transition-all duration-200',
        'active:scale-95 md:hover:bg-accent md:hover:text-accent-foreground',
      )}
      aria-label={`${label}: ${value}`}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0', t.icon)} />
      <span className="truncate max-w-[110px]">{label}</span>
      <span
        className={cn(
          'text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5 tabular-nums',
          t.count,
        )}
      >
        {value}
      </span>
      {trend !== null && trend !== undefined && (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 text-[10px] tabular-nums',
            trend >= 0 ? 'text-success' : 'text-destructive',
          )}
        >
          {trend >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
          {Math.abs(trend).toFixed(0)}%
        </span>
      )}
    </button>
  );
});
