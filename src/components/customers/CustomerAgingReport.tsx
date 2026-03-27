import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number | null;
  payment_status: string;
  due_date: string | null;
  created_at: string;
}

interface CustomerAgingReportProps {
  invoices: Invoice[];
}

interface AgingBucket {
  label: string;
  range: string;
  amount: number;
  count: number;
  color: string;
  bgColor: string;
}

export default function CustomerAgingReport({ invoices }: CustomerAgingReportProps) {
  const now = new Date();

  const unpaidInvoices = invoices.filter(
    (inv) => inv.payment_status !== 'paid'
  );

  const buckets: AgingBucket[] = [
    { label: 'جاري', range: '0-30 يوم', amount: 0, count: 0, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500' },
    { label: 'متأخر', range: '31-60 يوم', amount: 0, count: 0, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500' },
    { label: 'متأخر جداً', range: '61-90 يوم', amount: 0, count: 0, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-500' },
    { label: 'خطر', range: '90+ يوم', amount: 0, count: 0, color: 'text-destructive', bgColor: 'bg-destructive' },
  ];

  unpaidInvoices.forEach((inv) => {
    const refDate = inv.due_date || inv.created_at;
    const days = differenceInDays(now, new Date(refDate));
    const outstanding = Number(inv.total_amount) - Number(inv.paid_amount || 0);

    if (days <= 30) {
      buckets[0].amount += outstanding;
      buckets[0].count++;
    } else if (days <= 60) {
      buckets[1].amount += outstanding;
      buckets[1].count++;
    } else if (days <= 90) {
      buckets[2].amount += outstanding;
      buckets[2].count++;
    } else {
      buckets[3].amount += outstanding;
      buckets[3].count++;
    }
  });

  const totalOutstanding = buckets.reduce((s, b) => s + b.amount, 0);

  if (unpaidInvoices.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">لا توجد ديون مستحقة</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          تقرير أعمار الديون
        </CardTitle>
        <CardDescription>
          إجمالي المستحقات: {totalOutstanding.toLocaleString()} ج.م من {unpaidInvoices.length} فاتورة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {buckets.map((bucket, i) => {
          const pct = totalOutstanding > 0 ? (bucket.amount / totalOutstanding) * 100 : 0;
          return (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", bucket.bgColor)} />
                  <span className="font-medium">{bucket.label}</span>
                  <span className="text-muted-foreground text-xs">({bucket.range})</span>
                </div>
                <div className="flex items-center gap-3">
                  {bucket.count > 0 && (
                    <Badge variant="outline" className="text-[10px]">{bucket.count} فاتورة</Badge>
                  )}
                  <span className={cn("font-bold", bucket.color)}>
                    {bucket.amount.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          );
        })}

        {/* Warning for high-risk */}
        {buckets[3].amount > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 mt-4">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive">
              {buckets[3].amount.toLocaleString()} ج.م متأخرة أكثر من 90 يوم - يُنصح بالمتابعة فوراً
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
