/**
 * Employee Repository — Centralized data access for employees.
 * Wave 3c: removes direct supabase.from('employees') leaks from UI/hooks.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { sanitizeSearch } from '@/lib/utils/sanitize';

export type EmployeeRow = Database['public']['Tables']['employees']['Row'];
export type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
export type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];

export interface EmployeeFilters {
  search?: string;
  department?: string;
  status?: string;
}

export interface EmployeeListParams {
  filters: EmployeeFilters;
  page: number;
  pageSize: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<T extends { or: (...a: any[]) => any; eq: (...a: any[]) => any }>(
  query: T,
  { search, department, status }: EmployeeFilters,
): T {
  let q = query;
  if (search) {
    const s = sanitizeSearch(search);
    q = q.or(
      `full_name.ilike.%${s}%,employee_number.ilike.%${s}%,phone.ilike.%${s}%`,
    ) as typeof q;
  }
  if (department && department !== 'all') q = q.eq('department', department) as typeof q;
  if (status && status !== 'all') q = q.eq('employment_status', status) as typeof q;
  return q;
}

export const employeeRepository = {
  async count(filters: EmployeeFilters): Promise<number> {
    let query = supabase.from('employees').select('*', { count: 'exact', head: true });
    query = applyFilters(query, filters);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  },

  async list({ filters, page, pageSize }: EmployeeListParams): Promise<EmployeeRow[]> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    query = applyFilters(query, filters);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as EmployeeRow[];
  },

  async findActive(): Promise<EmployeeRow[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employment_status', 'active')
      .order('full_name');
    if (error) throw error;
    return (data || []) as EmployeeRow[];
  },

  async findById(id: string): Promise<EmployeeRow | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload: EmployeeInsert): Promise<EmployeeRow> {
    const { data, error } = await supabase
      .from('employees')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: EmployeeUpdate): Promise<void> {
    const { error } = await supabase.from('employees').update(payload).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) throw error;
  },
};
