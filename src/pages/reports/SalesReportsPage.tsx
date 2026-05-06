import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import {
  CalendarIcon,
  FileText,
  ShoppingCart,
  Receipt,
  TrendingUp,
  Percent,
  DollarSign,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PresetKey = "last7" | "last30" | "thisMonth" | "lastMonth" | "thisYear" | "custom";

interface Range {
  from: Date;
  to: Date;
}

const PRESETS: { key: PresetKey; label: string; resolve: () => Range }[] = [
  { key: "last7",     label: "آخر 7 أيام",  resolve: () => ({ from: subDays(new Date(), 6),  to: new Date() }) },
  { key: "last30",    label: "آخر 30 يوماً", resolve: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { key: "thisMonth", label: "هذا الشهر",   resolve: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { key: "lastMonth", label: "الشهر الماضي", resolve: () => {
      const d = subDays(startOfMonth(new Date()), 1);
      return { from: startOfMonth(d), to: endOfMonth(d) };
    } },
  { key: "thisYear",  label: "هذا العام",   resolve: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(
    Math.round(n * 100) / 100,
  );

const fmtPct = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

interface SalesMetrics {
  quotesCount: number;
  quotesValue: number;
  ordersCount: number;
  ordersValue: number;
  invoicesCount: number;
  invoicesValue: number;
  convertedQuotes: number;
  daily: { date: string; quotes: number; orders: number; invoices: number }[];
}

async function fetchSalesMetrics(from: Date, to: Date): Promise<SalesMetrics> {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const [quotesRes, ordersRes, invoicesRes] = await Promise.all([
    supabase
      .from("quotes")
      .select("id,total_amount,created_at,status,converted_order_id")
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("sales_orders")
      .select("id,total_amount,created_at,status")
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("invoices")
      .select("id,total_amount,created_at,status")
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
  ]);

  if (quotesRes.error) throw quotesRes.error;
  if (ordersRes.error) throw ordersRes.error;
  if (invoicesRes.error) throw invoicesRes.error;

  const quotes = quotesRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const invoices = (invoicesRes.data ?? []).filter((i: any) => i.status !== "cancelled");

  const sum = (rows: any[]) => rows.reduce((s, r) => s + Number(r.total_amount || 0), 0);

  const dailyMap = new Map<string, { quotes: number; orders: number; invoices: number }>();
  const bump = (date: string, key: "quotes" | "orders" | "invoices", v: number) => {
    const cur = dailyMap.get(date) ?? { quotes: 0, orders: 0, invoices: 0 };
    cur[key] += v;
    dailyMap.set(date, cur);
  };
  quotes.forEach((q: any)   => bump(format(parseISO(q.created_at), "yyyy-MM-dd"), "quotes",   Number(q.total_amount || 0)));
  orders.forEach((o: any)   => bump(format(parseISO(o.created_at), "yyyy-MM-dd"), "orders",   Number(o.total_amount || 0)));
  invoices.forEach((i: any) => bump(format(parseISO(i.created_at), "yyyy-MM-dd"), "invoices", Number(i.total_amount || 0)));

  const daily = Array.from(dailyMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date: format(parseISO(date), "dd MMM", { locale: ar }), ...v }));

  return {
    quotesCount:     quotes.length,
    quotesValue:     sum(quotes),
    ordersCount:     orders.length,
    ordersValue:     sum(orders),
    invoicesCount:   invoices.length,
    invoicesValue:   sum(invoices),
    convertedQuotes: quotes.filter((q: any) => q.converted_order_id || q.status === "converted").length,
    daily,
  };
}

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "info";
}

function KpiCard({ label, value, hint, Icon, tone = "primary" }: KpiCardProps) {
  const toneClasses = {
    primary: "bg-primary/10  text-primary",
    success: "bg-success/10  text-success",
    warning: "bg-warning/10  text-warning",
    info:    "bg-accent/10   text-accent-foreground",
  } as const;
  return (
    <Card className="card-premium">
      <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
          <p className="kpi-value text-xl sm:text-2xl font-bold tracking-tight truncate">{value}</p>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("p-2.5 rounded-xl shrink-0", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function SalesReportsPage() {
  const [preset, setPreset] = useState<PresetKey>("last30");
  const [range, setRange] = useState<Range>(() => PRESETS[1].resolve());

  const applyPreset = (key: PresetKey) => {
    const p = PRESETS.find((x) => x.key === key);
    if (!p) return;
    setPreset(key);
    setRange(p.resolve());
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sales-reports", range.from.toISOString(), range.to.toISOString()],
    queryFn:  () => fetchSalesMetrics(range.from, range.to),
  });

  const conversionRate = useMemo(() => {
    if (!data || data.quotesCount === 0) return 0;
    return (data.convertedQuotes / data.quotesCount) * 100;
  }, [data]);

  const orderToInvoice = useMemo(() => {
    if (!data || data.ordersCount === 0) return 0;
    return (data.invoicesCount / data.ordersCount) * 100;
  }, [data]);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">تقارير المبيعات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            مؤشرات عروض الأسعار، أوامر البيع، الفواتير ونسب التحويل
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={preset === p.key ? "default" : "outline"}
              onClick={() => applyPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant={preset === "custom" ? "default" : "outline"}
                className="gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                {format(range.from, "dd MMM", { locale: ar })} – {format(range.to, "dd MMM yyyy", { locale: ar })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: range.from, to: range.to }}
                onSelect={(r) => {
                  if (r?.from && r?.to) {
                    setPreset("custom");
                    setRange({ from: r.from, to: r.to });
                  }
                }}
                numberOfMonths={2}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {isError && (
        <Card><CardContent className="p-6 text-center text-destructive">تعذّر تحميل البيانات</CardContent></Card>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {isLoading || !data ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)
        ) : (
          <>
            <KpiCard label="عروض الأسعار"    value={String(data.quotesCount)}             hint={fmtMoney(data.quotesValue)}   Icon={FileText}    tone="info" />
            <KpiCard label="قيمة العروض"     value={fmtMoney(data.quotesValue)}                                                Icon={DollarSign}  tone="info" />
            <KpiCard label="أوامر البيع"     value={String(data.ordersCount)}             hint={fmtMoney(data.ordersValue)}   Icon={ShoppingCart} tone="warning" />
            <KpiCard label="الفواتير"        value={String(data.invoicesCount)}           hint={fmtMoney(data.invoicesValue)} Icon={Receipt}     tone="primary" />
            <KpiCard label="الإيرادات"       value={fmtMoney(data.invoicesValue)}                                              Icon={TrendingUp}  tone="success" />
            <KpiCard label="عروض محوّلة"    value={String(data.convertedQuotes)}         hint={`من ${data.quotesCount}`}     Icon={ShoppingCart} tone="success" />
            <KpiCard label="معدّل التحويل (عرض → أمر)" value={fmtPct(conversionRate)}                                          Icon={Percent}     tone="success" />
            <KpiCard label="معدّل الفوترة (أمر → فاتورة)" value={fmtPct(orderToInvoice)}                                        Icon={Percent}     tone="primary" />
          </>
        )}
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">الإيرادات اليومية حسب نوع المستند</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <Skeleton className="h-[320px] w-full" />
          ) : data.daily.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">لا توجد بيانات في هذه الفترة</p>
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.daily} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => new Intl.NumberFormat("ar-EG", { notation: "compact" }).format(v)} />
                  <Tooltip
                    formatter={(v: any) => fmtMoney(Number(v))}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border:     "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="quotes"   name="عروض"    fill="hsl(var(--accent))"  radius={[4, 4, 0, 0]} />
                  <Bar dataKey="orders"   name="أوامر"   fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="invoices" name="فواتير" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
