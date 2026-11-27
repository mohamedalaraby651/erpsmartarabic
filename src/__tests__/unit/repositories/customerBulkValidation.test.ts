import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
import { customerRepository } from '@/lib/repositories/customerRepository';

describe('customer bulk obligation validation', () => {
  beforeEach(() => rpc.mockReset());

  it('checks all selected customers through the database without a caller-supplied tenant', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await expect(customerRepository.batchValidateDelete(['customer-a', 'customer-b'])).resolves.toEqual([]);
    expect(rpc).toHaveBeenCalledWith('batch_validate_delete', { p_ids: ['customer-a', 'customer-b'] });
  });

  it('preserves the open-invoice blocker returned by the database', async () => {
    const blocked = [{ customer_id: 'customer-b', customer_name: 'B', open_invoice_count: 2 }];
    rpc.mockResolvedValue({ data: blocked, error: null });
    await expect(customerRepository.batchValidateDelete(['customer-a', 'customer-b'])).resolves.toEqual(blocked);
  });

  it('fails closed when the database denies validation', async () => {
    const error = { code: '42501', message: 'Customer deletion permission required' };
    rpc.mockResolvedValue({ data: null, error });
    await expect(customerRepository.batchValidateDelete(['customer-a'])).rejects.toEqual(error);
  });
});