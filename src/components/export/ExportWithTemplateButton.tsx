import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColumnSelector, Column } from './ColumnSelector';
import { generatePDF } from '@/lib/pdfGenerator';
import { Download, FileSpreadsheet, FileText, FileJson, Loader2, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getSafeErrorMessage, logErrorSafely } from '@/lib/errorHandler';
import * as XLSX from 'xlsx';

interface ExportWithTemplateButtonProps {
  section: string;
  sectionLabel: string;
  data: any[];
  columns: Column[];
}

type ExportFormat = 'excel' | 'pdf' | 'csv' | 'json';

export function ExportWithTemplateButton({
  section,
  sectionLabel,
  data,
  columns,
}: ExportWithTemplateButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns.map((c) => c.key));
  const [includeLogo, setIncludeLogo] = useState(true);
  const [includeCompanyInfo, setIncludeCompanyInfo] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('export');

  // Fetch saved templates
  const { data: templates = [] } = useQuery({
    queryKey: ['export-templates', section],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('export_templates')
        .select('*')
        .eq('section', section)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!newTemplateName.trim()) {
        throw new Error('يرجى إدخال اسم القالب');
      }
      const { error } = await supabase.from('export_templates').insert({
        name: newTemplateName,
        section,
        columns: selectedColumns,
        format: selectedFormat,
        include_logo: includeLogo,
        include_company_info: includeCompanyInfo,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم حفظ القالب بنجاح');
      setNewTemplateName('');
      queryClient.invalidateQueries({ queryKey: ['export-templates', section] });
    },
    onError: (error: any) => {
      logErrorSafely('ExportWithTemplateButton.saveTemplateMutation', error);
      toast.error(getSafeErrorMessage(error));
    },
  });

  // Load template settings when selected
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t: any) => t.id === selectedTemplateId);
      if (template) {
        setSelectedColumns(template.columns as string[]);
        setSelectedFormat(template.format as ExportFormat);
        setIncludeLogo(template.include_logo);
        setIncludeCompanyInfo(template.include_company_info);
      }
    }
  }, [selectedTemplateId, templates]);

  const handleExport = async () => {
    if (!data || data.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    if (selectedColumns.length === 0) {
      toast.error('يرجى اختيار عمود واحد على الأقل');
      return;
    }

    setIsExporting(true);
    try {
      const exportColumns = columns.filter((c) => selectedColumns.includes(c.key));
      const filename = `${sectionLabel}_${new Date().toISOString().split('T')[0]}`;

      switch (selectedFormat) {
        case 'pdf':
          await generatePDF({
            title: sectionLabel,
            data,
            columns: exportColumns,
            includeLogo,
            includeCompanyInfo,
          });
          break;

        case 'excel':
          exportToExcel(data, exportColumns, filename);
          break;

        case 'csv':
          exportToCSV(data, exportColumns, filename);
          break;

        case 'json':
          exportToJSON(data, exportColumns, filename);
          break;
      }

      toast.success('تم تصدير الملف بنجاح');
      setOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = (data: any[], cols: Column[], filename: string) => {
    const exportData = data.map((row) => {
      const newRow: Record<string, any> = {};
      cols.forEach((col) => {
        newRow[col.label] = row[col.key];
      });
      return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'البيانات');

    const colWidths = cols.map((col) => ({
      wch: Math.max(col.label.length, 15),
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const exportToCSV = (data: any[], cols: Column[], filename: string) => {
    const exportData = data.map((row) => {
      const newRow: Record<string, any> = {};
      cols.forEach((col) => {
        newRow[col.label] = row[col.key];
      });
      return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = (data: any[], cols: Column[], filename: string) => {
    const exportData = data.map((row) => {
      const newRow: Record<string, any> = {};
      cols.forEach((col) => {
        newRow[col.key] = row[col.key];
      });
      return newRow;
    });

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 ml-2" />
          تصدير
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>تصدير {sectionLabel}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">تصدير</TabsTrigger>
            <TabsTrigger value="template">حفظ قالب</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4 mt-4">
            {/* Template Selection */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>اختر قالب</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="القالب الافتراضي" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">القالب الافتراضي</SelectItem>
                    {templates.map((template: any) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} {template.is_default && '(افتراضي)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Format Selection */}
            <div className="space-y-2">
              <Label>صيغة الملف</Label>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant={selectedFormat === 'excel' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFormat('excel')}
                  className="flex flex-col h-auto py-3"
                >
                  <FileSpreadsheet className="h-5 w-5 mb-1" />
                  <span className="text-xs">Excel</span>
                </Button>
                <Button
                  type="button"
                  variant={selectedFormat === 'pdf' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFormat('pdf')}
                  className="flex flex-col h-auto py-3"
                >
                  <FileText className="h-5 w-5 mb-1" />
                  <span className="text-xs">PDF</span>
                </Button>
                <Button
                  type="button"
                  variant={selectedFormat === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFormat('csv')}
                  className="flex flex-col h-auto py-3"
                >
                  <FileSpreadsheet className="h-5 w-5 mb-1" />
                  <span className="text-xs">CSV</span>
                </Button>
                <Button
                  type="button"
                  variant={selectedFormat === 'json' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFormat('json')}
                  className="flex flex-col h-auto py-3"
                >
                  <FileJson className="h-5 w-5 mb-1" />
                  <span className="text-xs">JSON</span>
                </Button>
              </div>
            </div>

            {/* Column Selection */}
            <div className="space-y-2">
              <Label>اختر الأعمدة</Label>
              <ColumnSelector
                columns={columns}
                selectedColumns={selectedColumns}
                onColumnsChange={setSelectedColumns}
              />
            </div>

            {/* PDF Options */}
            {selectedFormat === 'pdf' && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="includeLogo"
                    checked={includeLogo}
                    onCheckedChange={(checked) => setIncludeLogo(!!checked)}
                  />
                  <label htmlFor="includeLogo" className="text-sm cursor-pointer">
                    تضمين شعار الشركة
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="includeCompanyInfo"
                    checked={includeCompanyInfo}
                    onCheckedChange={(checked) => setIncludeCompanyInfo(!!checked)}
                  />
                  <label htmlFor="includeCompanyInfo" className="text-sm cursor-pointer">
                    تضمين معلومات الشركة
                  </label>
                </div>
              </div>
            )}

            <Button
              onClick={handleExport}
              disabled={isExporting || selectedColumns.length === 0}
              className="w-full"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري التصدير...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 ml-2" />
                  تصدير الآن
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="template" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>اسم القالب</Label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="مثال: تقرير المبيعات الشهري"
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
              <p><strong>الصيغة:</strong> {selectedFormat.toUpperCase()}</p>
              <p><strong>الأعمدة:</strong> {selectedColumns.length} عمود</p>
              {selectedFormat === 'pdf' && (
                <>
                  <p><strong>شعار الشركة:</strong> {includeLogo ? 'نعم' : 'لا'}</p>
                  <p><strong>معلومات الشركة:</strong> {includeCompanyInfo ? 'نعم' : 'لا'}</p>
                </>
              )}
            </div>

            <Button
              onClick={() => saveTemplateMutation.mutate()}
              disabled={saveTemplateMutation.isPending || !newTemplateName.trim()}
              className="w-full"
            >
              {saveTemplateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  حفظ القالب
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
