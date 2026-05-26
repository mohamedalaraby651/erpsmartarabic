import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

describe('quotationRepository.create — atomic RPC contract', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
  });

  it('calls save_quotation_with_items with p_id=null and computed totals', async () => {
    rpcMock.mockResolvedValueOnce({ data: 'new-quote-id', error: null });
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: 'new-quote-id', quote_number: 'Q-0001' }, error: null }),
        }),
      }),
    });

    const { quotationRepository } = await import('@/lib/repositories/quotationRepository');
    const out = await quotationRepository.create({
      customer_id: 'cust-1',
      quote_date: '2026-01-01',
      valid_until: '2026-02-01',
      items: [
        { product_id: 'p1', quantity: 2, unit_price: 100, discount_percentage: 10 },
        { product_id: 'p2', quantity: 1, unit_price: 50 },
      ],
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    const [fnName, payload] = rpcMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(fnName).toBe('save_quotation_with_items');
    expect(payload.p_id).toBeNull();
    // 2*100*0.9 + 1*50 = 230
    expect((payload.p_header as { subtotal: number }).subtotal).toBe(230);
    expect((payload.p_header as { total_amount: number }).total_amount).toBe(230);
    expect((payload.p_items as unknown[]).length).toBe(2);

    expect(out.id).toBe('new-quote-id');
    expect(out.quote_number).toBe('Q-0001');
  });

  it('surfaces RPC errors with arabic message', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } });
    const { quotationRepository } = await import('@/lib/repositories/quotationRepository');
    await expect(
      quotationRepository.create({
        customer_id: 'cust-1',
        quote_date: '2026-01-01',
        valid_until: '2026-02-01',
        items: [{ product_id: 'p1', quantity: 1, unit_price: 10 }],
      }),
    ).rejects.toThrow();
  });

  it('throws when RPC returns no id', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    const { quotationRepository } = await import('@/lib/repositories/quotationRepository');
    await expect(
      quotationRepository.create({
        customer_id: 'cust-1',
        quote_date: '2026-01-01',
        valid_until: '2026-02-01',
        items: [{ product_id: 'p1', quantity: 1, unit_price: 10 }],
      }),
    ).rejects.toThrow(/save_quotation_with_items returned no id/);
  });

  it('rounds line totals using banker-safe 2-decimal rule', async () => {
    rpcMock.mockResolvedValueOnce({ data: 'q', error: null });
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'q', quote_number: '' }, error: null }),
        }),
      }),
    });

    const { quotationRepository } = await import('@/lib/repositories/quotationRepository');
    await quotationRepository.create({
      customer_id: 'c',
      quote_date: '2026-01-01',
      valid_until: '2026-02-01',
      items: [{ product_id: 'p', quantity: 3, unit_price: 33.335 }],
    });

    const payload = rpcMock.mock.calls[0][1] as { p_items: Array<{ total_price: number }> };
    // 3 * 33.335 = 100.005 → 100.01 (round half up)
    expect(payload.p_items[0].total_price).toBeCloseTo(100.01, 2);
  });
});
