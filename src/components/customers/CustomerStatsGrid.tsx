import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CreditCard, TrendingUp, Wallet, FileText, BarChart3, Clock, Target, Calendar,
} from "lucide-react";

interface CustomerStatsGridProps {
  currentBalance: number;
  balanceIsDebit: boolean;
  creditLimit: number;
  creditUsagePercent: number;
  totalPurchases: number;
  paymentRatio: number;
  invoiceCount: number;
  avgInvoiceValue: number;
  dso: number | null;
  totalOutstanding: number;
  lastPurchaseDate: string | null;
}

export const CustomerStatsGrid = memo(function CustomerStatsGrid({
  currentBalance, balanceIsDebit, creditLimit, creditUsagePercent,
  totalPurchases, paymentRatio, invoiceCount, avgInvoiceValue,
  dso, totalOutstanding, lastPurchaseDate,
}: CustomerStatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-4">
      {/* Balance */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${balanceIsDebit ? 'bg-destructive/10' : 'bg-emerald-500/10 dark:bg-emerald-500/20'}`}>
              <CreditCard className={`h-5 w-5 ${balanceIsDebit ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`} />
            </div>
            <div>
              <p className={`text-lg font-bold ${balanceIsDebit ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {currentBalance.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">الرصيد الحالي</p>
            </div>
          </div>
          {creditLimit > 0 && (
            <div className="space-y-1">
              <Progress value={creditUsagePercent} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground">{creditUsagePercent.toFixed(0)}% من {creditLimit.toLocaleString()}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Purchases */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-lg font-bold">{totalPurchases.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Ratio */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${paymentRatio >= 80 ? 'bg-emerald-500/10 dark:bg-emerald-500/20' : paymentRatio >= 50 ? 'bg-warning/10' : 'bg-destructive/10'}`}>
              <Wallet className={`h-5 w-5 ${paymentRatio >= 80 ? 'text-emerald-600 dark:text-emerald-400' : paymentRatio >= 50 ? 'text-warning' : 'text-destructive'}`} />
            </div>
            <div>
              <p className="text-lg font-bold">{paymentRatio.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">نسبة السداد</p>
            </div>
          </div>
          <Progress value={paymentRatio} className="h-1.5" />
        </CardContent>
      </Card>

      {/* Invoice Count */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10"><FileText className="h-5 w-5 text-info" /></div>
            <div>
              <p className="text-lg font-bold">{invoiceCount}</p>
              <p className="text-xs text-muted-foreground">الفواتير</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avg Invoice */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><BarChart3 className="h-5 w-5 text-warning" /></div>
            <div>
              <p className="text-lg font-bold">{avgInvoiceValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">متوسط الفاتورة</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DSO */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary"><Clock className="h-5 w-5 text-secondary-foreground" /></div>
            <div>
              <p className="text-lg font-bold">{dso !== null ? `${dso} يوم` : '-'}</p>
              <p className="text-xs text-muted-foreground">متوسط السداد</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CLV */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent"><Target className="h-5 w-5 text-accent-foreground" /></div>
            <div>
              <p className="text-lg font-bold">{clv.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">قيمة العميل (CLV)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Purchase */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted"><Calendar className="h-5 w-5 text-muted-foreground" /></div>
            <div>
              <p className="text-sm font-medium">{lastPurchaseDate ? new Date(lastPurchaseDate).toLocaleDateString('ar-EG') : '-'}</p>
              <p className="text-xs text-muted-foreground">آخر شراء</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
