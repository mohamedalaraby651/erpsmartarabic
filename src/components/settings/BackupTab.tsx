import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Database, 
  Download, 
  FileSpreadsheet, 
  FileJson, 
  Loader2, 
  Table as TableIcon,
  Upload,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const tables = [
  { name: 'customers', label: 'العملاء' },
  { name: 'suppliers', label: 'الموردين' },
  { name: 'products', label: 'المنتجات' },
  { name: 'invoices', label: 'الفواتير' },
  { name: 'quotations', label: 'عروض الأسعار' },
  { name: 'sales_orders', label: 'أوامر البيع' },
  { name: 'purchase_orders', label: 'أوامر الشراء' },
  { name: 'payments', label: 'المدفوعات' },
  { name: 'employees', label: 'الموظفين' },
  { name: 'tasks', label: 'المهام' },
];

export function BackupTab() {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'excel' | 'json'>('excel');
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: tableCounts = {}, isLoading } = useQuery({
    queryKey: ['backup-table-counts'],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const table of tables) {
        const { count } = await supabase
          .from(table.name as any)
          .select('*', { count: 'exact', head: true });
        counts[table.name] = count || 0;
      }
      return counts;
    },
  });

  const toggleTable = (name: string) => {
    setSelectedTables(prev => 
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    );
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
        const { data } = await supabase.from(tableName as any).select('*');
        allData[tableName] = data || [];
      }

      const fileName = `backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`;
      
      if (exportFormat === 'excel') {
        const workbook = XLSX.utils.book_new();
        for (const [name, data] of Object.entries(allData)) {
          if (data.length > 0) {
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, ws, tables.find(t => t.name === name)?.label || name);
          }
        }
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
      } else {
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success('تم تصدير النسخة الاحتياطية');
    } catch (error) {
      toast.error('فشل التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  const totalRecords = Object.values(tableCounts).reduce((sum, c) => sum + c, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          النسخ الاحتياطي والتصدير
        </CardTitle>
        <CardDescription>تصدير جميع بيانات النظام</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span>إجمالي السجلات</span>
          <span className="font-bold">{totalRecords.toLocaleString()}</span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedTables(tables.map(t => t.name))}>
            تحديد الكل
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedTables([])}>
            إلغاء الكل
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ScrollArea className="h-48">
            <div className="grid grid-cols-2 gap-2">
              {tables.map(table => (
                <div
                  key={table.name}
                  className={`flex items-center justify-between p-2 rounded border cursor-pointer ${
                    selectedTables.includes(table.name) ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => toggleTable(table.name)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox checked={selectedTables.includes(table.name)} />
                    <TableIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{table.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {tableCounts[table.name]?.toLocaleString() || 0}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex gap-4">
          <Button
            variant={exportFormat === 'excel' ? 'default' : 'outline'}
            onClick={() => setExportFormat('excel')}
          >
            <FileSpreadsheet className="h-4 w-4 ml-2" />
            Excel
          </Button>
          <Button
            variant={exportFormat === 'json' ? 'default' : 'outline'}
            onClick={() => setExportFormat('json')}
          >
            <FileJson className="h-4 w-4 ml-2" />
            JSON
          </Button>
        </div>

        <Button onClick={handleExport} disabled={isExporting || selectedTables.length === 0} className="w-full">
          {isExporting ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Download className="h-4 w-4 ml-2" />}
          تصدير النسخة الاحتياطية
        </Button>
      </CardContent>
    </Card>
  );
}
