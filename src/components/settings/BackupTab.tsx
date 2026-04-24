import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Download, 
  FileSpreadsheet, 
  FileJson, 
  Loader2, 
  Table as TableIcon,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
// xlsx loaded dynamically inside handlers (perf: tree-shaken from main bundle)
import { format } from 'date-fns';
import { logErrorSafely, getSafeErrorMessage } from '@/lib/errorHandler';
import { ImportOptionsDialog, type ImportMode } from './ImportOptionsDialog';

// Table definitions with match keys for smart import
const tables = [
  { name: 'customers', label: 'العملاء', matchKeys: ['name', 'phone'] },
  { name: 'suppliers', label: 'الموردين', matchKeys: ['name', 'phone'] },
  { name: 'products', label: 'المنتجات', matchKeys: ['sku', 'name'] },
  { name: 'invoices', label: 'الفواتير', matchKeys: ['invoice_number'] },
  { name: 'quotations', label: 'عروض الأسعار', matchKeys: ['quotation_number'] },
  { name: 'sales_orders', label: 'أوامر البيع', matchKeys: ['order_number'] },
  { name: 'purchase_orders', label: 'أوامر الشراء', matchKeys: ['order_number'] },
  { name: 'payments', label: 'المدفوعات', matchKeys: ['payment_number'] },
  { name: 'employees', label: 'الموظفين', matchKeys: ['employee_number'] },
  { name: 'tasks', label: 'المهام', matchKeys: ['title'] },
];

interface ImportResult {
  table: string;
  tableLabel: string;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
}

