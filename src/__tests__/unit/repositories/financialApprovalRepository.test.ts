import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const from = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args), from: (...args: unknown[]) => from(...args) } }));
import { financialApprovalRepository } from '@/lib/repositories/financialApprovalRepository';

describe('financial approval RPC boundary', () => {
  beforeEach(() => { rpc.mockReset(); from.mockReset(); });
  it('approves the exact request through an atomic operation without supplying an approver identity', async () => {
    rpc.mockResolvedValue({ error: null });
    await financialApprovalRepository.resolve('request-1', true);
    expect(rpc).toHaveBeenCalledWith('resolve_period_reopen', { _request_id: 'request-1', _approve: true, _reason: undefined });
    expect(from).not.toHaveBeenCalled();
  });
  it('passes rejection and its reason without reopening directly', async () => {
    rpc.mockResolvedValue({ error: null });
    await financialApprovalRepository.resolve('request-2', false, 'لا حاجة لتعديل الفترة');
    expect(rpc).toHaveBeenCalledWith('resolve_period_reopen', { _request_id: 'request-2', _approve: false, _reason: 'لا حاجة لتعديل الفترة' });
    expect(from).not.toHaveBeenCalled();
  });
  it('does not report success when server approval is denied', async () => {
    rpc.mockResolvedValue({ error: { code: '42501', message: 'denied' } });
    await expect(financialApprovalRepository.resolve('request-3', true)).rejects.toThrow();
  });
  it('does not report success when a reopening request is rejected by period validation', async () => {
    rpc.mockResolvedValue({ error: { code: 'P0001', message: 'period not closed' } });
    await expect(financialApprovalRepository.requestPeriodReopen('period-1', 'تصحيح سند')).rejects.toThrow();
  });
});