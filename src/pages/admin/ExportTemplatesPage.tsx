import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, Trash2, Star, StarOff, FileSpreadsheet, FileText, FileJson, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const ExportTemplatesPage = () => {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['all-export-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('export_templates')
        .select('*')
        .order('section')
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('export_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم حذف القالب بنجاح');
      queryClient.invalidateQueries({ queryKey: ['all-export-templates'] });
      setDeleteId(null);
    },
    onError: () => {
      toast.error('حدث خطأ أثناء الحذف');
    },
  });

  const toggleDefaultMutation = useMutation({
    mutationFn: async ({ id, section, isDefault }: { id: string; section: string; isDefault: boolean }) => {
      // First, unset all defaults for this section
      if (!isDefault) {
        await supabase
          .from('export_templates')
          .update({ is_default: false })
          .eq('section', section);
      }
      
      // Then set/unset this one
      const { error } = await supabase
        .from('export_templates')
        .update({ is_default: !isDefault })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم تحديث القالب الافتراضي');
      queryClient.invalidateQueries({ queryKey: ['all-export-templates'] });
    },
    onError: () => {
      toast.error('حدث خطأ أثناء التحديث');
    },
  });

  const sectionLabels: Record<string, string> = {
    customers: 'العملاء',
    suppliers: 'الموردين',
    products: 'المنتجات',
    invoices: 'الفواتير',
    quotations: 'عروض الأسعار',
    sales_orders: 'أوامر البيع',
    purchase_orders: 'أوامر الشراء',
    payments: 'المدفوعات',
    supplier_payments: 'مدفوعات الموردين',
    inventory: 'المخزون',
    categories: 'التصنيفات',
  };

  const formatIcons: Record<string, React.ReactNode> = {
    excel: <FileSpreadsheet className="h-4 w-4 text-emerald-500" />,
    pdf: <FileText className="h-4 w-4 text-red-500" />,
    csv: <FileSpreadsheet className="h-4 w-4 text-blue-500" />,
    json: <FileJson className="h-4 w-4 text-yellow-500" />,
  };

  // Group templates by section
  const groupedTemplates = templates.reduce((acc: Record<string, any[]>, template: any) => {
    const section = template.section;
    if (!acc[section]) acc[section] = [];
    acc[section].push(template);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Download className="h-6 w-6" />
          قوالب التصدير
        </h1>
        <p className="text-muted-foreground">إدارة قوالب التصدير المحفوظة</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-sm text-muted-foreground">إجمالي القوالب</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {templates.filter((t: any) => t.is_default).length}
                </p>
                <p className="text-sm text-muted-foreground">قوالب افتراضية</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {templates.filter((t: any) => t.format === 'excel').length}
                </p>
                <p className="text-sm text-muted-foreground">قوالب Excel</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <FileText className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {templates.filter((t: any) => t.format === 'pdf').length}
                </p>
                <p className="text-sm text-muted-foreground">قوالب PDF</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates by Section */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-32 mb-4" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Download className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد قوالب محفوظة</p>
            <p className="text-sm text-muted-foreground mt-2">
              يمكنك إنشاء قوالب جديدة من خلال زر التصدير في أي صفحة
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedTemplates).map(([section, sectionTemplates]) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle className="text-lg">
                {sectionLabels[section] || section}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم القالب</TableHead>
                    <TableHead>الصيغة</TableHead>
                    <TableHead>الأعمدة</TableHead>
                    <TableHead>تاريخ الإنشاء</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectionTemplates.map((template: any) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {template.is_default && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                          <span className="font-medium">{template.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {formatIcons[template.format]}
                          <span className="uppercase text-xs">{template.format}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {(template.columns as string[])?.length || 0} عمود
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(template.created_at).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              toggleDefaultMutation.mutate({
                                id: template.id,
                                section: template.section,
                                isDefault: template.is_default,
                              })
                            }
                            disabled={toggleDefaultMutation.isPending}
                          >
                            {template.is_default ? (
                              <StarOff className="h-4 w-4" />
                            ) : (
                              <Star className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(template.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا القالب؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'حذف'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExportTemplatesPage;
