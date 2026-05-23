/**
 * Settings Repository — Centralized access to `company_settings`.
 * Replaces direct supabase.from('company_settings') calls in UI/print/PDF layers.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type CompanySettingsRow = Database['public']['Tables']['company_settings']['Row'];
export type CompanySettingsUpdate = Database['public']['Tables']['company_settings']['Update'];
export type CompanySettingsInsert = Database['public']['Tables']['company_settings']['Insert'];

export const settingsRepository = {
  async getCompany(): Promise<CompanySettingsRow | null> {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsertCompany(
    existingId: string | null,
    payload: CompanySettingsUpdate | CompanySettingsInsert,
  ): Promise<void> {
    if (existingId) {
      const { error } = await supabase
        .from('company_settings')
        .update(payload)
        .eq('id', existingId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('company_settings')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(payload as any);
      if (error) throw error;
    }
  },
};
