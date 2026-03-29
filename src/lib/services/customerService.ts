/**
 * Customer Domain Service Layer
 * Centralized business logic for customer operations.
 * Hooks and components should delegate business rules here.
 */

import { supabase } from "@/integrations/supabase/client";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

// ============================================
// Permission Checks
// ============================================

/** Server-side check: can user delete a customer? */
export async function canDeleteCustomer(): Promise<boolean> {
  return verifyPermissionOnServer('customers', 'delete');
}

/** Server-side check: can user modify a customer? */
export async function canModifyCustomer(): Promise<boolean> {
  return verifyPermissionOnServer('customers', 'edit');
}

// ============================================
// Validation
// ============================================

/** Check if customer has open invoices preventing deletion */
export async function validateBeforeDelete(customerId: string): Promise<{ canDelete: boolean; reason?: string }> {
  const { count, error } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .in('payment_status', ['pending', 'partial']);

  if (error) {
    return { canDelete: false, reason: 'فشل التحقق من الفواتير المفتوحة' };
  }

  if (count && count > 0) {
    return {
      canDelete: false,
      reason: `لا يمكن حذف العميل — لديه ${count} فاتورة غير مسددة`,
    };
  }

  return { canDelete: true };
}

// ============================================
// Business Calculations
// ============================================

interface CustomerHealthMetrics {
  dso: number | null;
  clv: number;
  paymentRatio: number;
  avgInvoiceValue: number;
  totalPurchases: number;
  totalPayments: number;
}

/** Calculate customer financial health metrics */
export function calculateCustomerHealth(
  invoices: Invoice[],
  payments: Payment[]
): CustomerHealthMetrics {
  const totalPurchases = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const totalPayments = payments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
  const paymentRatio = totalPurchases > 0 ? (totalPayments / totalPurchases) * 100 : 0;
  const avgInvoiceValue = invoices.length > 0 ? totalPurchases / invoices.length : 0;

  // DSO — uses due_date (fallback to created_at) vs actual payment dates
  const paidInvoices = invoices.filter(inv => inv.payment_status === 'paid');
  let dso: number | null = null;

  if (paidInvoices.length > 0 && payments.length > 0) {
    const paymentDatesByInvoice = new Map<string, string>();
    for (const payment of payments) {
      const invId = payment.invoice_id;
      if (!invId) continue;
      const existing = paymentDatesByInvoice.get(invId);
      if (!existing || payment.payment_date > existing) {
        paymentDatesByInvoice.set(invId, payment.payment_date);
      }
    }

    let totalDays = 0;
    let count = 0;
    for (const inv of paidInvoices) {
      const paidAt = paymentDatesByInvoice.get(inv.id);
      if (!paidAt) continue;
      // Use due_date if available, otherwise created_at
      const referenceDate = new Date(inv.due_date || inv.created_at).getTime();
      const paid = new Date(paidAt).getTime();
      totalDays += Math.max(0, (paid - referenceDate) / (1000 * 60 * 60 * 24));
      count++;
    }
    dso = count > 0 ? Math.round(totalDays / count) : null;
  }

  return {
    dso,
    clv: totalPurchases,
    paymentRatio,
    avgInvoiceValue,
    totalPurchases,
    totalPayments,
  };
}
