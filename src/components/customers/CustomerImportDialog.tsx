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
import * as XLSX from "xlsx";

interface CustomerImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportRow {
  name: string;
  phone?: string;
  email?: string;
  customer_type?: string;
  governorate?: string;
  city?: string;
  tax_number?: string;
  credit_limit?: number;
  notes?: string;
}

interface ImportResult {
  row: ImportRow;
  status: 'success' | 'duplicate' | 'error';
  message: string;
}

const COLUMN_MAP: Record<string, string> = {
  'الاسم': 'name', 'الإسم': 'name', 'اسم العميل': 'name', 'name': 'name',
  'الهاتف': 'phone', 'رقم الهاتف': 'phone', 'phone': 'phone', 'mobile': 'phone',
  'البريد': 'email', 'البريد الإلكتروني': 'email', 'email': 'email',
  'النوع': 'customer_type', 'نوع العميل': 'customer_type', 'type': 'customer_type',
  'المحافظة': 'governorate', 'governorate': 'governorate',
  'المدينة': 'city', 'city': 'city',
  'الرقم الضريبي': 'tax_number', 'tax_number': 'tax_number',
  'حد الائتمان': 'credit_limit', 'credit_limit': 'credit_limit',
  'ملاحظات': 'notes', 'notes': 'notes',
};

const TYPE_MAP: Record<string, string> = {
  'فرد': 'individual', 'individual': 'individual',
  'شركة': 'company', 'company': 'company',
  'مزرعة': 'farm', 'farm': 'farm',
};

const CustomerImportDialog = ({ open, onOpenChange }: CustomerImportDialogProps) => {
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
        const wb = XLSX.read(event.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const mapped: ImportRow[] = rawData.map((row) => {
          const result: Record<string, unknown> = {};
          Object.entries(row).forEach(([key, value]) => {
            const mappedKey = COLUMN_MAP[key.trim()];
            if (mappedKey) result[mappedKey] = value;
          });
          if (result.customer_type) {
            result.customer_type = TYPE_MAP[String(result.customer_type).trim()] || 'individual';
          }
          return { name: String(result.name || ''), ...result } as ImportRow;
        }).filter(r => r.name && r.name.trim() !== '');

        setParsedRows(mapped);
        setStep('preview');
      } catch {
        toast.error('فشل قراءة الملف. تأكد من صيغة xlsx صحيحة');
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const importMutation = useMutation({
    mutationFn: async (rows: ImportRow[]) => {
      // Check for duplicates
      const { data: existing } = await supabase.from('customers').select('name, phone');
      const existingNames = new Set((existing || []).map(c => c.name.toLowerCase().trim()));
      const existingPhones = new Set((existing || []).filter(c => c.phone).map(c => c.phone!));

      const importResults: ImportResult[] = [];

      for (const row of rows) {
        const isDuplicate = existingNames.has(row.name.toLowerCase().trim()) ||
          (row.phone && existingPhones.has(row.phone));

        if (isDuplicate) {
          importResults.push({ row, status: 'duplicate', message: 'عميل مكرر (بالاسم أو الهاتف)' });
          continue;
        }

        try {
          const { error } = await supabase.from('customers').insert({
            name: row.name.trim(),
            phone: row.phone?.trim() || null,
            email: row.email?.trim() || null,
            customer_type: (row.customer_type as 'individual' | 'company' | 'farm') || 'individual',
            governorate: row.governorate?.trim() || null,
            city: row.city?.trim() || null,
            tax_number: row.tax_number?.trim() || null,
            credit_limit: row.credit_limit || 0,
            notes: row.notes?.trim() || null,
          });
          if (error) throw error;
          importResults.push({ row, status: 'success', message: 'تم الاستيراد بنجاح' });
          existingNames.add(row.name.toLowerCase().trim());
          if (row.phone) existingPhones.add(row.phone);
        } catch (err) {
          importResults.push({ row, status: 'error', message: 'فشل الحفظ' });
        }
      }

      return importResults;
    },
    onSuccess: (importResults) => {
      setResults(importResults);
      setStep('results');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-count'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      const successCount = importResults.filter(r => r.status === 'success').length;
      toast.success(`تم استيراد ${successCount} عميل بنجاح`);
    },
    onError: () => toast.error('حدث خطأ أثناء الاستيراد'),
  });

  const handleReset = () => {
    setStep('upload');
    setParsedRows([]);
    setResults([]);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const duplicateCount = results.filter(r => r.status === 'duplicate').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            استيراد عملاء من Excel
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'قم برفع ملف Excel (.xlsx) يحتوي على بيانات العملاء'}
            {step === 'preview' && `تم قراءة ${parsedRows.length} سجل - راجع البيانات قبل الاستيراد`}
            {step === 'results' && 'نتائج الاستيراد'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="py-8 text-center">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 hover:border-primary/50 transition-colors">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                الأعمدة المدعومة: الاسم، الهاتف، البريد، النوع، المحافظة، المدينة، الرقم الضريبي، حد الائتمان، ملاحظات
              </p>
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
                  <TableHead>#</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المحافظة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.slice(0, 50).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.phone || '-'}</TableCell>
                    <TableCell>{row.customer_type === 'company' ? 'شركة' : row.customer_type === 'farm' ? 'مزرعة' : 'فرد'}</TableCell>
                    <TableCell>{row.governorate || '-'}</TableCell>
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
                {importMutation.isPending ? 'جاري الاستيراد...' : `استيراد ${parsedRows.length} عميل`}
              </Button>
            </>
          )}
          {step === 'results' && <Button onClick={handleClose}>إغلاق</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerImportDialog;
