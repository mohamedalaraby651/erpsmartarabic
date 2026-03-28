/**
 * Payment Domain Service Layer
 * Centralized business logic for payment operations.
 */

import { supabase } from "@/integrations/supabase/client";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import type { Database } from "@/integrations/supabase/types";

type Payment = Database['public']['Tables']['payments']['Row'];
type PaymentMethod = Database['public']['Enums']['payment_method'];

// ============================================
// Permission Checks
// ============================================

export async function canDeletePayment(): Promise<boolean> {
  return verifyPermissionOnServer('payments', 'delete');
}

// ============================================
// Operations
// ============================================

/**
 * Delete a payment: verify permission → delete.
 * DB trigger `reverse_payment_on_delete` automatically reverses customer balance.
 */
export async function deletePayment(id: string): Promise<void> {
  const hasPermission = await canDeletePayment();
  if (!hasPermission) throw new Error('UNAUTHORIZED');

  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw error;
}

// ============================================
// Statistics
// ============================================

export interface PaymentStats {
  total: number;
  totalAmount: number;
  cash: number;
  bank: number;
}

export function calculatePaymentStats(
  payments: Pick<Payment, 'amount' | 'payment_method'>[]
): PaymentStats {
  return {
    total: payments.length,
    totalAmount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    cash: payments
      .filter((p) => p.payment_method === 'cash')
      .reduce((sum, p) => sum + Number(p.amount), 0),
    bank: payments
      .filter((p) => p.payment_method === 'bank_transfer')
      .reduce((sum, p) => sum + Number(p.amount), 0),
  };
}
