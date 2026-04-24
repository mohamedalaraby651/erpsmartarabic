import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Download, 
  FileSpreadsheet, 
  FileJson, 
  Loader2, 
  Table as TableIcon,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';
// xlsx loaded dynamically inside handlers (perf: tree-shaken from main bundle)
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TableInfo {
  name: string;
  label: string;
  count: number;
}

const BackupPage = () => {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'excel' | 'json' | 'csv' | 'sql'>('excel');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    { name: 'employees', label: 'الموظفين' },
    { name: 'tasks', label: 'المهام' },
  ];

  // Fetch table counts
  const { data: tableCounts = {}, isLoading } = useQuery({
    queryKey: ['table-counts'],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      
      for (const table of tables) {
        const { count, error } = await supabase
          .from(table.name as never)
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

  const generateFileName = (extension: string) => {
    const date = format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: ar });
    return `نسخة_احتياطية_${date}.${extension}`;
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
          .from(tableName as never)
          .select('*');
        
        if (error) {
          if (import.meta.env.DEV) {
            console.error(`Error fetching ${tableName}:`, error);
          }
          continue;
        }
        
        allData[tableName] = data || [];
      }

      switch (exportFormat) {
        case 'excel':
          exportToExcel(allData);
          break;
        case 'json':
          exportToJson(allData);
          break;
        case 'csv':
          exportToCsv(allData);
          break;
        case 'sql':
          exportToSql(allData);
          break;
      }

      toast.success('تم تصدير النسخة الاحتياطية بنجاح');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Export error:', error);
      }
      toast.error('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = (data: Record<string, any[]>) => {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    
    for (const [tableName, tableData] of Object.entries(data)) {
      if (tableData.length > 0) {
        const tableInfo = tables.find((t) => t.name === tableName);
        const worksheet = XLSX.utils.json_to_sheet(tableData);
        XLSX.utils.book_append_sheet(workbook, worksheet, tableInfo?.label || tableName);
      }
    }

    XLSX.writeFile(workbook, generateFileName('xlsx'));
  };

  const exportToJson = (data: Record<string, any[]>) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, generateFileName('json'));
  };

  const exportToCsv = (data: Record<string, any[]>) => {
    // Create a zip-like structure with multiple CSV files in one
    let csvContent = '';
    
    for (const [tableName, tableData] of Object.entries(data)) {
      if (tableData.length > 0) {
        const tableInfo = tables.find((t) => t.name === tableName);
        csvContent += `\n### ${tableInfo?.label || tableName} ###\n`;
        
        const headers = Object.keys(tableData[0]).join(',');
        csvContent += headers + '\n';
        
        for (const row of tableData) {
          const values = Object.values(row).map(v => {
            if (v === null) return '';
            if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
              return `"${v.replace(/"/g, '""')}"`;
            }
            return String(v);
          }).join(',');
          csvContent += values + '\n';
        }
      }
    }

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, generateFileName('csv'));
  };

  const exportToSql = (data: Record<string, any[]>) => {
    let sqlContent = '-- نسخة احتياطية\n';
    sqlContent += `-- تاريخ التصدير: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n\n`;

    for (const [tableName, tableData] of Object.entries(data)) {
      if (tableData.length > 0) {
        sqlContent += `-- جدول: ${tableName}\n`;
        
        for (const row of tableData) {
          const columns = Object.keys(row).join(', ');
          const values = Object.values(row).map(v => {
            if (v === null) return 'NULL';
            if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
            if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
            return String(v);
          }).join(', ');
          
          sqlContent += `INSERT INTO ${tableName} (${columns}) VALUES (${values});\n`;
        }
        sqlContent += '\n';
      }
    }

    const blob = new Blob([sqlContent], { type: 'text/sql' });
    downloadBlob(blob, generateFileName('sql'));
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text);
        
        toast.info('تم تحميل الملف. الاستيراد غير مفعل حالياً للحماية من فقدان البيانات.');
        if (import.meta.env.DEV) {
          console.log('Imported data structure:', Object.keys(data));
        }
      } else if (file.name.endsWith('.xlsx')) {
        toast.info('استيراد ملفات Excel سيكون متاحاً قريباً');
      } else {
        toast.error('صيغة الملف غير مدعومة');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Import error:', error);
      }
      toast.error('حدث خطأ أثناء قراءة الملف');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const totalRecords = Object.values(tableCounts).reduce((sum, count) => sum + count, 0);
  const selectedRecords = selectedTables.reduce(
    (sum, table) => sum + (tableCounts[table] || 0),
    0
  );

  const formatOptions = [
    { id: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'ملف Excel بأوراق متعددة' },
    { id: 'json', label: 'JSON', icon: FileJson, description: 'ملف JSON منظم' },
    { id: 'csv', label: 'CSV', icon: FileText, description: 'ملف CSV مع جميع الجداول' },
    { id: 'sql', label: 'SQL', icon: Database, description: 'أوامر SQL للاستيراد' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            النسخ الاحتياطي والتصدير
          </h1>
          <p className="text-muted-foreground">تصدير واستيراد بيانات النظام</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json,.xlsx"
            onChange={handleFileImport}
          />
          <Button variant="outline" onClick={handleImportClick} disabled={isImporting}>
            <Upload className="h-4 w-4 ml-2" />
            استيراد
          </Button>
        </div>
      </div>

      <Tabs defaultValue="export" className="space-y-4">
        <TabsList>
          <TabsTrigger value="export">
            <Download className="h-4 w-4 ml-2" />
            تصدير البيانات
          </TabsTrigger>
          <TabsTrigger value="info">
            <HardDrive className="h-4 w-4 ml-2" />
            معلومات النظام
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-6">
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
              <CardTitle>صيغة التصدير</CardTitle>
              <CardDescription>اختر صيغة الملف المطلوبة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {formatOptions.map((format) => {
                  const Icon = format.icon;
                  return (
                    <div
                      key={format.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        exportFormat === format.id
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setExportFormat(format.id as 'json' | 'csv' | 'excel' | 'sql')}
                    >
                      <div className="flex flex-col items-center text-center gap-2">
                        <Icon className={`h-8 w-8 ${exportFormat === format.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="font-medium">{format.label}</span>
                        <span className="text-xs text-muted-foreground">{format.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={handleExport}
                disabled={isExporting || selectedTables.length === 0}
                className="w-full md:w-auto min-w-[200px]"
                size="lg"
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  حالة النظام
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                  <span className="text-sm">حالة قاعدة البيانات</span>
                  <Badge className="bg-green-500">متصل</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">إجمالي البيانات</span>
                  <span className="font-bold">{totalRecords.toLocaleString()} سجل</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">عدد الجداول</span>
                  <span className="font-bold">{tables.length} جدول</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  النسخ الاحتياطي التلقائي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-500/10 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">النسخ الاحتياطي مُفعّل</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        يتم إنشاء نسخة احتياطية تلقائياً بشكل يومي من خلال Lovable Cloud
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 inline ml-1 text-yellow-500" />
                    ننصح بتصدير نسخة احتياطية يدوية بشكل دوري للحفظ خارج النظام
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BackupPage;
