import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthData {
  score: number;
  grade: 'excellent' | 'good' | 'warning' | 'critical';
  recommendations: string[];
  credit_score: number;
  dso_score: number;
  aging_score: number;
  dso: number | null;
  total_outstanding: number;
  overdue_90: number;
}

const gradeConfig = {
  excellent: {
    label: 'ممتاز',
    icon: ShieldCheck,
    className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  },
  good: {
    label: 'جيد',
    icon: Shield,
    className: 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400',
  },
  warning: {
    label: 'تحذير',
    icon: ShieldAlert,
    className: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400',
  },
  critical: {
    label: 'حرج',
    icon: ShieldX,
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
};

export function useCustomerHealthScore(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-health-score', customerId],
    queryFn: async (): Promise<HealthData> => {
      const { data, error } = await supabase.rpc('get_customer_health_score', {
        _customer_id: customerId!,
      });
      if (error) throw error;
      return data as unknown as HealthData;
    },
    enabled: !!customerId,
    staleTime: 120000,
  });
}

interface CustomerHealthBadgeProps {
  customerId: string;
  compact?: boolean;
}

export const CustomerHealthBadge = memo(function CustomerHealthBadge({
  customerId,
  compact = false,
}: CustomerHealthBadgeProps) {
  const { data: health } = useCustomerHealthScore(customerId);

  if (!health || health.score === undefined) return null;

  const config = gradeConfig[health.grade] || gradeConfig.good;
  const Icon = config.icon;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn('gap-1 text-[10px] px-1.5 py-0.5', config.className)}>
            <Icon className="h-3 w-3" />
            {health.score}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px]">
          <p className="font-medium mb-1">التقييم الائتماني: {config.label} ({health.score}/100)</p>
          {health.recommendations?.length > 0 && (
            <ul className="text-xs space-y-0.5 list-disc pr-3">
              {health.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-sm', config.className)}>
      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium">{config.label}</span>
        <span className="text-xs mr-1">({health.score}/100)</span>
      </div>
    </div>
  );
});
