import React, { memo, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLongPress } from '@/hooks/useLongPress';

export type AccentTone = 'primary' | 'success' | 'warning' | 'destructive' | 'muted';

const accentBorder: Record<AccentTone, string> = {
  primary: 'border-s-primary',
  success: 'border-s-success',
  warning: 'border-s-warning',
  destructive: 'border-s-destructive',
  muted: 'border-s-border',
};

interface DashboardListCardProps {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  accentTone?: AccentTone;
  onTap?: () => void;
  onLongPress?: () => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Compact list row matching CustomerListCard pattern.
 * p-3, border-s-[3px], rounded-lg, gap-3, active:scale-[0.98]
 */
export const DashboardListCard = memo(function DashboardListCard({
  leading,
  title,
  meta,
  trailing,
  accentTone = 'muted',
  onTap,
  onLongPress,
  ariaLabel,
  className,
}: DashboardListCardProps) {
  const longPress = useLongPress({
    onLongPress: () => onLongPress?.(),
    onPress: () => onTap?.(),
    delay: 500,
  });

  // Use long-press handlers only when onLongPress is provided; otherwise simple onClick.
  const interactiveProps = onLongPress
    ? longPress
    : onTap
    ? { onClick: onTap }
    : {};

  return (
    <Card
      className={cn(
        'relative bg-card border-s-[3px] shadow-sm rounded-lg overflow-hidden',
        'transition-transform duration-150 active:scale-[0.98]',
        accentBorder[accentTone],
        (onTap || onLongPress) && 'cursor-pointer',
        className,
      )}
      role={onTap || onLongPress ? 'button' : undefined}
      tabIndex={onTap || onLongPress ? 0 : undefined}
      aria-label={ariaLabel}
      {...interactiveProps}
    >
      <div className="p-3 flex items-center gap-3">
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate leading-tight">{title}</div>
          {meta && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5 leading-tight">
              {meta}
            </div>
          )}
        </div>
        {trailing && <div className="shrink-0 flex flex-col items-end gap-0.5">{trailing}</div>}
      </div>
    </Card>
  );
});
