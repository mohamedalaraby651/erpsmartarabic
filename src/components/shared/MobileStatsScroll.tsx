import { memo, useMemo } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MobileStatItem {
  icon: LucideIcon;
  value: string | number;
  label: string;
  color: string;
}

interface MobileStatsScrollProps {
  stats: MobileStatItem[];
  className?: string;
}

export const MobileStatsScroll = memo(function MobileStatsScroll({
  stats,
  className,
}: MobileStatsScrollProps) {
  return (
    <ScrollArea className={cn('w-full', className)}>
      <div className="flex gap-3 pb-2">
        {stats.map((stat, index) => (
          <Card key={index} className="min-w-[110px] shrink-0">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <stat.icon className={cn('h-4 w-4', stat.color)} />
                <div>
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
});
