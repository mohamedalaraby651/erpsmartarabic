import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings2, GripVertical, RotateCcw } from 'lucide-react';
import { ColumnConfig } from '@/hooks/useTableCustomization';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ColumnCustomizerProps {
  columns: ColumnConfig[];
  onToggleVisibility: (columnId: string) => void;
  onReorder: (newOrder: string[]) => void;
  onReset: () => void;
}

function SortableColumn({
  column,
  onToggle,
}: {
  column: ColumnConfig;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 py-2 px-1 rounded hover:bg-muted/50"
    >
      <button
        className="cursor-grab hover:bg-muted p-1 rounded"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <Checkbox
        id={column.id}
        checked={column.visible}
        onCheckedChange={onToggle}
      />
      <Label htmlFor={column.id} className="flex-1 cursor-pointer">
        {column.label}
      </Label>
    </div>
  );
}

export function ColumnCustomizer({
  columns,
  onToggleVisibility,
  onReorder,
  onReset,
}: ColumnCustomizerProps) {
  const [open, setOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex(col => col.id === active.id);
      const newIndex = columns.findIndex(col => col.id === over.id);
      const newOrder = arrayMove(columns, oldIndex, newIndex).map(col => col.id);
      onReorder(newOrder);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 ml-2" />
          الأعمدة
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">تخصيص الأعمدة</h4>
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="h-3 w-3 ml-1" />
              إعادة
            </Button>
          </div>
          
          <div className="border-t pt-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columns.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {columns.map((column) => (
                  <SortableColumn
                    key={column.id}
                    column={column}
                    onToggle={() => onToggleVisibility(column.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            اسحب لإعادة الترتيب
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
