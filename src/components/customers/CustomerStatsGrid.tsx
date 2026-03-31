import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CreditCard, TrendingUp, Wallet, FileText, Clock, Target, Calendar, Percent,
} from "lucide-react";

interface CustomerStatsGridProps {
  currentBalance: number;
  balanceIsDebit: boolean;
  creditLimit: number;
  creditUsagePercent: number;
  totalPurchases: number;
  totalPayments: number;
  paymentRatio: number;
  invoiceCount: number;
  avgInvoiceValue: number;
  dso: number | null;
  totalOutstanding: number;
  lastPurchaseDate: string | null;
}

export const CustomerStatsGrid = memo(function CustomerStatsGrid({
  currentBalance, balanceIsDebit, creditLimit, creditUsagePercent,
  totalPurchases, totalPayments, paymentRatio, invoiceCount, avgInvoiceValue,
  dso, totalOutstanding, lastPurchaseDate,
}: CustomerStatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-8 gap-4">
      {/* PRIMARY CARDS — col-span-2 on md for emphasis */}
      {/* Balance */}
      <Card className="md:col-span-2">
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

      {/* Outstanding */}
      <Card className="md:col-span-2">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${totalOutstanding > 0 ? 'bg-destructive/10' : 'bg-emerald-500/10 dark:bg-emerald-500/20'}`}>
              <Target className={`h-5 w-5 ${totalOutstanding > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`} />
            </div>
            <div>
              <p className={`text-lg font-bold ${totalOutstanding > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>{totalOutstanding.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">المستحق</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Ratio */}
      <Card className="md:col-span-2">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${paymentRatio >= 80 ? 'bg-emerald-500/10 dark:bg-emerald-500/20' : paymentRatio >= 50 ? 'bg-warning/10' : 'bg-destructive/10'}`}>
              <Percent className={`h-5 w-5 ${paymentRatio >= 80 ? 'text-emerald-600 dark:text-emerald-400' : paymentRatio >= 50 ? 'text-warning' : 'text-destructive'}`} />
            </div>
            <div>
              <p className="text-lg font-bold">{paymentRatio.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">نسبة السداد</p>
            </div>
          </div>
          <Progress value={paymentRatio} className="h-1.5" />
        </CardContent>
      </Card>

      {/* SECONDARY CARDS — standard single column */}
      {/* Total Purchases */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-lg font-bold">{totalPurchases.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">المشتريات</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Payments */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20"><Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
            <div>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{totalPayments.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">المدفوعات</p>
            </div>
          </div>
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
