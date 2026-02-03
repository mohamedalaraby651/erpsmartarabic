import { memo, useMemo } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatItem {
  icon: LucideIcon;
  value: string | number;
  label: string;
  color: string;
  bgColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface StatsGridProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
  compact?: boolean;
  className?: string;
}

export const StatsGrid = memo(function StatsGrid({
  stats,
  columns = 4,
  compact = false,
  className,
}: StatsGridProps) {
  const gridCols = useMemo(() => {
    switch (columns) {
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-2 md:grid-cols-3';
      case 4:
      default:
        return 'grid-cols-2 md:grid-cols-4';
    }
  }, [columns]);

  return (
    <div className={cn('grid gap-4', gridCols, className)}>
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className={cn('flex items-center gap-3', compact ? 'p-3' : 'p-4')}>
            <div className={cn('p-2 rounded-lg', stat.bgColor || `${stat.color.replace('text-', 'bg-')}/10`)}>
              <stat.icon className={cn('h-5 w-5', stat.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn('font-bold truncate', compact ? 'text-lg' : 'text-2xl')}>
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground truncate">{stat.label}</p>
            </div>
            {stat.trend && (
              <div className={cn(
                'text-xs font-medium px-2 py-1 rounded-full',
                stat.trend.isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              )}>
                {stat.trend.isPositive ? '+' : ''}{stat.trend.value}%
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
