import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Trash2 } from 'lucide-react';
import type { ReportTemplate } from './types';

interface TemplateGridProps {
  templates: ReportTemplate[] | undefined;
  isLoading: boolean;
  onEdit: (t: ReportTemplate) => void;
  onPreview: (t: ReportTemplate) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

export function TemplateGrid({ templates, isLoading, onEdit, onPreview, onDelete, onCreate }: TemplateGridProps) {
  if (isLoading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  if (!templates || templates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">لا توجد قوالب لهذا النوع</p>
          <Button className="mt-4" onClick={onCreate}>
            إنشاء قالب جديد
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
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
              {template.template_data.columns?.length || 0} عمود •{' '}
              {template.template_data.header?.showLogo ? 'مع شعار' : 'بدون شعار'}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(template)}>
                تعديل
              </Button>
              <Button size="sm" variant="outline" onClick={() => onPreview(template)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onDelete(template.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
