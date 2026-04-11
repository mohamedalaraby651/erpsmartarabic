import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Printer, Filter, Loader2, FileText } from 'lucide-react';
import { generatePDF } from '@/lib/pdfGenerator';
import { useToast } from '@/hooks/use-toast';

interface SupplierStatementTabProps {
  supplierId: string;
  supplierName: string;
}

interface StatementEntry {
  entry_date: string;
  entry_type: string;
  reference: string;
  debit: number;
  credit: number;
  running_balance: number;
  status: string;
}

const SupplierStatementTab = ({ supplierId, supplierName }: SupplierStatementTabProps) => {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['supplier-statement', supplierId, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string> = { _supplier_id: supplierId };
      if (dateFrom) params._date_from = dateFrom;
      if (dateTo) params._date_to = dateTo;
      const { data, error } = await supabase.rpc('get_supplier_statement', params as any);
      if (error) throw error;
      return (data || []) as StatementEntry[];
    },
  });

  const totalDebit = entries.reduce((s, e) => s + Number(e.debit), 0);
  const totalCredit = entries.reduce((s, e) => s + Number(e.credit), 0);
  const finalBalance = entries.length > 0 ? Number(entries[entries.length - 1].running_balance) : 0;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const formatted = entries.map(e => ({
        date: new Date(e.entry_date).toLocaleDateString('ar-EG'),
        type: e.entry_type,
        reference: e.reference,
        debit: e.debit > 0 ? Number(e.debit).toLocaleString() : '-',
        credit: e.credit > 0 ? Number(e.credit).toLocaleString() : '-',
        balance: Number(e.running_balance).toLocaleString(),
        status: e.status,
      }));
      await generatePDF({
        title: `كشف حساب المورد: ${supplierName}`,
        data: formatted,
        columns: [
          { key: 'date', label: 'التاريخ' }, { key: 'type', label: 'النوع' },
          { key: 'reference', label: 'المرجع' }, { key: 'debit', label: 'مدين' },
          { key: 'credit', label: 'دائن' }, { key: 'balance', label: 'الرصيد' },
          { key: 'status', label: 'الحالة' },
        ],
        includeCompanyInfo: true, includeLogo: true, orientation: 'landscape',
      });
      toast({ title: 'تم تصدير كشف الحساب' });
    } catch {
      toast({ title: 'حدث خطأ في التصدير', variant: 'destructive' });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />كشف الحساب</CardTitle>
            <CardDescription>عرض تفاعلي لجميع حركات المورد</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={handlePrint} disabled={isPrinting || entries.length === 0} className="gap-2">
            {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}طباعة PDF
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto h-8 text-xs" placeholder="من" />
          <span className="text-muted-foreground text-xs">إلى</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto h-8 text-xs" placeholder="إلى" />
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setDateFrom(''); setDateTo(''); }}>مسح</Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد حركات في هذه الفترة</p>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المرجع</TableHead>
                  <TableHead className="text-left">مدين</TableHead>
                  <TableHead className="text-left">دائن</TableHead>
                  <TableHead className="text-left">الرصيد</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{new Date(entry.entry_date).toLocaleDateString('ar-EG')}</TableCell>
                    <TableCell>
                      <Badge variant={entry.entry_type === 'دفعة' ? 'default' : 'secondary'} className="text-[10px]">
                        {entry.entry_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{entry.reference}</TableCell>
                    <TableCell className={`text-left font-medium ${Number(entry.debit) > 0 ? 'text-destructive' : ''}`}>
                      {Number(entry.debit) > 0 ? Number(entry.debit).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className={`text-left font-medium ${Number(entry.credit) > 0 ? 'text-green-600' : ''}`}>
                      {Number(entry.credit) > 0 ? Number(entry.credit).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className={`text-left font-bold ${Number(entry.running_balance) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {Number(entry.running_balance).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">{entry.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold">
                  <TableCell colSpan={3}>الإجمالي</TableCell>
                  <TableCell className="text-left text-destructive">{totalDebit.toLocaleString()}</TableCell>
                  <TableCell className="text-left text-green-600">{totalCredit.toLocaleString()}</TableCell>
                  <TableCell className={`text-left ${finalBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>{finalBalance.toLocaleString()}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SupplierStatementTab;
