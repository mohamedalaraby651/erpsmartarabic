import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { generatePDF } from "@/lib/pdfGenerator";
import { toast } from "sonner";

interface StatementEntry {
  date: string;
  type: 'فاتورة' | 'دفعة' | 'مرتجع';
  reference: string;
  debit: number;
  credit: number;
  status: string;
}

interface CreditNote {
  created_at: string;
  credit_note_number: string;
  amount: number;
  status: string;
}

interface StatementOfAccountProps {
  customerName: string;
  invoices: Array<{ created_at: string; invoice_number: string; total_amount: number | null; payment_status: string }>;
  payments: Array<{ payment_date: string; payment_number: string; amount: number | null }>;
  creditNotes?: CreditNote[];
}

const PAGE_SIZE = 20;

const StatementOfAccount = ({ customerName, invoices, payments, creditNotes = [] }: StatementOfAccountProps) => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const statementData = useMemo(() => {
    const entries: StatementEntry[] = [];

    invoices.forEach(inv => {
      entries.push({
        date: inv.created_at,
        type: 'فاتورة',
        reference: inv.invoice_number,
        debit: Number(inv.total_amount || 0),
        credit: 0,
        status: inv.payment_status === 'paid' ? 'مسدد' : inv.payment_status === 'partial' ? 'جزئي' : 'معلق',
      });
    });

    payments.forEach(pay => {
      entries.push({
        date: pay.payment_date,
        type: 'دفعة',
        reference: pay.payment_number,
        debit: 0,
        credit: Number(pay.amount || 0),
        status: 'مسدد',
      });
    });

    creditNotes.forEach(cn => {
      entries.push({
        date: cn.created_at,
        type: 'مرتجع',
        reference: cn.credit_note_number,
        debit: 0,
        credit: Number(cn.amount || 0),
        status: cn.status === 'approved' ? 'معتمد' : 'معلق',
      });
    });

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let filtered = entries;
    if (dateFrom) filtered = filtered.filter(e => new Date(e.date) >= new Date(dateFrom));
    if (dateTo) filtered = filtered.filter(e => new Date(e.date) <= new Date(dateTo + 'T23:59:59'));

    let balance = 0;
    return filtered.map(entry => {
      balance += entry.debit - entry.credit;
      return { ...entry, runningBalance: balance };
    });
  }, [invoices, payments, creditNotes, dateFrom, dateTo]);

  // Reset page when filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  

  const totalPages = Math.ceil(statementData.length / PAGE_SIZE);
  const pagedData = statementData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalDebit = statementData.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = statementData.reduce((sum, e) => sum + e.credit, 0);
  const finalBalance = totalDebit - totalCredit;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const formattedData = statementData.map(item => ({
        date: new Date(item.date).toLocaleDateString('ar-EG'),
        type: item.type,
        reference: item.reference,
        debit: item.debit > 0 ? item.debit.toLocaleString() : '-',
        credit: item.credit > 0 ? item.credit.toLocaleString() : '-',
        runningBalance: item.runningBalance.toLocaleString(),
        status: item.status,
      }));

      await generatePDF({
        title: `كشف حساب العميل: ${customerName}`,
        data: formattedData,
        columns: [
          { key: 'date', label: 'التاريخ' },
          { key: 'type', label: 'النوع' },
          { key: 'reference', label: 'المرجع' },
          { key: 'debit', label: 'مدين' },
          { key: 'credit', label: 'دائن' },
          { key: 'runningBalance', label: 'الرصيد' },
          { key: 'status', label: 'الحالة' },
        ],
        includeCompanyInfo: true,
        orientation: 'landscape',
      });
      toast.success('تم تصدير كشف الحساب بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير كشف الحساب');
    } finally {
      setIsPrinting(false);
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    if (type === 'فاتورة') return 'default';
    if (type === 'مرتجع') return 'outline';
    return 'secondary';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          كشف الحساب
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handlePrint} disabled={isPrinting}>
          {isPrinting ? <span className="h-4 w-4 ml-2 animate-spin border-2 border-current border-t-transparent rounded-full" /> : <Printer className="h-4 w-4 ml-2" />}
          تصدير PDF
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-destructive/10">
            <p className="text-sm text-muted-foreground">إجمالي مدين</p>
            <p className="text-lg font-bold text-destructive">{totalDebit.toLocaleString()} ج.م</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-emerald-500/10">
            <p className="text-sm text-muted-foreground">إجمالي دائن</p>
            <p className="text-lg font-bold text-emerald-600">{totalCredit.toLocaleString()} ج.م</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${finalBalance > 0 ? 'bg-destructive/10' : 'bg-emerald-500/10'}`}>
            <p className="text-sm text-muted-foreground">الرصيد النهائي</p>
            <p className={`text-lg font-bold ${finalBalance > 0 ? 'text-destructive' : 'text-emerald-600'}`}>{finalBalance.toLocaleString()} ج.م</p>
          </div>
        </div>

        {/* Date Filters */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm text-muted-foreground">من تاريخ</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-sm text-muted-foreground">إلى تاريخ</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        {statementData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">لا توجد حركات في الفترة المحددة</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المرجع</TableHead>
                    <TableHead>مدين</TableHead>
                    <TableHead>دائن</TableHead>
                    <TableHead>الرصيد</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedData.map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{new Date(entry.date).toLocaleDateString('ar-EG')}</TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(entry.type)}>{entry.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{entry.reference}</TableCell>
                      <TableCell className={entry.debit > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                        {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className={entry.credit > 0 ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
                        {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className={`font-bold ${entry.runningBalance > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                        {entry.runningBalance.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.status === 'مسدد' || entry.status === 'معتمد' ? 'default' : 'secondary'}>{entry.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">
                  {statementData.length} حركة — صفحة {currentPage} من {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StatementOfAccount;
