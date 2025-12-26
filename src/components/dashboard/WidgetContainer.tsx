import { useState, useCallback } from 'react';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableWidget, WidgetConfig } from './DraggableWidget';
import { Button } from '@/components/ui/button';
import { Settings2, Check, X } from 'lucide-react';

interface WidgetContainerProps {
  widgets: WidgetConfig[];
  onWidgetsChange: (widgets: WidgetConfig[]) => void;
  renderWidget: (widget: WidgetConfig) => React.ReactNode;
  isSaving?: boolean;
}

export function WidgetContainer({
  widgets,
  onWidgetsChange,
  renderWidget,
  isSaving = false,
}: WidgetContainerProps) {
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>(widgets);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order: index,
        }));
        return newItems;
      });
    }
  }, []);

  const handleToggleWidget = useCallback((id: string) => {
    setLocalWidgets((items) =>
      items.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  }, []);

  const handleStartCustomizing = () => {
    setLocalWidgets(widgets);
    setIsCustomizing(true);
  };

  const handleSave = () => {
    onWidgetsChange(localWidgets);
    setIsCustomizing(false);
  };

  const handleCancel = () => {
    setLocalWidgets(widgets);
    setIsCustomizing(false);
  };

  const displayWidgets = isCustomizing ? localWidgets : widgets;
  const sortedWidgets = [...displayWidgets].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {isCustomizing ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-4 w-4 ml-2" />
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Check className="h-4 w-4 ml-2" />
              {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartCustomizing}
          >
            <Settings2 className="h-4 w-4 ml-2" />
            تخصيص لوحة التحكم
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortedWidgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedWidgets.map((widget) => (
              <DraggableWidget
                key={widget.id}
                widget={widget}
                isCustomizing={isCustomizing}
                onToggle={handleToggleWidget}
              >
                {renderWidget(widget)}
              </DraggableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
