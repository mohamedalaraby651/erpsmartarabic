import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WidgetConfig {
  id: string;
  title: string;
  enabled: boolean;
  order: number;
  size: 'full' | 'half';
}

interface DraggableWidgetProps {
  widget: WidgetConfig;
  children: React.ReactNode;
  isCustomizing?: boolean;
  onToggle?: (id: string) => void;
}

export function DraggableWidget({ 
  widget, 
  children, 
  isCustomizing = false,
  onToggle 
}: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !isCustomizing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!widget.enabled && !isCustomizing) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        widget.size === 'full' ? 'md:col-span-2' : 'md:col-span-1',
        'col-span-1',
        isDragging && 'opacity-50 z-50',
        !widget.enabled && 'opacity-50'
      )}
    >
      <Card className={cn(
        'relative h-full',
        isCustomizing && 'ring-2 ring-primary/20 ring-dashed'
      )}>
        {isCustomizing && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <button
              className="p-1.5 rounded-md hover:bg-muted cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => onToggle?.(widget.id)}
              className="p-1.5 rounded-md hover:bg-muted"
            >
              {widget.enabled ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
        )}
        {children}
      </Card>
    </div>
  );
}
