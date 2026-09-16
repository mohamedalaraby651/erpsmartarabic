/**
 * TableViewOptions (OPA-UI-003 / COL-002, COL-003).
 *
 * One neutral control that lets the user shape the table to the data they
 * need: row density, visible columns, column order and the height of the
 * scrollable body. Presentation only.
 */
import { useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, RotateCcw, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DENSITY_LABEL,
  type TableDensity,
  type TableLayout,
} from '@/hooks/useTableLayout';
import { cn } from '@/lib/utils';

const DENSITIES: TableDensity[] = ['comfortable', 'medium', 'compact'];

const HEIGHTS: { value: number; label: string }[] = [
  { value: 0, label: 'بلا حد' },
  { value: 420, label: 'قصير' },
  { value: 620, label: 'متوسط' },
  { value: 820, label: 'طويل' },
];

interface TableViewOptionsProps {
  layout: TableLayout;
  columns: { key: string; label: string }[];
}

export function TableViewOptions({ layout, columns }: TableViewOptionsProps) {
  const byKey = new Map(columns.map((c) => [c.key, c.label]));
  const [draggedKey, setDraggedKey] = useState<string | null>(null);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 px-3" aria-label="تخصيص عرض الجدول">
          <Settings2 className="h-4 w-4" />
          <span>عرض الجدول</span>
          <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {DENSITY_LABEL[layout.density]}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 border-border bg-popover p-0 text-popover-foreground shadow-lg">
        <div className="border-b border-border px-3 py-3">
          <h4 className="text-sm font-semibold">تخصيص عرض الجدول</h4>
          <p className="mt-1 text-xs text-muted-foreground">اضبط الكثافة والمساحة والأعمدة حسب احتياجك</p>
        </div>
        <div className="space-y-3 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">كثافة الصفوف</Label>
            <div className="flex gap-1.5">
              {DENSITIES.map((d) => (
                <Button
                  key={d}
                  type="button"
                  size="sm"
                  variant={layout.density === d ? 'default' : 'outline'}
                  className="h-7 flex-1 px-2 text-xs"
                  onClick={() => layout.setDensity(d)}
                >
                  {DENSITY_LABEL[d]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">ارتفاع منطقة الجدول</Label>
            <div className="flex gap-1.5">
              {HEIGHTS.map((h) => (
                <Button
                  key={h.value}
                  type="button"
                  size="sm"
                  variant={layout.bodyHeight === h.value ? 'default' : 'outline'}
                  className="h-7 flex-1 px-1 text-xs"
                  onClick={() => layout.setBodyHeight(h.value)}
                >
                  {h.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        <div className="p-3 pb-1">
          <Label className="text-xs">الأعمدة وترتيبها</Label>
        </div>
        <ScrollArea className="max-h-64">
          <div className="space-y-0.5 px-2 pb-2">
            {layout.orderedKeys.map((key, index) => {
              const visible = !layout.hidden.includes(key);
              return (
                <div
                  key={key}
                  draggable
                  onDragStart={() => setDraggedKey(key)}
                  onDragEnd={() => setDraggedKey(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedKey) layout.moveColumnTo(draggedKey, key);
                    setDraggedKey(null);
                  }}
                  className={cn(
                    'flex min-h-11 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted',
                    draggedKey === key && 'bg-muted opacity-70',
                    !visible && 'opacity-60',
                  )}
                >
                  <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden="true" />
                  <Checkbox
                    checked={visible}
                    onCheckedChange={() => layout.toggleColumn(key)}
                    aria-label={`إظهار عمود ${byKey.get(key) ?? key}`}
                  />
                  <span className="flex-1 truncate text-sm">{byKey.get(key) ?? key}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === 0}
                    aria-label="تحريك لأعلى"
                    onClick={() => layout.moveColumn(key, -1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === layout.orderedKeys.length - 1}
                    aria-label="تحريك لأسفل"
                    onClick={() => layout.moveColumn(key, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator />
        <div className="flex justify-between p-2">
          <span className="self-center px-1 text-[11px] text-muted-foreground">
            اسحب حدّ العمود لتغيير عرضه
          </span>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={layout.reset}>
            <RotateCcw className="h-3.5 w-3.5" />
            استعادة
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
