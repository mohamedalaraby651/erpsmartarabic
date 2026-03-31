/**
 * Customer Relations Repository
 * Handles related entities: Invoices, Payments, Credit Notes, Orders, Quotations,
 * Activities, Reminders, Communications
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];
type CreditNote = Database['public']['Tables']['credit_notes']['Row'];
type SalesOrder = Database['public']['Tables']['sales_orders']['Row'];
type Quotation = Database['public']['Tables']['quotations']['Row'];
type CustomerReminder = Database['public']['Tables']['customer_reminders']['Row'];
type CustomerCommunication = Database['public']['Tables']['customer_communications']['Row'];
type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];

export const customerRelationsRepo = {
  // ============================================
  // Invoices
  // ============================================

  async findInvoices(customerId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data || []) as Invoice[];
  },

  async findInvoicesPaginated(customerId: string, page: number, pageSize: number): Promise<{ data: Invoice[]; count: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { data: (data || []) as Invoice[], count: count || 0 };
  },

  // ============================================
  // Payments
  // ============================================

  async findPayments(customerId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*, invoices:invoice_id(invoice_number)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data || []) as (Payment & { invoices: { invoice_number: string } | null })[];
  },

  async findPaymentsPaginated(customerId: string, page: number, pageSize: number): Promise<{ data: (Payment & { invoices: { invoice_number: string } | null })[]; count: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await supabase
      .from('payments')
      .select('*, invoices:invoice_id(invoice_number)', { count: 'exact' })
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { data: (data || []) as (Payment & { invoices: { invoice_number: string } | null })[], count: count || 0 };
  },

  // ============================================
  // Credit Notes
  // ============================================

  async findCreditNotes(customerId: string): Promise<CreditNote[]> {
    const { data, error } = await supabase
      .from('credit_notes')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data || []) as CreditNote[];
  },

  // ============================================
  // Sales Orders & Quotations
  // ============================================

  async findSalesOrders(customerId: string): Promise<SalesOrder[]> {
    const { data, error } = await supabase
      .from('sales_orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data || []) as SalesOrder[];
  },

  async findQuotations(customerId: string): Promise<Quotation[]> {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data || []) as Quotation[];
  },

  // ============================================
  // Activities
  // ============================================

  async findActivities(customerId: string): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_type', 'customer')
      .eq('entity_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data || []) as ActivityLog[];
  },

  // ============================================
  // Reminders
  // ============================================

  async findReminders(customerId: string): Promise<CustomerReminder[]> {
    const { data, error } = await supabase
      .from('customer_reminders')
      .select('*')
      .eq('customer_id', customerId)
      .order('reminder_date', { ascending: true });
    if (error) throw error;
    return (data || []) as CustomerReminder[];
  },

  async createReminder(payload: { customer_id: string; reminder_date: string; note: string; created_by: string; recurrence?: string | null; linked_invoice_id?: string | null }): Promise<void> {
    const { error } = await supabase
      .from('customer_reminders')
      .insert(payload);
    if (error) throw error;
  },

  async updateReminder(id: string, payload: { is_completed: boolean; updated_at: string }): Promise<void> {
    const { error } = await supabase
      .from('customer_reminders')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
  },

  // ============================================
  // Communications
  // ============================================

  async findCommunications(customerId: string): Promise<CustomerCommunication[]> {
    const { data, error } = await supabase
      .from('customer_communications')
      .select('*')
      .eq('customer_id', customerId)
      .order('communication_date', { ascending: false });
    if (error) throw error;
    return (data || []) as CustomerCommunication[];
  },

  async createCommunication(payload: { customer_id: string; type: string; subject: string | null; note: string; created_by: string }): Promise<void> {
    const { error } = await supabase
      .from('customer_communications')
      .insert(payload);
    if (error) throw error;
  },
};
