import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings2, GripVertical, Eye, EyeOff } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "@/hooks/use-toast";

export interface FieldConfig {
  id: string;
  key: string;
  label: string;
  visible: boolean;
  required?: boolean;
  editable?: boolean;
}

interface InlineCustomizerProps {
  section: string;
  sectionLabel: string;
  fields: FieldConfig[];
  onFieldsChange: (fields: FieldConfig[]) => void;
  children?: React.ReactNode;
}

interface SortableFieldProps {
  field: FieldConfig;
  onToggleVisibility: () => void;
  onLabelChange: (label: string) => void;
}

function SortableField({ field, onToggleVisibility, onLabelChange }: SortableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });

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
      <div {...attributes} {...listeners} className="cursor-grab hover:text-primary">
        <GripVertical className="h-4 w-4" />
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onToggleVisibility}
        disabled={field.required}
      >
        {field.visible ? (
          <Eye className="h-4 w-4 text-green-500" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
      
      <Input
        value={field.label}
        onChange={(e) => onLabelChange(e.target.value)}
        className="flex-1"
        disabled={!field.editable}
      />
      
      <span className="text-xs text-muted-foreground font-mono">{field.key}</span>
      
      {field.required && (
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
          مطلوب
        </span>
      )}
    </div>
  );
}

export function InlineCustomizer({ 
  section, 
  sectionLabel, 
  fields, 
  onFieldsChange,
  children 
}: InlineCustomizerProps) {
  const { toast } = useToast();
  const [localFields, setLocalFields] = useState<FieldConfig[]>(fields);
  const [isOpen, setIsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localFields.findIndex((f) => f.id === active.id);
    const newIndex = localFields.findIndex((f) => f.id === over.id);
    setLocalFields(arrayMove(localFields, oldIndex, newIndex));
  };

  const toggleVisibility = (fieldId: string) => {
    setLocalFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, visible: !f.visible } : f))
    );
  };

  const updateLabel = (fieldId: string, label: string) => {
    setLocalFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, label } : f))
    );
  };

  const handleSave = () => {
    onFieldsChange(localFields);
    toast({ title: "تم حفظ التخصيص" });
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalFields(fields);
  };

  const showAll = () => {
    setLocalFields((prev) => prev.map((f) => ({ ...f, visible: true })));
  };

  const hideOptional = () => {
    setLocalFields((prev) =>
      prev.map((f) => ({ ...f, visible: f.required ? true : false }))
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings2 className="h-4 w-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>تخصيص {sectionLabel}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Tabs defaultValue="fields">
            <TabsList className="w-full">
              <TabsTrigger value="fields" className="flex-1">الحقول</TabsTrigger>
              <TabsTrigger value="layout" className="flex-1">التخطيط</TabsTrigger>
            </TabsList>

            <TabsContent value="fields" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={showAll}>
                  إظهار الكل
                </Button>
                <Button variant="outline" size="sm" onClick={hideOptional}>
                  إخفاء الاختيارية
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                اسحب لإعادة الترتيب • انقر العين للإظهار/الإخفاء
              </p>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localFields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {localFields.map((field) => (
                      <SortableField
                        key={field.id}
                        field={field}
                        onToggleVisibility={() => toggleVisibility(field.id)}
                        onLabelChange={(label) => updateLabel(field.id, label)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </TabsContent>

            <TabsContent value="layout" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>عرض في أعمدة متعددة</Label>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <Label>إظهار التسميات أعلى الحقول</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label>عرض مضغوط</Label>
                  <Switch />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSave} className="flex-1">
              حفظ التغييرات
            </Button>
            <Button variant="outline" onClick={handleReset}>
              إعادة تعيين
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Hook to use with forms
export function useInlineCustomizer(section: string, defaultFields: FieldConfig[]) {
  const STORAGE_KEY = `inline_customizer_${section}`;
  
  const [fields, setFields] = useState<FieldConfig[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return defaultFields;
      }
    }
    return defaultFields;
  });

  const updateFields = (newFields: FieldConfig[]) => {
    setFields(newFields);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFields));
  };

  const visibleFields = fields.filter((f) => f.visible);

  return {
    fields,
    visibleFields,
    updateFields,
  };
}
