import { useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'];

export type SupplierAlertType =
  | 'credit_exceeded'
  | 'high_balance'
  | 'inactive'
  | 'overdue_orders';

export interface SupplierAlert {
  type: SupplierAlertType;
  supplierId: string;
  supplierName: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

export function useSupplierAlerts(suppliers: Supplier[]) {
  return useMemo(() => {
    const alerts: SupplierAlert[] = [];
    const now = Date.now();

    for (const s of suppliers) {
      const balance = Number(s.current_balance || 0);
      const creditLimit = Number(s.credit_limit || 0);

      // Credit limit exceeded
      if (creditLimit > 0 && balance >= creditLimit) {
        alerts.push({
          type: 'credit_exceeded',
          supplierId: s.id,
          supplierName: s.name,
          message: `${s.name}: تجاوز حد الائتمان — ${balance.toLocaleString()} / ${creditLimit.toLocaleString()} ج.م`,
          severity: 'critical',
        });
      }

      // High balance (> 50,000)
      if (balance > 50000 && !(creditLimit > 0 && balance >= creditLimit)) {
        alerts.push({
          type: 'high_balance',
          supplierId: s.id,
          supplierName: s.name,
          message: `${s.name}: رصيد مرتفع — ${balance.toLocaleString()} ج.م`,
          severity: 'warning',
        });
      }

      // Inactive supplier (90+ days no update)
      if (s.is_active && s.updated_at) {
        const daysSince = Math.floor((now - new Date(s.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > 90) {
          alerts.push({
            type: 'inactive',
            supplierId: s.id,
            supplierName: s.name,
            message: `${s.name}: غير نشط منذ ${daysSince} يوم`,
            severity: 'info',
          });
        }
      }
    }

    // Sort by severity
    alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

    // Group by type
    const byType = new Map<SupplierAlertType, SupplierAlert[]>();
    for (const alert of alerts) {
      const arr = byType.get(alert.type) || [];
      arr.push(alert);
      byType.set(alert.type, arr);
    }

    return { alerts, alertsByType: byType, totalAlerts: alerts.length };
  }, [suppliers]);
}
