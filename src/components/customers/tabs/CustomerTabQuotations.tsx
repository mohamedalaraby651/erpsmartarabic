import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";
import { EntityLink } from "@/components/shared/EntityLink";

interface Quotation {
  id: string;
  quotation_number: string;
  created_at: string;
  status: string;
  total_amount: number;
}

export const CustomerTabQuotations = memo(function CustomerTabQuotations({ quotations }: { quotations: Quotation[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>عروض الأسعار</CardTitle><CardDescription>سجل عروض الأسعار للعميل</CardDescription></CardHeader>
      <CardContent>
        {quotations.length === 0 ? (
          <div className="text-center py-8"><Globe className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد عروض أسعار</p></div>
        ) : (
          <div className="space-y-2">
            {quotations.slice(0, 50).map((q) => (
              <div key={q.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <EntityLink type="quotation" id={q.id}>{q.quotation_number}</EntityLink>
                  <span className="text-muted-foreground mr-4 text-sm">{new Date(q.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={q.status === 'completed' ? 'default' : 'secondary'}>
                    {q.status === 'completed' ? 'مكتمل' : q.status === 'pending' ? 'معلق' : q.status === 'draft' ? 'مسودة' : q.status}
                  </Badge>
                  <span className="font-bold">{Number(q.total_amount).toLocaleString()} ج.م</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
