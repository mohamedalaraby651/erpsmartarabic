/**
 * Invoice Domain Service Layer
 * Centralized business logic for invoice operations.
 */

import { supabase } from "@/integrations/supabase/client";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];

// ============================================
// Permission Checks
// ============================================

export async function canDeleteInvoice(): Promise<boolean> {
  return verifyPermissionOnServer('invoices', 'delete');
}

// ============================================
// Validation
// ============================================

/** Check if invoice has linked payments before deletion */
export async function validateBeforeDelete(invoiceId: string): Promise<{ safe: boolean; reason?: string }> {
  const { count, error } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('invoice_id', invoiceId);

  if (error) return { safe: false, reason: 'خطأ في التحقق من المدفوعات المرتبطة' };
  if (count && count > 0) {
    return { safe: false, reason: `يوجد ${count} دفعة مرتبطة بهذه الفاتورة` };
  }
  return { safe: true };
}

// ============================================
// Operations
// ============================================

/**
 * Delete an invoice: verify permission → delete items → delete invoice
 * Triggers in DB automatically reverse customer balance/stats.
 */
export async function deleteInvoice(id: string): Promise<void> {
  const hasPermission = await canDeleteInvoice();
  if (!hasPermission) throw new Error('UNAUTHORIZED');

  // Delete child items first
  await supabase.from('invoice_items').delete().eq('invoice_id', id);

  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}

// ============================================
// Statistics
// ============================================

export interface InvoiceStats {
  total: number;
  unpaid: number;
  totalValue: number;
  unpaidValue: number;
}

export function calculateInvoiceStats(
  invoices: Pick<Invoice, 'total_amount' | 'paid_amount' | 'payment_status'>[]
): InvoiceStats {
  return {
    total: invoices.length,
    unpaid: invoices.filter((i) => i.payment_status === 'pending').length,
    totalValue: invoices.reduce((sum, i) => sum + Number(i.total_amount), 0),
    unpaidValue: invoices
      .filter((i) => i.payment_status !== 'paid')
      .reduce((sum, i) => sum + (Number(i.total_amount) - Number(i.paid_amount || 0)), 0),
  };
}
