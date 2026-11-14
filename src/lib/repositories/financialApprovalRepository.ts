import { supabase } from '@/integrations/supabase/client';
import { mapRepoError } from './_base';

export const financialApprovalRepository = {
  async requestPeriodReopen(periodId: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc('request_period_reopen', { _period_id: periodId, _reason: reason });
    if (error) throw mapRepoError(error, 'تعذّر إرسال طلب فتح الفترة.');
  },
  async list() {
    const { data, error } = await supabase.from('approval_requests').select('*').order('created_at', { ascending: false });
    if (error) throw mapRepoError(error);
    return data ?? [];
  },
  async resolve(id: string, approve: boolean, reason?: string) {
    const { error } = await supabase.rpc('resolve_period_reopen', { _request_id: id, _approve: approve, _reason: reason ?? null });
    if (error) throw mapRepoError(error, 'تعذّر البت في طلب فتح الفترة.');
  },
};