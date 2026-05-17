import { memo, useMemo } from 'react';
import { Bell, AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { BusinessInsight } from '@/hooks/useBusinessInsights';

const severityIcon = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
} as const;

const severityClass: Record<BusinessInsight['severity'], string> = {
  error: 'text-destructive',
  warning: 'text-warning',
  info: 'text-primary',
  success: 'text-success',
};

interface AlertsBellProps {
  insights: BusinessInsight[];
}

export const AlertsBell = memo(function AlertsBell({ insights }: AlertsBellProps) {
  const navigate = useNavigate();
  const actionable = useMemo(
    () => insights.filter((i) => i.severity !== 'success'),
    [insights],
  );
  const count = actionable.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label={`التنبيهات (${count})`}>
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1.5 -end-1.5 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
            >
              {count > 9 ? '9+' : count}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>التنبيهات الذكية</span>
          {count > 0 && <span className="text-xs text-muted-foreground">{count} عنصر</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actionable.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
            لا توجد تنبيهات نشطة
          </div>
        ) : (
          actionable.slice(0, 6).map((insight) => {
            const Icon = severityIcon[insight.severity];
            return (
              <DropdownMenuItem
                key={insight.id}
                className="flex items-start gap-3 py-2.5 cursor-pointer"
                onClick={() => insight.action?.href && navigate(insight.action.href)}
              >
                <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', severityClass[insight.severity])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{insight.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{insight.message}</p>
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
