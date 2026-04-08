import { useState } from 'react';
import { AlertOctagon, TrendingUp, UserMinus, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { SupplierAlertType, SupplierAlert } from '@/hooks/suppliers/useSupplierAlerts';

const ALERT_CONFIG: Record<SupplierAlertType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  credit_exceeded: { label: 'تجاوز الائتمان', icon: AlertOctagon, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  high_balance: { label: 'رصيد مرتفع', icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/10' },
  inactive: { label: 'غير نشط', icon: UserMinus, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500/10' },
  overdue_orders: { label: 'أوامر متأخرة', icon: AlertOctagon, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-500/10' },
};

const TYPE_ORDER: SupplierAlertType[] = ['credit_exceeded', 'high_balance', 'overdue_orders', 'inactive'];

interface SupplierAlertsBannerListProps {
  alertsByType: Map<SupplierAlertType, SupplierAlert[]>;
  totalAlerts: number;
}

export function SupplierAlertsBannerList({ alertsByType, totalAlerts }: SupplierAlertsBannerListProps) {
  const navigate = useNavigate();
  const [expandedType, setExpandedType] = useState<string>('');

  if (totalAlerts === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
      {/* Badge bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap">
        {TYPE_ORDER.map(type => {
          const typeAlerts = alertsByType.get(type);
          if (!typeAlerts?.length) return null;

          const config = ALERT_CONFIG[type];
          const Icon = config.icon;

          return (
            <button
              key={type}
              onClick={() => setExpandedType(prev => prev === type ? '' : type)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                'hover:shadow-sm cursor-pointer border',
                expandedType === type
                  ? 'border-foreground/20 bg-background shadow-sm'
                  : 'border-transparent bg-background/50 hover:bg-background',
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', config.color)} />
              <span className="text-foreground">{typeAlerts.length}</span>
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
            {TYPE_ORDER.map(type => {
              if (expandedType !== type) return null;
              const typeAlerts = alertsByType.get(type);
              if (!typeAlerts?.length) return null;

              const config = ALERT_CONFIG[type];
              const Icon = config.icon;

              return (
                <AccordionItem key={type} value={type} className="border-0">
                  <AccordionTrigger className="px-4 py-2 text-sm hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-4 w-4', config.color)} />
                      <span className="font-semibold">{config.label}</span>
                      <span className="text-xs text-muted-foreground">({typeAlerts.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3">
                    <div className="space-y-2">
                      {typeAlerts.slice(0, 10).map((alert, i) => (
                        <div
                          key={`${alert.supplierId}-${i}`}
                          className={cn('rounded-lg px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity', config.bgColor)}
                          onClick={() => navigate(`/suppliers/${alert.supplierId}`)}
                        >
                          <p className="text-xs text-foreground">{alert.message}</p>
                        </div>
                      ))}
                      {typeAlerts.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center py-1">
                          +{typeAlerts.length - 10} تنبيه آخر
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
}