export function BackupTab() {
  const queryClient = useQueryClient();
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'excel' | 'json'>('excel');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState<Record<string, any[]> | null>(null);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: tableCounts = {}, isLoading } = useQuery({
    queryKey: ['backup-table-counts'],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const table of tables) {
        const { count } = await supabase
          .from(table.name as never)
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
        const { data } = await supabase.from(tableName as never).select('*');
        allData[tableName] = data || [];
      }

      const fileName = `backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`;
      
      if (exportFormat === 'excel') {
        const XLSX = await import('xlsx');
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
        setShowImportDialog(true);
      } else if (file.name.endsWith('.xlsx')) {
        const buffer = await file.arrayBuffer();
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(buffer, { type: 'array' });
        const data: Record<string, any[]> = {};
        
        for (const sheetName of workbook.SheetNames) {
          const tableName = tables.find(t => t.label === sheetName)?.name || sheetName;
          const worksheet = workbook.Sheets[sheetName];
          data[tableName] = XLSX.utils.sheet_to_json(worksheet);
        }
        
        setImportData(data);
        setShowImportDialog(true);
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

  // Find matching record using composite keys
  const findMatchingRecord = useCallback(async (
    tableName: string, 
    record: any, 
    matchKeys: string[]
  ): Promise<any | null> => {
    // Build query conditions from match keys that have values
    const conditions: Record<string, any> = {};
    let hasValidCondition = false;
    
    for (const key of matchKeys) {
      if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
        conditions[key] = record[key];
        hasValidCondition = true;
      }
    }
    
    if (!hasValidCondition) return null;
    
    let query = supabase.from(tableName as never).select('id');
    
    for (const [key, value] of Object.entries(conditions)) {
      query = query.eq(key, value);
    }
    
    const { data } = await query.limit(1).maybeSingle();
    return data;
  }, []);

  const handleSmartImport = async (mode: ImportMode) => {
    if (!importData) return;

    setIsImporting(true);
    const results: ImportResult[] = [];

    try {
      for (const [tableName, records] of Object.entries(importData)) {
        const tableConfig = tables.find(t => t.name === tableName);
        if (!tableConfig || !records || records.length === 0) continue;

        const result: ImportResult = {
          table: tableName,
          tableLabel: tableConfig.label,
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors: 0,
        };

        for (const record of records) {
          try {
            // Remove system fields that shouldn't be imported
            const { id, created_at, updated_at, ...cleanRecord } = record;
            
            // Find matching record using composite keys
            const existing = await findMatchingRecord(tableName, record, tableConfig.matchKeys);

            if (existing) {
              // Record exists
              if (mode === 'replace') {
                // Replace: update with new data
                const { error } = await supabase
                  .from(tableName as never)
                  .update(cleanRecord as never)
                  .eq('id', existing.id);
                
                if (error) {
                  result.errors++;
                } else {
                  result.updated++;
                }
              } else if (mode === 'merge') {
                // Merge: update only non-null fields
                const mergedData = { ...cleanRecord };
                // Keep existing values for null/empty fields
                Object.keys(mergedData).forEach(key => {
                  if (mergedData[key] === null || mergedData[key] === '' || mergedData[key] === undefined) {
                    delete mergedData[key];
                  }
                });
                
                if (Object.keys(mergedData).length > 0) {
                  const { error } = await supabase
                    .from(tableName as never)
                    .update(mergedData as never)
                    .eq('id', existing.id);
                  
                  if (error) {
                    result.errors++;
                  } else {
                    result.updated++;
                  }
                } else {
                  result.skipped++;
                }
              } else {
                // Skip duplicates
                result.skipped++;
              }
            } else {
              // No match found - insert new record
              const { error } = await supabase
                .from(tableName as never)
                .insert(cleanRecord as never);
              
              if (error) {
                result.errors++;
              } else {
                result.inserted++;
              }
            }
          } catch (err) {
            logErrorSafely('BackupTab import record', err);
            result.errors++;
          }
        }

        results.push(result);
      }

      setImportResults(results);
      queryClient.invalidateQueries();

      // Calculate totals
      const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
      const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
      const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

      if (totalErrors === 0) {
        toast.success(`تم الاستيراد بنجاح: ${totalInserted} جديد، ${totalUpdated} محدّث، ${totalSkipped} متجاهل`);
      } else {
        toast.warning(`الاستيراد: ${totalInserted} جديد، ${totalUpdated} محدّث، ${totalErrors} أخطاء`);
      }
    } catch (error) {
      logErrorSafely('BackupTab', error);
      toast.error(getSafeErrorMessage(error));
    } finally {
      setIsImporting(false);
      setShowImportDialog(false);
      setImportData(null);
    }
  };

  const getImportStats = () => {
    if (!importData) return [];
    return Object.entries(importData)
      .filter(([name]) => tables.find(t => t.name === name))
      .map(([name, records]) => ({
        tableName: name,
        tableLabel: tables.find(t => t.name === name)?.label || name,
        recordCount: records.length,
      }));
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
          <CardDescription>تصدير واستيراد بيانات النظام بشكل ذكي مع المطابقة التلقائية</CardDescription>
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
                    className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                      selectedTables.includes(table.name) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
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

          {/* Import Results Summary */}
          {importResults && importResults.length > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2 mt-2">
                  <p className="font-medium">نتائج الاستيراد:</p>
                  {importResults.map((result) => (
                    <div key={result.table} className="flex items-center gap-3 text-sm">
                      <span className="min-w-24">{result.tableLabel}:</span>
                      {result.inserted > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{result.inserted} جديد
                        </span>
                      )}
                      {result.updated > 0 && (
                        <span className="text-blue-600 dark:text-blue-400">
                          ↻{result.updated} محدّث
                        </span>
                      )}
                      {result.skipped > 0 && (
                        <span className="text-muted-foreground">
                          ⊘{result.skipped} متجاهل
                        </span>
                      )}
                      {result.errors > 0 && (
                        <span className="text-destructive">
                          ✕{result.errors} خطأ
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Smart Import Options Dialog */}
      <ImportOptionsDialog
        open={showImportDialog}
        onOpenChange={(open) => {
          setShowImportDialog(open);
          if (!open) {
            setImportData(null);
          }
        }}
        importStats={getImportStats()}
        isImporting={isImporting}
        onConfirm={(mode) => handleSmartImport(mode)}
      />
    </>
  );
}
