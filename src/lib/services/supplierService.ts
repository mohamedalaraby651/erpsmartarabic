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
 * Record a supplier payment through the tenant-scoped atomic payment operation.
 */
export async function recordSupplierPayment(data: RecordSupplierPaymentData): Promise<string> {
  if (!data.supplierId) throw new Error('يجب اختيار المورد');
  if (!Number.isFinite(data.amount) || data.amount <= 0) throw new Error('يرجى إدخال مبلغ صحيح');

  const params = {
    _supplier_id: data.supplierId,
    _amount: Math.round(data.amount * 100) / 100,
    _payment_method: data.paymentMethod,
    _payment_date: data.paymentDate,
    ...(data.referenceNumber ? { _reference_number: data.referenceNumber } : {}),
    ...(data.notes ? { _notes: data.notes } : {}),
  };
  const { data: paymentId, error } = await supabase.rpc('record_supplier_payment', params);
  if (error) throw error;
  return paymentId;
}
