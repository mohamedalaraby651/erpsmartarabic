import { describe, it, expect, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));

import { validateInvoice } from '../secureOperations';

describe('validateInvoice surfaces the real server reason', () => {
  it('maps a 400 credit-limit body to its Arabic message', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ valid: false, code: 'CREDIT_LIMIT_EXCEEDED', error: 'Customer credit limit exceeded' }), { status: 400 }) } });
    const r = await validateInvoice({ customer_id: 'c', total_amount: 10 });
    expect(r.code).toBe('CREDIT_LIMIT_EXCEEDED');
    expect(r.error).toBe('تم تجاوز الحد الائتماني للعميل');
  });
  it('falls back to the server text for unknown codes', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ code: 'SOMETHING_NEW', error: 'Server said no' }), { status: 400 }) } });
    const r = await validateInvoice({ customer_id: 'c', total_amount: 10 });
    expect(r.error).toBe('Server said no');
  });
  it('treats a 403 without body as no permission', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response('x', { status: 403 }) } });
    const r = await validateInvoice({ customer_id: 'c', total_amount: 10 });
    expect(r.error).toBe('ليس لديك صلاحية للقيام بهذا الإجراء');
  });
});
