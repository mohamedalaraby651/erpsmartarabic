import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Download, FileSpreadsheet, FileJson, Loader2, Table as TableIcon } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface TableInfo {
  name: string;
  label: string;
  count: number;
}

const BackupPage = () => {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'excel' | 'json'>('excel');
  const [isExporting, setIsExporting] = useState(false);

  const tables: { name: string; label: string }[] = [
    { name: 'customers', label: 'العملاء' },
    { name: 'customer_addresses', label: 'عناوين العملاء' },
    { name: 'customer_categories', label: 'تصنيفات العملاء' },
    { name: 'suppliers', label: 'الموردين' },
    { name: 'products', label: 'المنتجات' },
    { name: 'product_categories', label: 'تصنيفات المنتجات' },
    { name: 'product_variants', label: 'متغيرات المنتجات' },
    { name: 'product_stock', label: 'المخزون' },
    { name: 'warehouses', label: 'المخازن' },
    { name: 'quotations', label: 'عروض الأسعار' },
    { name: 'quotation_items', label: 'بنود عروض الأسعار' },
    { name: 'sales_orders', label: 'أوامر البيع' },
    { name: 'sales_order_items', label: 'بنود أوامر البيع' },
    { name: 'invoices', label: 'الفواتير' },
    { name: 'invoice_items', label: 'بنود الفواتير' },
    { name: 'payments', label: 'المدفوعات' },
    { name: 'purchase_orders', label: 'أوامر الشراء' },
    { name: 'purchase_order_items', label: 'بنود أوامر الشراء' },
    { name: 'supplier_payments', label: 'مدفوعات الموردين' },
    { name: 'stock_movements', label: 'حركات المخزون' },
  ];

  // Fetch table counts
  const { data: tableCounts = {}, isLoading } = useQuery({
    queryKey: ['table-counts'],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      
      for (const table of tables) {
        const { count, error } = await supabase
          .from(table.name as any)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          counts[table.name] = count || 0;
        }
      }
      
      return counts;
    },
  });

  const toggleTable = (tableName: string) => {
    if (selectedTables.includes(tableName)) {
      setSelectedTables(selectedTables.filter((t) => t !== tableName));
    } else {
      setSelectedTables([...selectedTables, tableName]);
    }
  };

  const selectAll = () => {
    setSelectedTables(tables.map((t) => t.name));
  };

  const deselectAll = () => {
    setSelectedTables([]);
  };

  const handleExport = async () => {
    if (selectedTables.length === 0) {
      toast.error('يرجى اختيار جدول واحد على الأقل');
      return;
    }

    setIsExporting(true);
    try {
      const allData: Record<string, any[]> = {};

      for (const tableName of selectedTables) {
        const { data, error } = await supabase
          .from(tableName as any)
          .select('*');
        
        if (error) {
          console.error(`Error fetching ${tableName}:`, error);
          continue;
        }
        
        allData[tableName] = data || [];
      }

      if (exportFormat === 'excel') {
        const workbook = XLSX.utils.book_new();
        
        for (const [tableName, data] of Object.entries(allData)) {
          if (data.length > 0) {
            const tableInfo = tables.find((t) => t.name === tableName);
            const worksheet = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, worksheet, tableInfo?.label || tableName);
          }
        }

        XLSX.writeFile(workbook, `نسخة_احتياطية_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else {
        const json = JSON.stringify(allData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `نسخة_احتياطية_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }

      toast.success('تم تصدير النسخة الاحتياطية بنجاح');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  const totalRecords = Object.values(tableCounts).reduce((sum, count) => sum + count, 0);
  const selectedRecords = selectedTables.reduce(
    (sum, table) => sum + (tableCounts[table] || 0),
    0
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          النسخ الاحتياطي والتصدير
        </h1>
        <p className="text-muted-foreground">تصدير بيانات النظام للحفظ الاحتياطي</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">إحصائيات النظام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">إجمالي الجداول</span>
              <span className="font-bold">{tables.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">إجمالي السجلات</span>
              <span className="font-bold">{totalRecords.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <span className="text-sm">السجلات المحددة</span>
              <span className="font-bold text-primary">{selectedRecords.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Table Selection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>اختر الجداول</CardTitle>
                <CardDescription>حدد الجداول التي تريد تصديرها</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  تحديد الكل
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  إلغاء الكل
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-2 gap-3">
                  {tables.map((table) => (
                    <div
                      key={table.name}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTables.includes(table.name)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleTable(table.name)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedTables.includes(table.name)}
                          onCheckedChange={() => toggleTable(table.name)}
                        />
                        <div className="flex items-center gap-2">
                          <TableIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{table.label}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {(tableCounts[table.name] || 0).toLocaleString()} سجل
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>خيارات التصدير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Label>صيغة الملف:</Label>
              <div className="flex gap-2">
                <Button
                  variant={exportFormat === 'excel' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('excel')}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button
                  variant={exportFormat === 'json' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('json')}
                  className="flex items-center gap-2"
                >
                  <FileJson className="h-4 w-4" />
                  JSON
                </Button>
              </div>
            </div>

            <div className="flex-1" />

            <Button
              onClick={handleExport}
              disabled={isExporting || selectedTables.length === 0}
              className="min-w-[200px]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري التصدير...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 ml-2" />
                  تصدير النسخة الاحتياطية
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupPage;
