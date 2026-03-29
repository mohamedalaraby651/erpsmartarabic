import { memo, useMemo } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export interface StatItem {
  icon: LucideIcon;
  value: string | number;
  label: string;
  /** Semantic color class, e.g. 'text-primary', 'text-success' */
  color?: string;
  /** Background color class override, e.g. 'bg-primary/10' */
  bgColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface UnifiedStatsDisplayProps {
  stats: StatItem[];
  /** Grid columns for desktop. Mobile always renders horizontal scroll. */
  columns?: 2 | 3 | 4;
  /** Compact mode reduces padding */
  compact?: boolean;
  className?: string;
}

const StatCard = memo(function StatCard({ stat, compact }: { stat: StatItem; compact: boolean }) {
  const { icon: Icon, value, label, color = 'text-primary', bgColor, trend } = stat;
  const resolvedBg = bgColor || `${color.replace('text-', 'bg-')}/10`;

  return (
    <Card className="min-w-[130px] shrink-0 transition-shadow hover:shadow-md">
      <CardContent className={cn('flex items-center gap-3', compact ? 'p-3' : 'p-4')}>
        <div className={cn('p-2 rounded-lg', resolvedBg)}>
          <Icon className={cn('h-4 w-4', color)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('font-bold truncate', compact ? 'text-lg' : 'text-2xl')}>
            {typeof value === 'number' ? value.toLocaleString('ar-EG') : value}
          </p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
        </div>
        {trend && (
          <div className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap',
            trend.isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          )}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * UnifiedStatsDisplay — single stats component replacing:
 *   - StatsGrid (grid layout)
 *   - MemoizedStatsCards (horizontal + grid variants)
 *   - MobileStatsScroll (mobile horizontal scroll)
 *
 * Automatically switches between horizontal scroll (mobile) and grid (desktop).
 */
export const UnifiedStatsDisplay = memo(function UnifiedStatsDisplay({
  stats,
  columns = 4,
  compact = false,
  className,
}: UnifiedStatsDisplayProps) {
  const isMobile = useIsMobile();

  const gridCols = useMemo(() => {
    switch (columns) {
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-2 md:grid-cols-3';
      case 4:
      default: return 'grid-cols-2 md:grid-cols-4';
    }
  }, [columns]);

  // Mobile: horizontal scroll
  if (isMobile) {
    return (
      <ScrollArea className={cn('w-full', className)}>
        <div className="flex gap-3 pb-2">
          {stats.map((stat, i) => (
            <StatCard key={i} stat={stat} compact />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }

  // Desktop: grid layout
  return (
    <div className={cn('grid gap-4', gridCols, className)}>
      {stats.map((stat, i) => (
        <StatCard key={i} stat={stat} compact={compact} />
      ))}
    </div>
  );
});
