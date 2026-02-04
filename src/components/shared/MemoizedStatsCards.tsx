import React, { memo, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  bgColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface MemoizedStatsCardsProps {
  stats: StatItem[];
  className?: string;
  variant?: 'horizontal' | 'grid';
}

const StatCard = memo(({ stat }: { stat: StatItem }) => {
  const { label, value, icon: Icon, color = 'text-primary', bgColor = 'bg-primary/10', trend } = stat;

  return (
    <Card className="min-w-[140px] shrink-0 transition-shadow hover:shadow-md">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-lg', bgColor)}>
            <Icon className={cn('h-4 w-4', color)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold truncate">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            {trend && (
              <p className={cn(
                'text-xs font-medium',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

export const MemoizedStatsCards = memo(({ stats, className, variant = 'horizontal' }: MemoizedStatsCardsProps) => {
  const containerClass = useMemo(() => {
    if (variant === 'horizontal') {
      return 'flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4';
    }
    return 'grid grid-cols-2 md:grid-cols-4 gap-4';
  }, [variant]);

  return (
    <div className={cn(containerClass, className)}>
      {stats.map((stat, index) => (
        <StatCard key={`${stat.label}-${index}`} stat={stat} />
      ))}
    </div>
  );
});

MemoizedStatsCards.displayName = 'MemoizedStatsCards';
