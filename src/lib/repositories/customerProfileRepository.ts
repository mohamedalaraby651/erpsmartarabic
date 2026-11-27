import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CustomerContact = Database['public']['Tables']['customer_contacts']['Row'];
export type PaymentPromise = Database['public']['Tables']['payment_promises']['Row'];

export interface InvoiceLine {
  id: string; quantity: number; unit_price: number; discount_percentage: number | null; total_price: number; product_name: string;
}

export type CustomerAttachment = Database['public']['Tables']['attachments']['Row'];

export const customerProfileRepository = {
  /** Same shape and order as the notes tab, so both share the ['customer-notes', id] cache. */
  async listNotes(customerId: string) {
    const { data, error } = await supabase.from('customer_notes').select('*')
      .eq('customer_id', customerId).order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  /** Same query as AttachmentsList, shared via ['attachments', type, id]. */
  async listAttachments(entityType: string, entityId: string): Promise<CustomerAttachment[]> {
    const { data, error } = await supabase.from('attachments').select('*')
      .eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async listContacts(customerId: string): Promise<CustomerContact[]> {
    const { data, error } = await supabase.from('customer_contacts').select('*')
      .eq('customer_id', customerId).order('is_primary', { ascending: false }).order('created_at');
    if (error) throw error;
    return data ?? [];
  },
  async addContact(input: { customer_id: string; name: string; role?: string | null; phone?: string | null; email?: string | null; is_primary?: boolean }) {
    const { error } = await supabase.from('customer_contacts').insert(input);
    if (error) throw error;
  },
  async listPromises(customerId: string): Promise<PaymentPromise[]> {
    const { data, error } = await supabase.from('payment_promises').select('*')
      .eq('customer_id', customerId).order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    return data ?? [];
  },
  async addPromise(input: { customer_id: string; promised_date: string; amount: number; invoice_id?: string | null; notes?: string | null }) {
    const { error } = await supabase.from('payment_promises').insert(input);
    if (error) throw error;
  },
  async setPromiseStatus(id: string, status: 'kept' | 'broken' | 'cancelled') {
    const { error } = await supabase.from('payment_promises').update({ status }).eq('id', id);
    if (error) throw error;
  },
  async invoiceLines(invoiceId: string): Promise<InvoiceLine[]> {
    const { data, error } = await supabase.from('invoice_items')
      .select('id, quantity, unit_price, discount_percentage, total_price, products(name)')
      .eq('invoice_id', invoiceId).order('created_at');
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id, quantity: Number(r.quantity), unit_price: Number(r.unit_price), discount_percentage: r.discount_percentage,
      total_price: Number(r.total_price), product_name: (r.products as { name?: string } | null)?.name ?? '—',
    }));
  },
  async invoiceItemCounts(invoiceIds: string[]): Promise<Record<string, number>> {
    if (!invoiceIds.length) return {};
    const { data, error } = await supabase.from('invoice_items').select('invoice_id').in('invoice_id', invoiceIds);
    if (error) throw error;
    const out: Record<string, number> = {};
    for (const r of data ?? []) out[r.invoice_id] = (out[r.invoice_id] ?? 0) + 1;
    return out;
  },
  async warehouseName(id: string): Promise<string | null> {
    const { data } = await supabase.from('warehouses').select('name').eq('id', id).maybeSingle();
    return data?.name ?? null;
  },
};
