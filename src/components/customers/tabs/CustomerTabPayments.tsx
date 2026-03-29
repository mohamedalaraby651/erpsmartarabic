import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Payment = Database['public']['Tables']['payments']['Row'];

export const CustomerTabPayments = memo(function CustomerTabPayments({ payments }: { payments: Payment[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>المدفوعات</CardTitle><CardDescription>سجل مدفوعات العميل</CardDescription></CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-8"><CreditCard className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد مدفوعات</p></div>
        ) : (
          <div className="space-y-2">
            {payments.slice(0, 50).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <span className="font-medium">{payment.payment_number}</span>
                  <span className="text-muted-foreground mr-4 text-sm">{new Date(payment.payment_date).toLocaleDateString('ar-EG')}</span>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{Number(payment.amount).toLocaleString()} ج.م</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
