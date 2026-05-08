/**
 * Invoice Domain Service Layer
 * Centralized business logic for invoice operations.
 */

import { supabase } from "@/integrations/supabase/client";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import { invoiceRepository } from "@/lib/repositories/invoiceRepository";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
type InvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert'];

// ============================================
// Save (atomic-ish: header + items)
// ============================================

export interface SaveInvoiceInput {
  id?: string; // undefined = create
  header: InvoiceInsert;
  items: Omit<InvoiceItemInsert, 'invoice_id'>[];
}

/**
 * Persists an invoice header + items.
 * For edits, replaces all items (legacy behavior preserved).
 * Note: not transactional client-side. The DB triggers reverse stats on delete,
 * and Phase 4 will move this to an RPC for true atomicity.
 */
export async function saveInvoiceWithItems(input: SaveInvoiceInput): Promise<string> {
  let invoiceId: string;
  if (input.id) {
    await invoiceRepository.update(input.id, input.header);
    await invoiceRepository.deleteItemsByInvoice(input.id);
    invoiceId = input.id;
  } else {
    const created = await invoiceRepository.create(input.header);
    invoiceId = created.id;
  }
  await invoiceRepository.bulkInsertItems(
    input.items.map((it) => ({ ...it, invoice_id: invoiceId }))
  );
  return invoiceId;
}


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
