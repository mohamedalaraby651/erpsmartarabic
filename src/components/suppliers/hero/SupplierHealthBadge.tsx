import { useQuery } from '@tanstack/react-query';
import { supplierRepository } from '@/application/queries/suppliers';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HeartPulse } from 'lucide-react';

interface SupplierHealthBadgeProps {
  supplierId: string;
}

const gradeConfig: Record<string, { label: string; color: string; bg: string }> = {
  excellent: { label: 'ممتاز', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  good: { label: 'جيد', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  warning: { label: 'تحذير', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  critical: { label: 'حرج', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
};

const SupplierHealthBadge = ({ supplierId }: SupplierHealthBadgeProps) => {
  const { data: health } = useQuery({
    queryKey: ['supplier-health', supplierId],
    queryFn: () => supplierRepository.getHealthScore(supplierId),
    staleTime: 120000,
  });

  if (!health || health.score === undefined) return null;

  const config = gradeConfig[health.grade] || gradeConfig.good;
  const recommendations = (health.recommendations || []) as string[];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${config.bg} ${config.color} gap-1 cursor-help`}>
            <HeartPulse className="h-3 w-3" />
            {config.label} ({health.score}%)
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-right" dir="rtl">
          <p className="font-bold mb-1">تقييم صحة المورد: {health.score}%</p>
          {recommendations.length > 0 && (
            <ul className="text-xs space-y-0.5">
              {recommendations.map((r: string, i: number) => <li key={i}>• {r}</li>)}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SupplierHealthBadge;
