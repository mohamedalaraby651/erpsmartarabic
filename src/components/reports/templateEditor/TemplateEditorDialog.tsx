import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableColumn } from './SortableColumn';
import type { ReportTemplate, TemplateColumn } from './types';

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ReportTemplate | null;
  onChange: (t: ReportTemplate) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function TemplateEditorDialog({
  open,
  onOpenChange,
  template,
  onChange,
  onSave,
  isSaving,
}: TemplateEditorDialogProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!template) return null;

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const columns = template.template_data.columns;
    const oldIndex = columns.findIndex((c) => c.id === active.id);
    const newIndex = columns.findIndex((c) => c.id === over.id);

    onChange({
      ...template,
      template_data: {
        ...template.template_data,
        columns: arrayMove(columns, oldIndex, newIndex),
      },
    });
  };

  const updateColumn = (columnId: string, updates: Partial<TemplateColumn>) => {
    onChange({
      ...template,
      template_data: {
        ...template.template_data,
        columns: template.template_data.columns.map((c) =>
          c.id === columnId ? { ...c, ...updates } : c,
        ),
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.id ? 'تعديل القالب' : 'قالب جديد'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">عام</TabsTrigger>
            <TabsTrigger value="header">الترويسة</TabsTrigger>
            <TabsTrigger value="columns">الأعمدة</TabsTrigger>
            <TabsTrigger value="footer">التذييل</TabsTrigger>
            <TabsTrigger value="styling">التنسيق</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div>
              <Label>اسم القالب</Label>
              <Input
                value={template.name}
                onChange={(e) => onChange({ ...template, name: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={template.is_default}
                onCheckedChange={(checked) => onChange({ ...template, is_default: checked })}
              />
              <Label>قالب افتراضي</Label>
            </div>
          </TabsContent>

          <TabsContent value="header" className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={template.template_data.header?.showLogo}
                onCheckedChange={(checked) =>
                  onChange({
                    ...template,
                    template_data: {
                      ...template.template_data,
                      header: { ...template.template_data.header!, showLogo: checked },
                    },
                  })
                }
              />
              <Label>عرض الشعار</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={template.template_data.header?.showCompanyInfo}
                onCheckedChange={(checked) =>
                  onChange({
                    ...template,
                    template_data: {
                      ...template.template_data,
                      header: { ...template.template_data.header!, showCompanyInfo: checked },
                    },
                  })
                }
              />
              <Label>عرض معلومات الشركة</Label>
            </div>
            <div>
              <Label>عنوان المستند</Label>
              <Input
                value={template.template_data.header?.title || ''}
                onChange={(e) =>
                  onChange({
                    ...template,
                    template_data: {
                      ...template.template_data,
                      header: { ...template.template_data.header!, title: e.target.value },
                    },
                  })
                }
              />
            </div>
            <div>
              <Label>عنوان فرعي</Label>
              <Input
                value={template.template_data.header?.subtitle || ''}
                onChange={(e) =>
                  onChange({
                    ...template,
                    template_data: {
                      ...template.template_data,
                      header: { ...template.template_data.header!, subtitle: e.target.value },
                    },
                  })
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="columns" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              اسحب لإعادة الترتيب • فعّل/عطّل الأعمدة • غيّر التسميات
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleColumnDragEnd}
            >
              <SortableContext
                items={template.template_data.columns.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {template.template_data.columns.map((column) => (
                    <SortableColumn
                      key={column.id}
                      column={column}
                      onToggle={() => updateColumn(column.id, { visible: !column.visible })}
                      onLabelChange={(label) => updateColumn(column.id, { label })}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </TabsContent>

          <TabsContent value="footer" className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={template.template_data.footer?.showSignature}
                onCheckedChange={(checked) =>
                  onChange({
                    ...template,
                    template_data: {
                      ...template.template_data,
                      footer: { ...template.template_data.footer!, showSignature: checked },
                    },
                  })
                }
              />
              <Label>عرض مكان التوقيع</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={template.template_data.footer?.showDate}
                onCheckedChange={(checked) =>
                  onChange({
                    ...template,
                    template_data: {
                      ...template.template_data,
                      footer: { ...template.template_data.footer!, showDate: checked },
                    },
                  })
                }
              />
              <Label>عرض التاريخ</Label>
            </div>
            <div>
              <Label>ملاحظات التذييل</Label>
              <Textarea
                value={template.template_data.footer?.notes || ''}
                onChange={(e) =>
                  onChange({
                    ...template,
                    template_data: {
                      ...template.template_data,
                      footer: { ...template.template_data.footer!, notes: e.target.value },
                    },
                  })
                }
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="styling" className="space-y-4">
            <div>
              <Label>اللون الأساسي</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={template.template_data.styling?.primaryColor || '#2563eb'}
                  onChange={(e) =>
                    onChange({
                      ...template,
                      template_data: {
                        ...template.template_data,
                        styling: { ...template.template_data.styling, primaryColor: e.target.value },
                      },
                    })
                  }
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={template.template_data.styling?.primaryColor || '#2563eb'}
                  onChange={(e) =>
                    onChange({
                      ...template,
                      template_data: {
                        ...template.template_data,
                        styling: { ...template.template_data.styling, primaryColor: e.target.value },
                      },
                    })
                  }
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label>حجم الخط</Label>
              <Select
                value={template.template_data.styling?.fontSize || '12px'}
                onValueChange={(value) =>
                  onChange({
                    ...template,
                    template_data: {
                      ...template.template_data,
                      styling: { ...template.template_data.styling, fontSize: value },
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10px">صغير (10px)</SelectItem>
                  <SelectItem value="12px">متوسط (12px)</SelectItem>
                  <SelectItem value="14px">كبير (14px)</SelectItem>
                  <SelectItem value="16px">كبير جداً (16px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            <Save className="h-4 w-4 ml-2" />
            حفظ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
