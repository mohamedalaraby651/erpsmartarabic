import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface AgingBucket {
  label: string;
  range: string;
  amount: number;
  count: number;
  color: string;
  bgColor: string;
}

interface CustomerAgingReportProps {
  customerId: string;
}

export default function CustomerAgingReport({ customerId }: CustomerAgingReportProps) {
  const { data: agingData, isLoading } = useQuery({
    queryKey: ['customer-aging', customerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_customer_aging', { _customer_id: customerId });
      if (error) throw error;
      return data as Record<string, any>;
    },
    enabled: !!customerId,
    staleTime: 60000,
  });

  const buckets: AgingBucket[] = [
    {
      label: 'جاري', range: '0-30 يوم',
      amount: Number(agingData?.bucket_0_30?.amount || 0),
      count: Number(agingData?.bucket_0_30?.count || 0),
      color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500',
    },
    {
      label: 'متأخر', range: '31-60 يوم',
      amount: Number(agingData?.bucket_31_60?.amount || 0),
      count: Number(agingData?.bucket_31_60?.count || 0),
      color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500',
    },
    {
      label: 'متأخر جداً', range: '61-90 يوم',
      amount: Number(agingData?.bucket_61_90?.amount || 0),
      count: Number(agingData?.bucket_61_90?.count || 0),
      color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-500',
    },
    {
      label: 'خطر', range: '90+ يوم',
      amount: Number(agingData?.bucket_90_plus?.amount || 0),
      count: Number(agingData?.bucket_90_plus?.count || 0),
      color: 'text-destructive', bgColor: 'bg-destructive',
    },
  ];

  const totalOutstanding = Number(agingData?.total_outstanding || 0);
  const totalCount = Number(agingData?.total_count || 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4 animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-8 bg-muted rounded w-full" />
            <div className="h-8 bg-muted rounded w-full" />
            <div className="h-8 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalCount === 0) {
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
          إجمالي المستحقات: {totalOutstanding.toLocaleString()} ج.م من {totalCount} فاتورة
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
