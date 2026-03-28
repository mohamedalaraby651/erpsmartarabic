import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Info as InfoIcon, CheckCircle } from 'lucide-react';
import type { BusinessInsight } from '@/hooks/useBusinessInsights';

const insightIcons: Record<string, React.ElementType> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: InfoIcon,
  success: CheckCircle,
};

const insightColors: Record<string, string> = {
  error: 'border-destructive/30 bg-destructive/5 text-destructive',
  warning: 'border-warning/30 bg-warning/5 text-warning',
  info: 'border-info/30 bg-info/5 text-info',
  success: 'border-success/30 bg-success/5 text-success',
};

interface InsightsWidgetProps {
  insights: BusinessInsight[];
}

export function InsightsWidget({ insights }: InsightsWidgetProps) {
  const navigate = useNavigate();

  return (
    <>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">تنبيهات ذكية</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {insights.slice(0, 5).map((insight) => {
            const Icon = insightIcons[insight.severity] || InfoIcon;
            return (
              <div
                key={insight.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:opacity-80 ${insightColors[insight.severity]}`}
                onClick={() => insight.action && navigate(insight.action.href)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs opacity-80">{insight.message}</p>
                </div>
                {insight.count && (
                  <Badge variant="secondary" className="shrink-0">{insight.count}</Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </>
  );
}
