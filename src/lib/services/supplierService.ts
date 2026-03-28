/**
 * Supplier Domain Service Layer
 * Centralized business logic for supplier operations.
 */

import { supabase } from "@/integrations/supabase/client";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import type { Database } from "@/integrations/supabase/types";

type PaymentMethod = Database['public']['Enums']['payment_method'];

// ============================================
// Permission Checks
// ============================================

export async function canDeleteSupplier(): Promise<boolean> {
  return verifyPermissionOnServer('suppliers', 'delete');
}

// ============================================
// Operations
// ============================================

/**
 * Delete a supplier: verify permission → delete.
 */
export async function deleteSupplier(id: string): Promise<void> {
  const hasPermission = await canDeleteSupplier();
  if (!hasPermission) throw new Error('UNAUTHORIZED');

  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw error;
}

// ============================================
// Supplier Payments
// ============================================

export interface RecordSupplierPaymentData {
  supplierId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
  createdBy?: string;
}

/**
 * Record a payment to a supplier:
 * 1. Insert into supplier_payments
 * 2. Atomically update supplier balance via RPC
 */
export async function recordSupplierPayment(data: RecordSupplierPaymentData): Promise<void> {
  if (!data.supplierId) throw new Error('يجب اختيار المورد');
  if (data.amount <= 0) throw new Error('يرجى إدخال مبلغ صحيح');

  const paymentNumber = `SP-${Date.now().toString().slice(-8)}`;

  const { error: paymentError } = await supabase
    .from('supplier_payments')
    .insert({
      payment_number: paymentNumber,
      supplier_id: data.supplierId,
      amount: data.amount,
      payment_method: data.paymentMethod,
      payment_date: data.paymentDate,
      reference_number: data.referenceNumber || null,
      notes: data.notes || null,
      created_by: data.createdBy || null,
    });

  if (paymentError) throw paymentError;

  // Atomic balance update — avoids race conditions
  const { error: updateError } = await (supabase.rpc as Function)('atomic_supplier_balance_update', {
    _supplier_id: data.supplierId,
    _amount: data.amount,
  });

  if (updateError) throw updateError;
}
