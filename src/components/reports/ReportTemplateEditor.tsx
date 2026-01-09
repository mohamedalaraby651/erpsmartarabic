import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, FileText, Eye, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TemplateColumn {
  id: string;
  key: string;
  label: string;
  width?: number;
  visible: boolean;
}

interface ReportTemplate {
  id: string;
  name: string;
  type: string;
  template_data: {
    header?: {
      showLogo: boolean;
      showCompanyInfo: boolean;
      title: string;
      subtitle?: string;
    };
    columns: TemplateColumn[];
    footer?: {
      showSignature: boolean;
      showDate: boolean;
      notes?: string;
    };
    styling?: {
      primaryColor?: string;
      fontFamily?: string;
      fontSize?: string;
    };
  };
  is_default: boolean;
  created_at: string;
}

const REPORT_TYPES = [
  { value: "invoice", label: "فاتورة" },
  { value: "quotation", label: "عرض سعر" },
  { value: "sales_order", label: "أمر بيع" },
  { value: "purchase_order", label: "أمر شراء" },
  { value: "customer_statement", label: "كشف حساب عميل" },
  { value: "inventory_report", label: "تقرير المخزون" },
];

const DEFAULT_COLUMNS: Record<string, TemplateColumn[]> = {
  invoice: [
    { id: "1", key: "product_name", label: "المنتج", visible: true },
    { id: "2", key: "quantity", label: "الكمية", visible: true },
    { id: "3", key: "unit_price", label: "سعر الوحدة", visible: true },
    { id: "4", key: "discount", label: "الخصم", visible: true },
    { id: "5", key: "total", label: "الإجمالي", visible: true },
  ],
  quotation: [
    { id: "1", key: "product_name", label: "المنتج", visible: true },
    { id: "2", key: "description", label: "الوصف", visible: true },
    { id: "3", key: "quantity", label: "الكمية", visible: true },
    { id: "4", key: "unit_price", label: "سعر الوحدة", visible: true },
    { id: "5", key: "total", label: "الإجمالي", visible: true },
  ],
  sales_order: [
    { id: "1", key: "product_name", label: "المنتج", visible: true },
    { id: "2", key: "sku", label: "الكود", visible: true },
    { id: "3", key: "quantity", label: "الكمية", visible: true },
    { id: "4", key: "unit_price", label: "سعر الوحدة", visible: true },
    { id: "5", key: "total", label: "الإجمالي", visible: true },
  ],
  purchase_order: [
    { id: "1", key: "product_name", label: "المنتج", visible: true },
    { id: "2", key: "sku", label: "الكود", visible: true },
    { id: "3", key: "quantity", label: "الكمية", visible: true },
    { id: "4", key: "unit_price", label: "سعر الوحدة", visible: true },
    { id: "5", key: "total", label: "الإجمالي", visible: true },
  ],
  customer_statement: [
    { id: "1", key: "date", label: "التاريخ", visible: true },
    { id: "2", key: "reference", label: "المرجع", visible: true },
    { id: "3", key: "description", label: "البيان", visible: true },
    { id: "4", key: "debit", label: "مدين", visible: true },
    { id: "5", key: "credit", label: "دائن", visible: true },
    { id: "6", key: "balance", label: "الرصيد", visible: true },
  ],
  inventory_report: [
    { id: "1", key: "product_name", label: "المنتج", visible: true },
    { id: "2", key: "sku", label: "الكود", visible: true },
    { id: "3", key: "warehouse", label: "المستودع", visible: true },
    { id: "4", key: "quantity", label: "الكمية", visible: true },
    { id: "5", key: "min_stock", label: "الحد الأدنى", visible: true },
  ],
};

interface SortableColumnProps {
  column: TemplateColumn;
  onToggle: () => void;
  onLabelChange: (label: string) => void;
}

