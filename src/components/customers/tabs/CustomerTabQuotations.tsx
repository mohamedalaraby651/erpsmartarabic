import React, { memo, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, TrendingUp, Clock as ClockIcon, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { EntityLink } from "@/components/shared/EntityLink";

const Q_PAGE_SIZE = 20;

interface Quotation {
  id: string;
  quotation_number: string;
  created_at: string;
  status: string;
  total_amount: number;
}

export const CustomerTabQuotations = memo(function CustomerTabQuotations({ quotations }: { quotations: Quotation[] }) {
  const [qPage, setQPage] = useState(1);
  const qTotalPages = Math.max(1, Math.ceil(quotations.length / Q_PAGE_SIZE));
  const summary = useMemo(() => {
    const total = quotations.length;
    const pending = quotations.filter(q => q.status === 'pending' || q.status === 'draft').length;
    const accepted = quotations.filter(q => q.status === 'completed' || q.status === 'accepted').length;
    const rejected = quotations.filter(q => q.status === 'rejected' || q.status === 'cancelled').length;
    const totalAmount = quotations.reduce((s, q) => s + Number(q.total_amount || 0), 0);
    const conversionRate = total > 0 ? ((accepted / total) * 100).toFixed(0) : '0';
    return { total, pending, accepted, rejected, totalAmount, conversionRate };
  }, [quotations]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>عروض الأسعار</CardTitle>
        <CardDescription>سجل عروض الأسعار للعميل</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Bar */}
        {quotations.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4 p-3 rounded-lg bg-muted/50">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{summary.total}</p>
              <p className="text-[10px] text-muted-foreground">إجمالي العروض</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{summary.pending}</p>
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><ClockIcon className="h-3 w-3" />معلقة</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{summary.accepted}</p>
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><CheckCircle className="h-3 w-3" />مقبولة</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-destructive">{summary.rejected}</p>
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><XCircle className="h-3 w-3" />مرفوضة</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <p className="text-lg font-bold text-primary">{summary.conversionRate}%</p>
              </div>
              <p className="text-[10px] text-muted-foreground">معدل التحويل</p>
            </div>
          </div>
        )}

        {quotations.length === 0 ? (
          <div className="text-center py-8"><Globe className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد عروض أسعار</p></div>
        ) : (
          <div className="space-y-2">
            {quotations.slice((qPage - 1) * Q_PAGE_SIZE, qPage * Q_PAGE_SIZE).map((q) => (
              <div key={q.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <EntityLink type="quotation" id={q.id}>{q.quotation_number}</EntityLink>
                  <span className="text-muted-foreground mr-4 text-sm">{new Date(q.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={q.status === 'completed' ? 'default' : 'secondary'}>
                    {q.status === 'completed' ? 'مكتمل' : q.status === 'pending' ? 'معلق' : q.status === 'draft' ? 'مسودة' : q.status === 'rejected' ? 'مرفوض' : q.status}
                  </Badge>
                  <span className="font-bold">{Number(q.total_amount).toLocaleString()} ج.م</span>
                </div>
              </div>
            ))}
          </div>
          {qTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={qPage <= 1} onClick={() => setQPage(p => p - 1)}>السابق</Button>
              <span className="text-sm text-muted-foreground">{qPage} / {qTotalPages}</span>
              <Button variant="outline" size="sm" disabled={qPage >= qTotalPages} onClick={() => setQPage(p => p + 1)}>التالي</Button>
            </div>
          )}
        </>
        )}
      </CardContent>
    </Card>
  );
});
