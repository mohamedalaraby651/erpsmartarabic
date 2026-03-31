import React from 'react';
import { Bell, AlertOctagon, Clock, TrendingUp, CalendarClock, Crown, TrendingDown, UserMinus, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useDismissedAlerts } from '@/hooks/useAlertSettings';
import { AlertItemActions } from './AlertItemActions';
import { ALERT_TYPE_CONFIG, ALERT_TYPE_ORDER } from './AlertTypeConfig';
import type { AlertType, CustomerAlert } from '@/hooks/useCustomerAlerts';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  AlertOctagon, Clock, TrendingUp, CalendarClock, Crown, TrendingDown, UserMinus, UserPlus,
};

interface CustomerAlertsMobileTriggerProps {
  alertsByType: Map<AlertType, CustomerAlert[]>;
  totalAlerts: number;
  onFilterByType?: (type: AlertType | null) => void;
}

export const CustomerAlertsMobileTrigger = ({ alertsByType, totalAlerts, onFilterByType }: CustomerAlertsMobileTriggerProps) => {
  const { dismiss, isDismissed } = useDismissedAlerts();

  if (totalAlerts === 0) return null;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className="relative p-2 rounded-xl bg-background border border-border shadow-sm">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {totalAlerts > 0 && (
            <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {totalAlerts > 99 ? '99+' : totalAlerts}
            </span>
          )}
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle className="text-center">تنبيهات العملاء ({totalAlerts})</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto space-y-4">
          {ALERT_TYPE_ORDER.map(type => {
            const typeAlerts = alertsByType.get(type);
            if (!typeAlerts?.length) return null;

            const visibleAlerts = typeAlerts.filter(a => !isDismissed(`${a.type}-${a.customerId}`));
            if (visibleAlerts.length === 0) return null;

            const config = ALERT_TYPE_CONFIG[type];
            const IconComp = ICON_MAP[config.icon];

            return (
              <div key={type}>
                <button
                  onClick={() => onFilterByType?.(type)}
                  className="flex items-center gap-2 mb-2"
                >
                  {IconComp && <IconComp className={cn('h-4 w-4', config.color)} />}
                  <span className="text-sm font-semibold">{config.label}</span>
                  <span className="text-xs text-muted-foreground">({visibleAlerts.length})</span>
                </button>
                <div className="space-y-2">
                  {visibleAlerts.slice(0, 8).map((alert, i) => (
                    <div key={`${alert.customerId}-${i}`} className={cn('rounded-lg px-3 py-2', config.bgColor)}>
                      <p className="text-xs text-foreground">{alert.message}</p>
                      <AlertItemActions alert={alert} onDismiss={dismiss} />
                    </div>
                  ))}
                  {visibleAlerts.length > 8 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{visibleAlerts.length - 8} تنبيه آخر
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