function SortableColumn({ column, onToggle, onLabelChange }: SortableColumnProps) {
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

export function ReportTemplateEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState("invoice");
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: templates, isLoading } = useQuery({
    queryKey: ["report-templates", selectedType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_templates")
        .select("*")
        .eq("type", selectedType)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ReportTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: Partial<ReportTemplate>) => {
      const { error } = await supabase.from("report_templates").insert([{
        name: template.name,
        type: template.type,
        template_data: JSON.parse(JSON.stringify(template.template_data)),
        is_default: template.is_default || false,
        created_by: user?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-templates"] });
      toast({ title: "تم إنشاء القالب بنجاح" });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (template: ReportTemplate) => {
      const { error } = await supabase
        .from("report_templates")
        .update({
          name: template.name,
          template_data: JSON.parse(JSON.stringify(template.template_data)),
          is_default: template.is_default,
        })
        .eq("id", template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-templates"] });
      toast({ title: "تم تحديث القالب بنجاح" });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("report_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-templates"] });
      toast({ title: "تم حذف القالب" });
    },
  });

  const createNewTemplate = () => {
    setEditingTemplate({
      id: "",
      name: "قالب جديد",
      type: selectedType,
      template_data: {
        header: {
          showLogo: true,
          showCompanyInfo: true,
          title: REPORT_TYPES.find((t) => t.value === selectedType)?.label || "",
          subtitle: "",
        },
        columns: DEFAULT_COLUMNS[selectedType] || [],
        footer: {
          showSignature: true,
          showDate: true,
          notes: "",
        },
        styling: {
          primaryColor: "#2563eb",
          fontFamily: "Cairo",
          fontSize: "12px",
        },
      },
      is_default: false,
      created_at: new Date().toISOString(),
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingTemplate) return;

    if (editingTemplate.id) {
      updateMutation.mutate(editingTemplate);
    } else {
      createMutation.mutate(editingTemplate);
    }
  };

  const handleColumnDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !editingTemplate) return;

    const columns = editingTemplate.template_data.columns;
    const oldIndex = columns.findIndex((c) => c.id === active.id);
    const newIndex = columns.findIndex((c) => c.id === over.id);

    setEditingTemplate({
      ...editingTemplate,
      template_data: {
        ...editingTemplate.template_data,
        columns: arrayMove(columns, oldIndex, newIndex),
      },
    });
  };

  const updateColumn = (columnId: string, updates: Partial<TemplateColumn>) => {
    if (!editingTemplate) return;

    setEditingTemplate({
      ...editingTemplate,
      template_data: {
        ...editingTemplate.template_data,
        columns: editingTemplate.template_data.columns.map((c) =>
          c.id === columnId ? { ...c, ...updates } : c
        ),
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">محرر قوالب التقارير</h2>
          <p className="text-sm text-muted-foreground">
            تخصيص قوالب الفواتير والتقارير والمستندات
          </p>
        </div>
        <Button onClick={createNewTemplate}>
          <Plus className="h-4 w-4 ml-2" />
          قالب جديد
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Label>نوع المستند:</Label>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates?.map((template) => (
            <Card key={template.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {template.name}
                  </CardTitle>
                  {template.is_default && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      افتراضي
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {template.template_data.columns?.length || 0} عمود •{" "}
                  {template.template_data.header?.showLogo ? "مع شعار" : "بدون شعار"}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingTemplate(template);
                      setIsDialogOpen(true);
                    }}
                  >
                    تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingTemplate(template);
                      setPreviewOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {(!templates || templates.length === 0) && (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد قوالب لهذا النوع</p>
                <Button className="mt-4" onClick={createNewTemplate}>
                  إنشاء قالب جديد
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Template Editor Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? "تعديل القالب" : "قالب جديد"}
            </DialogTitle>
          </DialogHeader>

          {editingTemplate && (
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
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, name: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={editingTemplate.is_default}
                    onCheckedChange={(checked) =>
                      setEditingTemplate({ ...editingTemplate, is_default: checked })
                    }
                  />
                  <Label>قالب افتراضي</Label>
                </div>
              </TabsContent>

              <TabsContent value="header" className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={editingTemplate.template_data.header?.showLogo}
                    onCheckedChange={(checked) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        template_data: {
                          ...editingTemplate.template_data,
                          header: { ...editingTemplate.template_data.header!, showLogo: checked },
                        },
                      })
                    }
                  />
                  <Label>عرض الشعار</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={editingTemplate.template_data.header?.showCompanyInfo}
                    onCheckedChange={(checked) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        template_data: {
                          ...editingTemplate.template_data,
                          header: { ...editingTemplate.template_data.header!, showCompanyInfo: checked },
                        },
                      })
                    }
                  />
                  <Label>عرض معلومات الشركة</Label>
                </div>
                <div>
                  <Label>عنوان المستند</Label>
                  <Input
                    value={editingTemplate.template_data.header?.title || ""}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        template_data: {
                          ...editingTemplate.template_data,
                          header: { ...editingTemplate.template_data.header!, title: e.target.value },
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>عنوان فرعي</Label>
                  <Input
                    value={editingTemplate.template_data.header?.subtitle || ""}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        template_data: {
                          ...editingTemplate.template_data,
                          header: { ...editingTemplate.template_data.header!, subtitle: e.target.value },
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
                    items={editingTemplate.template_data.columns.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {editingTemplate.template_data.columns.map((column) => (
                        <SortableColumn
                          key={column.id}
                          column={column}
                          onToggle={() =>
                            updateColumn(column.id, { visible: !column.visible })
                          }
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
                    checked={editingTemplate.template_data.footer?.showSignature}
                    onCheckedChange={(checked) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        template_data: {
                          ...editingTemplate.template_data,
                          footer: { ...editingTemplate.template_data.footer!, showSignature: checked },
                        },
                      })
                    }
                  />
                  <Label>عرض مكان التوقيع</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={editingTemplate.template_data.footer?.showDate}
                    onCheckedChange={(checked) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        template_data: {
                          ...editingTemplate.template_data,
                          footer: { ...editingTemplate.template_data.footer!, showDate: checked },
                        },
                      })
                    }
                  />
                  <Label>عرض التاريخ</Label>
                </div>
                <div>
                  <Label>ملاحظات التذييل</Label>
                  <Textarea
                    value={editingTemplate.template_data.footer?.notes || ""}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        template_data: {
                          ...editingTemplate.template_data,
                          footer: { ...editingTemplate.template_data.footer!, notes: e.target.value },
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
                      value={editingTemplate.template_data.styling?.primaryColor || "#2563eb"}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          template_data: {
                            ...editingTemplate.template_data,
                            styling: { ...editingTemplate.template_data.styling, primaryColor: e.target.value },
                          },
                        })
                      }
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={editingTemplate.template_data.styling?.primaryColor || "#2563eb"}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          template_data: {
                            ...editingTemplate.template_data,
                            styling: { ...editingTemplate.template_data.styling, primaryColor: e.target.value },
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
                    value={editingTemplate.template_data.styling?.fontSize || "12px"}
                    onValueChange={(value) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        template_data: {
                          ...editingTemplate.template_data,
                          styling: { ...editingTemplate.template_data.styling, fontSize: value },
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
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              <Save className="h-4 w-4 ml-2" />
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>معاينة القالب</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="border rounded-lg p-6 bg-white text-black" dir="rtl">
              {/* Header */}
              {editingTemplate.template_data.header?.showLogo && (
                <div className="flex justify-between items-start mb-6">
                  <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center">
                    شعار
                  </div>
                  {editingTemplate.template_data.header.showCompanyInfo && (
                    <div className="text-left">
                      <p className="font-bold">اسم الشركة</p>
                      <p className="text-sm">العنوان</p>
                      <p className="text-sm">الهاتف</p>
                    </div>
                  )}
                </div>
              )}
              
              <h1
                className="text-2xl font-bold text-center mb-4"
                style={{ color: editingTemplate.template_data.styling?.primaryColor }}
              >
                {editingTemplate.template_data.header?.title}
              </h1>
              
              {editingTemplate.template_data.header?.subtitle && (
                <p className="text-center text-gray-600 mb-6">
                  {editingTemplate.template_data.header.subtitle}
                </p>
              )}

              {/* Table */}
              <table className="w-full border-collapse mb-6">
                <thead>
                  <tr style={{ backgroundColor: editingTemplate.template_data.styling?.primaryColor }}>
                    {editingTemplate.template_data.columns
                      .filter((c) => c.visible)
                      .map((column) => (
                        <th key={column.id} className="p-2 text-white text-right">
                          {column.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((row) => (
                    <tr key={row} className="border-b">
                      {editingTemplate.template_data.columns
                        .filter((c) => c.visible)
                        .map((column) => (
                          <td key={column.id} className="p-2">
                            بيانات {column.label}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t flex justify-between">
                {editingTemplate.template_data.footer?.showSignature && (
                  <div className="text-center">
                    <div className="border-t border-dashed w-32 pt-2">التوقيع</div>
                  </div>
                )}
                {editingTemplate.template_data.footer?.showDate && (
                  <div>التاريخ: {new Date().toLocaleDateString("ar-EG")}</div>
                )}
              </div>
              {editingTemplate.template_data.footer?.notes && (
                <p className="mt-4 text-sm text-gray-600">
                  {editingTemplate.template_data.footer.notes}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
