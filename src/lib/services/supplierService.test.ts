import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordSupplierPayment } from './supplierService';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock('@/lib/api/secureOperations', () => ({ verifyPermissionOnServer: vi.fn() }));

describe('supplier payment authority', () => {
  beforeEach(() => { mocks.rpc.mockReset().mockResolvedValue({ data: 'payment', error: null }); mocks.from.mockReset(); });
  it('records payment and balance through one rounded atomic operation', async () => {
    await expect(recordSupplierPayment({ supplierId: 'supplier', amount: 10.005, paymentMethod: 'cash', paymentDate: '2026-11-25', referenceNumber: 'R1', notes: 'Note', createdBy: 'spoofed' })).resolves.toBe('payment');
    expect(mocks.rpc).toHaveBeenCalledWith('record_supplier_payment', { _supplier_id: 'supplier', _amount: 10.01, _payment_method: 'cash', _payment_date: '2026-11-25', _reference_number: 'R1', _notes: 'Note' });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('omits optional blank details', async () => {
    await recordSupplierPayment({ supplierId: 'supplier', amount: 5, paymentMethod: 'cash', paymentDate: '2026-11-25' });
    expect(mocks.rpc).toHaveBeenCalledWith('record_supplier_payment', { _supplier_id: 'supplier', _amount: 5, _payment_method: 'cash', _payment_date: '2026-11-25' });
  });
  it.each([0, -1, Number.NaN])('rejects invalid amount %s before writing', async amount => {
    await expect(recordSupplierPayment({ supplierId: 'supplier', amount, paymentMethod: 'cash', paymentDate: '2026-11-25' })).rejects.toThrow('يرجى إدخال مبلغ صحيح');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('surfaces database refusal without a separate balance write', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'Not allowed' } });
    await expect(recordSupplierPayment({ supplierId: 'foreign', amount: 5, paymentMethod: 'cash', paymentDate: '2026-11-25' })).rejects.toMatchObject({ code: '42501' });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});