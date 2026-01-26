import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Database, 
  Download, 
  FileSpreadsheet, 
  FileJson, 
  Loader2, 
  Table as TableIcon,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { logErrorSafely, getSafeErrorMessage } from '@/lib/errorHandler';
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
import { Input } from '@/components/ui/input';

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
  const queryClient = useQueryClient();
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'excel' | 'json'>('excel');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importData, setImportData] = useState<Record<string, any[]> | null>(null);
  const [confirmText, setConfirmText] = useState('');
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
      logErrorSafely('BackupTab', error);
      toast.error('فشل التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text);
        setImportData(data);
        setShowImportConfirm(true);
      } else if (file.name.endsWith('.xlsx')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const data: Record<string, any[]> = {};
        
        for (const sheetName of workbook.SheetNames) {
          const tableName = tables.find(t => t.label === sheetName)?.name || sheetName;
          const worksheet = workbook.Sheets[sheetName];
          data[tableName] = XLSX.utils.sheet_to_json(worksheet);
        }
        
        setImportData(data);
        setShowImportConfirm(true);
      } else {
        toast.error('صيغة الملف غير مدعومة. يرجى استخدام JSON أو Excel.');
      }
    } catch (error) {
      logErrorSafely('BackupTab', error);
      toast.error('فشل قراءة الملف');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImport = async () => {
    if (!importData || confirmText !== 'استيراد') {
      toast.error('يرجى كتابة "استيراد" للتأكيد');
      return;
    }

    setIsImporting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const [tableName, records] of Object.entries(importData)) {
        if (!tables.find(t => t.name === tableName)) continue;
        if (!records || records.length === 0) continue;

        // Remove id and timestamps to avoid conflicts
        const cleanedRecords = records.map((record: any) => {
          const { id, created_at, updated_at, ...rest } = record;
          return rest;
        });

        const { error } = await supabase
          .from(tableName as any)
          .upsert(cleanedRecords, { onConflict: 'id' });

        if (error) {
          logErrorSafely('BackupTab', error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      queryClient.invalidateQueries();
      
      if (errorCount === 0) {
        toast.success(`تم استيراد ${successCount} جداول بنجاح`);
      } else {
        toast.warning(`تم استيراد ${successCount} جداول، فشل ${errorCount}`);
      }
    } catch (error) {
      logErrorSafely('BackupTab', error);
      toast.error(getSafeErrorMessage(error));
    } finally {
      setIsImporting(false);
      setShowImportConfirm(false);
      setImportData(null);
      setConfirmText('');
    }
  };

  const totalRecords = Object.values(tableCounts).reduce((sum, c) => sum + c, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            النسخ الاحتياطي والتصدير
          </CardTitle>
          <CardDescription>تصدير واستيراد بيانات النظام</CardDescription>
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

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleExport} disabled={isExporting || selectedTables.length === 0} className="flex-1">
              {isExporting ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Download className="h-4 w-4 ml-2" />}
              تصدير النسخة الاحتياطية
            </Button>
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json,.xlsx"
              onChange={handleFileSelect}
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex-1"
            >
              {isImporting ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Upload className="h-4 w-4 ml-2" />}
              استيراد نسخة احتياطية
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Confirmation Dialog */}
      <AlertDialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              تأكيد الاستيراد
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                سيتم استيراد البيانات من الملف المحدد. قد يؤدي ذلك إلى تعديل البيانات الحالية.
              </p>
              {importData && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-2">الجداول المتاحة للاستيراد:</p>
                  <ul className="list-disc list-inside">
                    {Object.entries(importData).map(([name, records]) => (
                      <li key={name}>
                        {tables.find(t => t.name === name)?.label || name}: {records.length} سجل
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="pt-2">
                <label className="text-sm font-medium">
                  اكتب "استيراد" للتأكيد:
                </label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="استيراد"
                  className="mt-1"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setImportData(null);
              setConfirmText('');
            }}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImport}
              disabled={confirmText !== 'استيراد' || isImporting}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {isImporting ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : null}
              تأكيد الاستيراد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
