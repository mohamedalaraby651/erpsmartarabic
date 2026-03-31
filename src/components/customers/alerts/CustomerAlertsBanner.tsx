import React, { useState, useEffect, useRef } from 'react';
import { Settings, ChevronDown, ChevronUp, AlertOctagon, Clock, TrendingUp, CalendarClock, Crown, TrendingDown, UserMinus, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useDismissedAlerts } from '@/hooks/useAlertSettings';
import { AlertItemActions } from './AlertItemActions';
import { ALERT_TYPE_CONFIG, ALERT_TYPE_ORDER } from './AlertTypeConfig';
import type { AlertType, CustomerAlert } from '@/hooks/useCustomerAlerts';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  AlertOctagon, Clock, TrendingUp, CalendarClock, Crown, TrendingDown, UserMinus, UserPlus,
};

interface CustomerAlertsBannerProps {
  alertsByType: Map<AlertType, CustomerAlert[]>;
  totalAlerts: number;
  onFilterByType?: (type: AlertType | null) => void;
  activeFilterType?: AlertType | null;
}

export const CustomerAlertsBanner = ({ alertsByType, totalAlerts, onFilterByType, activeFilterType }: CustomerAlertsBannerProps) => {
  const navigate = useNavigate();
  const { dismiss, isDismissed } = useDismissedAlerts();
  const [expandedType, setExpandedType] = useState<string>('');
  const soundPlayedRef = useRef(false);
  const { settings } = useAlertSettings();

  // Play sound on first render with alerts
  useEffect(() => {
    if (totalAlerts > 0 && !soundPlayedRef.current && settings?.soundEnabled) {
      soundPlayedRef.current = true;
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.value = 0.05;
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } catch { /* ignore */ }
    }
  }, [totalAlerts, settings?.soundEnabled]);

  if (totalAlerts === 0) return null;

  const handleBadgeClick = (type: AlertType) => {
    // Toggle accordion
    setExpandedType(prev => prev === type ? '' : type);
    // Toggle filter
    if (onFilterByType) {
      onFilterByType(activeFilterType === type ? null : type);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
      {/* Badge bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap">
        {ALERT_TYPE_ORDER.map(type => {
          const typeAlerts = alertsByType.get(type);
          if (!typeAlerts?.length) return null;

          // Filter out dismissed
          const visibleAlerts = typeAlerts.filter(a => !isDismissed(`${a.type}-${a.customerId}`));
          if (visibleAlerts.length === 0) return null;

          const config = ALERT_TYPE_CONFIG[type];
          const IconComp = ICON_MAP[config.icon];
          const isActive = activeFilterType === type;

          return (
            <button
              key={type}
              onClick={() => handleBadgeClick(type)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                'hover:shadow-sm cursor-pointer border',
                isActive
                  ? 'border-foreground/20 bg-background shadow-sm'
                  : 'border-transparent bg-background/50 hover:bg-background',
              )}
            >
              {IconComp && <IconComp className={cn('h-3.5 w-3.5', config.color)} />}
              <span className="text-foreground">{visibleAlerts.length}</span>
              <span className="text-muted-foreground hidden sm:inline">{config.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => navigate('/settings/alerts')}
          className="p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-colors ms-auto"
          title="إعدادات التنبيهات"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Accordion details */}
      {expandedType && (
        <div className="border-t border-border">
          <Accordion type="single" value={expandedType} onValueChange={setExpandedType} collapsible>
            {ALERT_TYPE_ORDER.map(type => {
              if (expandedType !== type) return null;
              const typeAlerts = alertsByType.get(type);
              if (!typeAlerts?.length) return null;

              const visibleAlerts = typeAlerts.filter(a => !isDismissed(`${a.type}-${a.customerId}`));
              if (visibleAlerts.length === 0) return null;

              const config = ALERT_TYPE_CONFIG[type];
              const IconComp = ICON_MAP[config.icon];

              return (
                <AccordionItem key={type} value={type} className="border-0">
                  <AccordionTrigger className="px-4 py-2 text-sm hover:no-underline">
                    <div className="flex items-center gap-2">
                      {IconComp && <IconComp className={cn('h-4 w-4', config.color)} />}
                      <span className="font-semibold">{config.label}</span>
                      <span className="text-xs text-muted-foreground">({visibleAlerts.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3">
                    <div className="space-y-2">
                      {visibleAlerts.slice(0, 10).map((alert, i) => (
                        <div key={`${alert.customerId}-${i}`} className={cn('rounded-lg px-3 py-2', config.bgColor)}>
                          <p className="text-xs text-foreground">{alert.message}</p>
                          <AlertItemActions alert={alert} onDismiss={dismiss} />
                        </div>
                      ))}
                      {visibleAlerts.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center py-1">
                          +{visibleAlerts.length - 10} تنبيه آخر
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}
    </div>
  );
};
