import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { REPORT_TYPES, DEFAULT_COLUMNS, type ReportTemplate } from './templateEditor/types';
import { TemplateGrid } from './templateEditor/TemplateGrid';
import { TemplateEditorDialog } from './templateEditor/TemplateEditorDialog';
import { TemplatePreviewDialog } from './templateEditor/TemplatePreviewDialog';

export function ReportTemplateEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('invoice');
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ReportTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['report-templates', selectedType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('type', selectedType)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ReportTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: Partial<ReportTemplate>) => {
      const { error } = await supabase.from('report_templates').insert([
        {
          name: template.name,
          type: template.type,
          template_data: JSON.parse(JSON.stringify(template.template_data)),
          is_default: template.is_default || false,
          created_by: user?.id,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast({ title: 'تم إنشاء القالب بنجاح' });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (template: ReportTemplate) => {
      const { error } = await supabase
        .from('report_templates')
        .update({
          name: template.name,
          template_data: JSON.parse(JSON.stringify(template.template_data)),
          is_default: template.is_default,
        })
        .eq('id', template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast({ title: 'تم تحديث القالب بنجاح' });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('report_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast({ title: 'تم حذف القالب' });
    },
  });

  const createNewTemplate = () => {
    setEditingTemplate({
      id: '',
      name: 'قالب جديد',
      type: selectedType,
      template_data: {
        header: {
          showLogo: true,
          showCompanyInfo: true,
          title: REPORT_TYPES.find((t) => t.value === selectedType)?.label || '',
          subtitle: '',
        },
        columns: DEFAULT_COLUMNS[selectedType] || [],
        footer: { showSignature: true, showDate: true, notes: '' },
        styling: { primaryColor: '#2563eb', fontFamily: 'Cairo', fontSize: '12px' },
      },
      is_default: false,
      created_at: new Date().toISOString(),
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingTemplate) return;
    if (editingTemplate.id) updateMutation.mutate(editingTemplate);
    else createMutation.mutate(editingTemplate);
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

      <TemplateGrid
        templates={templates}
        isLoading={isLoading}
        onCreate={createNewTemplate}
        onEdit={(t) => {
          setEditingTemplate(t);
          setIsDialogOpen(true);
        }}
        onPreview={(t) => {
          setPreviewTemplate(t);
          setPreviewOpen(true);
        }}
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      <TemplateEditorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        template={editingTemplate}
        onChange={setEditingTemplate}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <TemplatePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        template={previewTemplate}
      />
    </div>
  );
}
