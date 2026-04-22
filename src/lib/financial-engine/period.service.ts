/**
 * Period Service — fiscal period operations
 */
import { supabase } from '@/integrations/supabase/client';

export interface FiscalPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at: string | null;
}

export async function getCurrentPeriod(): Promise<FiscalPeriod | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('fiscal_periods')
    .select('*')
    .lte('start_date', today)
    .gte('end_date', today)
    .eq('is_closed', false)
    .maybeSingle();

  if (error) throw error;
  return data as FiscalPeriod | null;
}

export async function listPeriods(): Promise<FiscalPeriod[]> {
  const { data, error } = await supabase
    .from('fiscal_periods')
    .select('*')
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data || []) as FiscalPeriod[];
}

export async function isPeriodLocked(date: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('fiscal_periods')
    .select('is_closed')
    .lte('start_date', date)
    .gte('end_date', date)
    .maybeSingle();
  if (error) return false;
  return data?.is_closed === true;
}
