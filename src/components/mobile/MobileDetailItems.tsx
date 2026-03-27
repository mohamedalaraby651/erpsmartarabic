import { memo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface DetailItemData {
  id: string;
  title: string;
  subtitle?: string;
  /** Main value displayed prominently (e.g. total price) */
  value: string;
  /** Additional info pairs rendered as small labels */
  details?: { label: string; value: string }[];
  /** Optional badge or status node */
  badge?: ReactNode;
}

interface MobileDetailItemsProps {
  items: DetailItemData[];
  className?: string;
  emptyIcon?: ReactNode;
  emptyMessage?: string;
}

/**
 * Converts read-only table rows into mobile-friendly cards.
 * Used in detail pages (Invoice items, payments, etc.)
 */
export const MobileDetailItems = memo(function MobileDetailItems({
  items,
  className,
  emptyIcon,
  emptyMessage = 'لا توجد بيانات',
}: MobileDetailItemsProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        {emptyIcon}
        <p className="text-sm text-muted-foreground mt-2">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.badge}
                </div>
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                )}
              </div>
              <p className="text-sm font-bold text-primary shrink-0">{item.value}</p>
            </div>
            {item.details && item.details.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-2 border-t">
                {item.details.map((d, i) => (
                  <span key={i} className="text-xs text-muted-foreground">
                    {d.label}: <span className="font-medium text-foreground">{d.value}</span>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
