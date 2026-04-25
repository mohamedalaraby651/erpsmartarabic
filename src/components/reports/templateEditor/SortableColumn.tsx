import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { TemplateColumn } from './types';

interface SortableColumnProps {
  column: TemplateColumn;
  onToggle: () => void;
  onLabelChange: (label: string) => void;
}

export function SortableColumn({ column, onToggle, onLabelChange }: SortableColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border"
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Switch checked={column.visible} onCheckedChange={onToggle} />
      <Input
        value={column.label}
        onChange={(e) => onLabelChange(e.target.value)}
        className="flex-1"
      />
      <span className="text-xs text-muted-foreground">{column.key}</span>
    </div>
  );
}
