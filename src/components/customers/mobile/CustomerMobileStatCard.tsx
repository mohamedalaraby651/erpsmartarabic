import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerMobileStatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtitle?: string;
  color: 'emerald' | 'destructive' | 'primary' | 'warning' | 'info' | 'muted';
  progress?: number;
  progressLabel?: string;
}

const colorMap = {
  emerald: {
    border: 'border-s-success',
    iconBg: 'bg-success/10',
    iconText: 'text-success',
    valueText: 'text-success',
  },
  destructive: {
    border: 'border-s-destructive',
    iconBg: 'bg-destructive/10',
    iconText: 'text-destructive',
    valueText: 'text-destructive',
  },
  primary: {
    border: 'border-s-primary',
    iconBg: 'bg-primary/10',
    iconText: 'text-primary',
    valueText: 'text-primary',
  },
  warning: {
    border: 'border-s-warning',
    iconBg: 'bg-warning/10',
    iconText: 'text-warning',
    valueText: 'text-warning',
  },
  info: {
    border: 'border-s-primary',
    iconBg: 'bg-primary/10',
    iconText: 'text-primary',
    valueText: 'text-primary',
  },
  muted: {
    border: 'border-s-muted-foreground/30',
    iconBg: 'bg-muted',
    iconText: 'text-muted-foreground',
    valueText: 'text-foreground',
  },
};

export const CustomerMobileStatCard = memo(function CustomerMobileStatCard({
  icon: Icon, title, value, subtitle, color, progress, progressLabel,
}: CustomerMobileStatCardProps) {
  const colors = colorMap[color];

  return (
    <Card className={cn("border-s-4", colors.border)}>
      <CardContent className="p-3.5">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-xl shrink-0", colors.iconBg)}>
            <Icon className={cn("h-5 w-5", colors.iconText)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">{title}</p>
            <p className={cn("text-xl font-bold leading-tight", colors.valueText)}>
              {value}
            </p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {progress !== undefined && (
          <div className="mt-2.5 space-y-1">
            <Progress value={Math.min(progress, 100)} className="h-1.5" />
            {progressLabel && (
              <p className="text-[10px] text-muted-foreground">{progressLabel}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
