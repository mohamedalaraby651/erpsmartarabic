import { memo, useState } from 'react';
import { ChevronDown, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableNavSectionProps {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  isOpen: boolean;
  onToggle: () => void;
  hasActiveItem: boolean;
  children: React.ReactNode;
  collapsed?: boolean;
  isDraggable?: boolean;
}

function DraggableNavSection({
  id,
  title,
  icon: SectionIcon,
  color,
  bgColor,
  isOpen,
  onToggle,
  hasActiveItem,
  children,
  collapsed = false,
  isDraggable = true,
}: DraggableNavSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn('space-y-1 p-1', isDragging && 'opacity-50')}
      >
        {/* Section Icon Header in Collapsed Mode */}
        <div className={cn(
          'flex items-center justify-center p-2 rounded-lg mb-2',
          bgColor
        )}>
          <SectionIcon className={cn('h-5 w-5', color)} />
        </div>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg transition-all duration-200',
        isDragging && 'opacity-50 bg-muted/50'
      )}
    >
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-between h-10 px-2 group',
              hasActiveItem && color
            )}
          >
            <div className="flex items-center gap-2">
              {isDraggable && (
                <div
                  className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-0.5"
                  {...attributes}
                  {...listeners}
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
              <div className={cn('p-1.5 rounded-md', bgColor)}>
                <SectionIcon className={cn('h-4 w-4', color)} />
              </div>
              <span className="font-medium text-sm">{title}</span>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200 text-muted-foreground',
                isOpen && 'rotate-180'
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5 pt-1 pr-3">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default memo(DraggableNavSection);
