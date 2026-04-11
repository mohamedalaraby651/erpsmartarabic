import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Clock } from 'lucide-react';

interface SupplierAgingReportProps {
  supplierId: string;
}

interface AgingBucket {
  amount: number;
  count: number;
}

interface AgingData {
  bucket_0_30: AgingBucket;
  bucket_31_60: AgingBucket;
  bucket_61_90: AgingBucket;
  bucket_90_plus: AgingBucket;
  total_outstanding: number;
  total_count: number;
}

const bucketConfig = [
  { key: 'bucket_0_30', label: '0 - 30 يوم', color: 'bg-green-500', textColor: 'text-green-600' },
  { key: 'bucket_31_60', label: '31 - 60 يوم', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  { key: 'bucket_61_90', label: '61 - 90 يوم', color: 'bg-orange-500', textColor: 'text-orange-600' },
  { key: 'bucket_90_plus', label: '+90 يوم', color: 'bg-destructive', textColor: 'text-destructive' },
] as const;

const SupplierAgingReport = ({ supplierId }: SupplierAgingReportProps) => {
  const { data: aging, isLoading } = useQuery({
    queryKey: ['supplier-aging-report', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_supplier_aging', { _supplier_id: supplierId });
      if (error) throw error;
      return data as unknown as AgingData;
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!aging) return null;

  const total = Number(aging.total_outstanding) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />تقرير أعمار المستحقات</CardTitle>
        <CardDescription>توزيع المبالغ المستحقة حسب فترة التأخير</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {bucketConfig.map((bucket) => {
            const d = aging[bucket.key as keyof AgingData] as AgingBucket;
            const amount = Number(d?.amount) || 0;
            const count = Number(d?.count) || 0;
            const pct = total > 0 ? (amount / total) * 100 : 0;
            return (
              <div key={bucket.key} className="p-3 rounded-lg border bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${bucket.color}`} />
                  <span className="text-xs text-muted-foreground">{bucket.label}</span>
                </div>
                <p className={`text-lg font-bold ${bucket.textColor}`}>{amount.toLocaleString()} <span className="text-xs font-normal">ج.م</span></p>
                <div className="flex items-center justify-between mt-1">
                  <Badge variant="outline" className="text-[10px]">{count} طلب</Badge>
                  <span className="text-[10px] text-muted-foreground">{pct.toFixed(1)}%</span>
                </div>
                <Progress value={pct} className="h-1 mt-2" />
              </div>
            );
          })}
        </div>

        {/* Detail table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الفترة</TableHead>
              <TableHead className="text-left">المبلغ</TableHead>
              <TableHead className="text-left">عدد الطلبات</TableHead>
              <TableHead className="text-left">النسبة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bucketConfig.map((bucket) => {
              const d = aging[bucket.key as keyof AgingData] as AgingBucket;
              const amount = Number(d?.amount) || 0;
              const count = Number(d?.count) || 0;
              const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : '0';
              return (
                <TableRow key={bucket.key}>
                  <TableCell className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${bucket.color}`} />
                    {bucket.label}
                  </TableCell>
                  <TableCell className={`text-left font-medium ${bucket.textColor}`}>{amount.toLocaleString()} ج.م</TableCell>
                  <TableCell className="text-left">{count}</TableCell>
                  <TableCell className="text-left">{pct}%</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="font-bold">
              <TableCell>الإجمالي</TableCell>
              <TableCell className="text-left text-destructive">{total.toLocaleString()} ج.م</TableCell>
              <TableCell className="text-left">{aging.total_count || 0}</TableCell>
              <TableCell className="text-left">100%</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
};

export default SupplierAgingReport;
