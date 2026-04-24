import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
// xlsx loaded dynamically inside handlers (perf: tree-shaken from main bundle)

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportRow {
  name: string;
  sku?: string;
  barcode?: string;
  price?: number;
  cost_price?: number;
  stock_quantity?: number;
  min_stock_level?: number;
  unit?: string;
  description?: string;
}

interface ImportResult {
  row: ImportRow;
  status: 'success' | 'duplicate' | 'error';
  message: string;
}

const COLUMN_MAP: Record<string, string> = {
  'الاسم': 'name', 'اسم المنتج': 'name', 'name': 'name', 'product': 'name',
  'الكود': 'sku', 'كود المنتج': 'sku', 'sku': 'sku', 'code': 'sku',
  'الباركود': 'barcode', 'barcode': 'barcode',
  'السعر': 'price', 'سعر البيع': 'price', 'price': 'price',
  'سعر التكلفة': 'cost_price', 'التكلفة': 'cost_price', 'cost': 'cost_price', 'cost_price': 'cost_price',
  'الكمية': 'stock_quantity', 'المخزون': 'stock_quantity', 'stock': 'stock_quantity', 'quantity': 'stock_quantity',
  'الحد الأدنى': 'min_stock_level', 'min_stock': 'min_stock_level',
  'الوحدة': 'unit', 'unit': 'unit',
  'الوصف': 'description', 'description': 'description',
};

export default function ProductImportDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(event.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        const mapped: ImportRow[] = rawData.map((row) => {
          const result: Record<string, unknown> = {};
          Object.entries(row).forEach(([key, value]) => {
            const mappedKey = COLUMN_MAP[key.trim()];
            if (mappedKey) result[mappedKey] = value;
          });
          return { name: String(result.name || ''), ...result } as ImportRow;
        }).filter(r => r.name && r.name.trim() !== '');
        setParsedRows(mapped);
        setStep('preview');
      } catch { toast.error('فشل قراءة الملف'); }
    };
    reader.readAsBinaryString(file);
  }, []);

  const importMutation = useMutation({
    mutationFn: async (rows: ImportRow[]) => {
      const { data: existing } = await supabase.from('products').select('name, sku');
      const existingNames = new Set((existing || []).map(p => p.name.toLowerCase().trim()));
      const existingSkus = new Set((existing || []).filter(p => p.sku).map(p => p.sku!));
      const importResults: ImportResult[] = [];

      for (const row of rows) {
        const isDuplicate = existingNames.has(row.name.toLowerCase().trim()) ||
          (row.sku && existingSkus.has(row.sku));
        if (isDuplicate) { importResults.push({ row, status: 'duplicate', message: 'منتج مكرر' }); continue; }
        try {
          const { error } = await supabase.from('products').insert({
            name: row.name.trim(),
            sku: row.sku?.trim() || null,
            selling_price: row.price || 0,
            cost_price: row.cost_price || 0,
            min_stock: row.min_stock_level || 0,
            description: row.description?.trim() || null,
          });
          if (error) throw error;
          importResults.push({ row, status: 'success', message: 'تم الاستيراد' });
          existingNames.add(row.name.toLowerCase().trim());
          if (row.sku) existingSkus.add(row.sku);
        } catch { importResults.push({ row, status: 'error', message: 'فشل الحفظ' }); }
      }
      return importResults;
    },
    onSuccess: (importResults) => {
      setResults(importResults); setStep('results');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      const successCount = importResults.filter(r => r.status === 'success').length;
      toast.success(`تم استيراد ${successCount} منتج بنجاح`);
    },
    onError: () => toast.error('حدث خطأ أثناء الاستيراد'),
  });

  const handleReset = () => { setStep('upload'); setParsedRows([]); setResults([]); };
  const handleClose = () => { handleReset(); onOpenChange(false); };
  const successCount = results.filter(r => r.status === 'success').length;
  const duplicateCount = results.filter(r => r.status === 'duplicate').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> استيراد منتجات من Excel</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'قم برفع ملف Excel (.xlsx) يحتوي على بيانات المنتجات'}
            {step === 'preview' && `تم قراءة ${parsedRows.length} سجل - راجع البيانات قبل الاستيراد`}
            {step === 'results' && 'نتائج الاستيراد'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="py-8 text-center">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 hover:border-primary/50 transition-colors">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">الأعمدة المدعومة: الاسم، الكود، الباركود، السعر، سعر التكلفة، الكمية، الحد الأدنى، الوحدة، الوصف</p>
              <label className="cursor-pointer">
                <Button variant="outline" asChild><span>اختيار ملف</span></Button>
                <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead><TableHead>الاسم</TableHead><TableHead>الكود</TableHead><TableHead>السعر</TableHead><TableHead>الكمية</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.slice(0, 50).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell><TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.sku || '-'}</TableCell><TableCell>{row.price || 0}</TableCell><TableCell>{row.stock_quantity || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {parsedRows.length > 50 && <p className="text-sm text-muted-foreground text-center py-2">و {parsedRows.length - 50} سجل إضافي...</p>}
          </ScrollArea>
        )}

        {step === 'results' && (
          <div className="space-y-4">
            <div className="flex gap-3 justify-center">
              <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> نجاح: {successCount}</Badge>
              <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" /> مكرر: {duplicateCount}</Badge>
              <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> فشل: {errorCount}</Badge>
            </div>
            {(duplicateCount > 0 || errorCount > 0) && (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {results.filter(r => r.status !== 'success').map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded text-sm">
                      <span>{r.row.name}</span>
                      <Badge variant={r.status === 'duplicate' ? 'secondary' : 'destructive'}>{r.message}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleReset}>رجوع</Button>
              <Button onClick={() => importMutation.mutate(parsedRows)} disabled={importMutation.isPending}>
                {importMutation.isPending ? 'جاري الاستيراد...' : `استيراد ${parsedRows.length} منتج`}
              </Button>
            </>
          )}
          {step === 'results' && <Button onClick={handleClose}>إغلاق</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
