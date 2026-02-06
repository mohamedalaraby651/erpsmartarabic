import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  Gauge,
  Timer,
  MonitorSmartphone,
  Shield,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const MetricsPage = () => {
  const { user } = useAuth();

  // Fetch performance metrics from DB
  const { data: metrics = [], isLoading: loadingMetrics } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_metrics' as never)
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as Array<{ id: string; metric_name: string; metric_value: number; recorded_at: string; labels: Record<string, string> | null }>;
    },
    enabled: !!user,
  });

  // Fetch rate limit configs
  const { data: rateLimitConfigs = [], isLoading: loadingRateLimits } = useQuery({
    queryKey: ['rate-limit-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rate_limit_config')
        .select('*')
        .eq('is_active', true)
        .order('endpoint');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch current rate limit usage
  const { data: rateLimitUsage = [] } = useQuery({
    queryKey: ['rate-limit-usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('*')
        .order('endpoint');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Process metrics for charts
  const apiMetrics = metrics.filter((m) => m.metric_name === 'api_latency');
  const webVitalMetrics = metrics.filter((m) =>
    ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].includes(m.metric_name)
  );

  // Get latest web vitals
  const latestVitals: Record<string, number> = {};
  webVitalMetrics.forEach((m) => {
    if (!latestVitals[m.metric_name]) {
      latestVitals[m.metric_name] = m.metric_value;
    }
  });

  const getVitalStatus = (name: string, value: number) => {
    const thresholds: Record<string, [number, number]> = {
      LCP: [2500, 4000],
      FID: [100, 300],
      CLS: [0.1, 0.25],
      FCP: [1800, 3000],
      TTFB: [800, 1800],
    };
    const [good, poor] = thresholds[name] || [0, 0];
    if (value <= good) return { label: 'جيد', color: 'bg-emerald-500/10 text-emerald-600' };
    if (value <= poor) return { label: 'متوسط', color: 'bg-amber-500/10 text-amber-600' };
    return { label: 'ضعيف', color: 'bg-destructive/10 text-destructive' };
  };

  // Format API metrics for chart
  const chartData = apiMetrics
    .slice(0, 20)
    .reverse()
    .map((m) => ({
      time: new Date(m.recorded_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      latency: Math.round(m.metric_value),
    }));

  const endpointLabels: Record<string, string> = {
    'validate-invoice': 'التحقق من الفاتورة',
    'process-payment': 'معالجة الدفع',
    'stock-movement': 'حركة المخزون',
    'approve-invoice': 'اعتماد الفاتورة',
    'approve-expense': 'اعتماد المصروف',
    'create-journal': 'إنشاء قيد',
    'verify-totp': 'التحقق الثنائي',
  };

  const isLoading = loadingMetrics || loadingRateLimits;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">مقاييس الأداء والمراقبة</h1>
        <p className="text-muted-foreground">مراقبة أداء النظام وحدود الاستخدام</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          {/* Web Vitals */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5 text-primary" />
              مؤشرات أداء الويب (Core Web Vitals)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].map((vital) => {
                const value = latestVitals[vital];
                const status = value !== undefined ? getVitalStatus(vital, value) : null;
                return (
                  <Card key={vital}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{vital}</p>
                      <p className="text-2xl font-bold">
                        {value !== undefined
                          ? vital === 'CLS'
                            ? value.toFixed(3)
                            : `${Math.round(value)}ms`
                          : '--'}
                      </p>
                      {status && (
                        <Badge className={`mt-1 ${status.color}`}>{status.label}</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* API Latency Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                زمن استجابة الـ API (آخر 20 طلب)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="time" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      contentStyle={{ direction: 'rtl' }}
                      formatter={(value: number) => [`${value}ms`, 'زمن الاستجابة']}
                    />
                    <Line
                      type="monotone"
                      dataKey="latency"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>لا توجد بيانات أداء مسجلة بعد</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rate Limits */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              حدود الاستخدام (Rate Limits)
            </h2>
            {rateLimitConfigs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  لا توجد حدود استخدام مُعرَّفة
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {rateLimitConfigs.map((config) => {
                  const usage = rateLimitUsage.find((u) => u.endpoint === config.endpoint);
                  const remaining = usage?.tokens_remaining ?? config.max_requests;
                  const used = config.max_requests - remaining;
                  const percentage = (used / config.max_requests) * 100;

                  return (
                    <Card key={config.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {endpointLabels[config.endpoint] || config.endpoint}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {used} / {config.max_requests} طلب
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            الفترة: {config.window_seconds} ثانية
                          </span>
                          <Badge variant={percentage > 80 ? 'destructive' : 'secondary'}>
                            {remaining} متبقي
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* System Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Activity className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{metrics.length}</p>
                <p className="text-xs text-muted-foreground">مقاييس مسجلة</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Timer className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-bold">
                  {apiMetrics.length > 0
                    ? `${Math.round(apiMetrics.reduce((s, m) => s + m.metric_value, 0) / apiMetrics.length)}ms`
                    : '--'}
                </p>
                <p className="text-xs text-muted-foreground">متوسط الاستجابة</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Shield className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{rateLimitConfigs.length}</p>
                <p className="text-xs text-muted-foreground">حدود مُعرَّفة</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Gauge className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold">{rateLimitUsage.length}</p>
                <p className="text-xs text-muted-foreground">مستخدمين نشطين</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default MetricsPage;
