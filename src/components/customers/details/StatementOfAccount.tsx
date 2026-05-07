import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { generateStatementPdf } from "@/lib/statementPdfGenerator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StatementOfAccountProps {
  customerName: string;
  customerId: string;
}

interface StatementRow {
  entry_date: string;
  entry_type: string;
  reference: string;
  debit: number;
  credit: number;
  running_balance: number;
  status: string;
}

const PAGE_SIZE = 20;

const StatementOfAccount = ({ customerName, customerId }: StatementOfAccountProps) => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Server-side statement via RPC — no 500 record limit
  const { data: statementData = [], isLoading } = useQuery({
    queryKey: ['customer-statement', customerId, dateFrom, dateTo],
    queryFn: async (): Promise<StatementRow[]> => {
      const params: Record<string, unknown> = { _customer_id: customerId };
      if (dateFrom) params._date_from = dateFrom;
      if (dateTo) params._date_to = dateTo;

      const { data, error } = await supabase.rpc('get_customer_statement', params as any);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        entry_date: row.entry_date,
        entry_type: row.entry_type,
        reference: row.reference,
        debit: Number(row.debit || 0),
        credit: Number(row.credit || 0),
        running_balance: Number(row.running_balance || 0),
        status: row.status,
      }));
    },
    enabled: !!customerId,
    staleTime: 60000,
  });

  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo]);

  const totalPages = Math.ceil(statementData.length / PAGE_SIZE);
  const pagedData = statementData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalDebit = useMemo(() => statementData.reduce((sum, e) => sum + e.debit, 0), [statementData]);
  const totalCredit = useMemo(() => statementData.reduce((sum, e) => sum + e.credit, 0), [statementData]);
  const finalBalance = totalDebit - totalCredit;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      // Fetch customer details for the PDF header
      const { data: customer } = await supabase
        .from('customers')
        .select('phone, tax_number, governorate, city')
        .eq('id', customerId)
        .single();

      const address = [customer?.governorate, customer?.city].filter(Boolean).join(' - ');

      await generateStatementPdf({
        partyType: 'customer',
        partyName: customerName,
        partyPhone: customer?.phone,
        partyTaxNumber: customer?.tax_number,
        partyAddress: address || null,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        openingBalance: 0,
        entries: statementData,
      });
      toast.success('تم تصدير كشف الحساب بنجاح');
    } catch (e) {
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
        <Button variant="outline" size="sm" onClick={handlePrint} disabled={isPrinting || isLoading}>
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
          <div className="text-center p-3 rounded-lg bg-success/10">
            <p className="text-sm text-muted-foreground">إجمالي دائن</p>
            <p className="text-lg font-bold text-success">{totalCredit.toLocaleString()} ج.م</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${finalBalance > 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
            <p className="text-sm text-muted-foreground">الرصيد النهائي</p>
            <p className={`text-lg font-bold ${finalBalance > 0 ? 'text-destructive' : 'text-success'}`}>{finalBalance.toLocaleString()} ج.م</p>
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
        {isLoading ? (
          <div className="space-y-3 py-4 animate-pulse">
            <div className="h-10 bg-muted rounded-lg w-full" />
            <div className="h-10 bg-muted rounded-lg w-full" />
            <div className="h-10 bg-muted rounded-lg w-3/4" />
          </div>
        ) : statementData.length === 0 ? (
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
                      <TableCell className="text-sm">{new Date(entry.entry_date).toLocaleDateString('ar-EG')}</TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(entry.entry_type)}>{entry.entry_type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{entry.reference}</TableCell>
                      <TableCell className={entry.debit > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                        {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className={entry.credit > 0 ? 'text-success font-medium' : 'text-muted-foreground'}>
                        {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className={`font-bold ${entry.running_balance > 0 ? 'text-destructive' : 'text-success'}`}>
                        {entry.running_balance.toLocaleString()}
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
