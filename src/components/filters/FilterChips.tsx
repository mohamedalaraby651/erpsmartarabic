import React, { forwardRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface FilterChip {
  id: string;
  label: string;
  value: string;
  active?: boolean;
}

interface FilterChipsProps {
  chips: FilterChip[];
  activeChips: string[];
  onToggle: (chipId: string) => void;
  onClearAll?: () => void;
  className?: string;
}

export const FilterChips = forwardRef<HTMLDivElement, FilterChipsProps>(function FilterChips({
  chips,
  activeChips,
  onToggle,
  onClearAll,
  className,
}, ref) {
  const hasActiveFilters = activeChips.length > 0;

  return (
    <div ref={ref} className={cn('py-2', className)}>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-2 px-3">
          {hasActiveFilters && onClearAll && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-8 text-xs text-muted-foreground"
              onClick={onClearAll}
            >
              <X className="h-3 w-3 ml-1" />
              مسح الكل
            </Button>
          )}
          
          {chips.map((chip) => {
            const isActive = activeChips.includes(chip.id);
            return (
              <Badge
                key={chip.id}
                variant={isActive ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer transition-colors shrink-0 px-3 py-1.5',
                  isActive
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'hover:bg-accent'
                )}
                onClick={() => onToggle(chip.id)}
              >
                {chip.label}
                {isActive && (
                  <X className="h-3 w-3 mr-1" />
                )}
              </Badge>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
});
