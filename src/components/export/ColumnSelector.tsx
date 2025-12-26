import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GripVertical } from 'lucide-react';

export interface Column {
  key: string;
  label: string;
  selected?: boolean;
}

interface ColumnSelectorProps {
  columns: Column[];
  selectedColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

export function ColumnSelector({
  columns,
  selectedColumns,
  onColumnsChange,
}: ColumnSelectorProps) {
  const handleToggle = (key: string) => {
    if (selectedColumns.includes(key)) {
      onColumnsChange(selectedColumns.filter((k) => k !== key));
    } else {
      onColumnsChange([...selectedColumns, key]);
    }
  };

  const handleSelectAll = () => {
    onColumnsChange(columns.map((c) => c.key));
  };

  const handleDeselectAll = () => {
    onColumnsChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleSelectAll}>
          تحديد الكل
        </Button>
        <Button variant="outline" size="sm" onClick={handleDeselectAll}>
          إلغاء الكل
        </Button>
      </div>
      
      <ScrollArea className="h-[200px] border rounded-lg p-3">
        <div className="space-y-2">
          {columns.map((column) => (
            <div
              key={column.key}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <Checkbox
                id={column.key}
                checked={selectedColumns.includes(column.key)}
                onCheckedChange={() => handleToggle(column.key)}
              />
              <label
                htmlFor={column.key}
                className="flex-1 cursor-pointer text-sm"
              >
                {column.label}
              </label>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <p className="text-xs text-muted-foreground">
        تم تحديد {selectedColumns.length} من {columns.length} عمود
      </p>
    </div>
  );
}
