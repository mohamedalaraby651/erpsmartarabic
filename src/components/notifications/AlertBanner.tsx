import { X, AlertTriangle, Info, CheckCircle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AlertBannerProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  className?: string;
}

const alertStyles = {
  info: {
    bg: 'bg-info/10 border-info/20',
    text: 'text-info',
    icon: Info,
  },
  warning: {
    bg: 'bg-warning/10 border-warning/20',
    text: 'text-warning',
    icon: AlertTriangle,
  },
  error: {
    bg: 'bg-destructive/10 border-destructive/20',
    text: 'text-destructive',
    icon: AlertTriangle,
  },
  success: {
    bg: 'bg-success/10 border-success/20',
    text: 'text-success',
    icon: CheckCircle,
  },
};

export function AlertBanner({
  type = 'info',
  title,
  message,
  action,
  onDismiss,
  className,
}: AlertBannerProps) {
  const styles = alertStyles[type];
  const Icon = styles.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b animate-slide-down',
        styles.bg,
        className
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', styles.text)} />
      
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', styles.text)}>{title}</p>
        {message && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{message}</p>
        )}
      </div>

      {action && (
        <Button
          variant="ghost"
          size="sm"
          className={cn('shrink-0', styles.text)}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}

      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// Container for multiple alerts
interface AlertBannerContainerProps {
  alerts: Array<AlertBannerProps & { id: string }>;
  onDismiss: (id: string) => void;
  className?: string;
}

export function AlertBannerContainer({
  alerts,
  onDismiss,
  className,
}: AlertBannerContainerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className={cn('fixed top-0 left-0 right-0 z-50', className)}>
      {alerts.map((alert) => (
        <AlertBanner
          key={alert.id}
          {...alert}
          onDismiss={() => onDismiss(alert.id)}
        />
      ))}
    </div>
  );
}
