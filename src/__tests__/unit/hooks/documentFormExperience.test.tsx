import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useForm } from 'react-hook-form';
import { useDocumentFormExperience } from '@/hooks/forms/useDocumentFormExperience';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-a' } }) }));
vi.mock('@/hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 'tenant-a' }) }));

describe('shared document form experience', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());
  it('restores header and line values only from the current user, tenant and document', () => {
    localStorage.setItem('draft_tenant-b:user-a:purchase_order_new', JSON.stringify({ data: { values: { notes: 'other tenant' }, lines: [] }, savedAt: Date.now() }));
    localStorage.setItem('draft_tenant-a:user-a:purchase_order_new', JSON.stringify({ data: { values: { notes: 'مراجعة الطلب' }, lines: [{ quantity: 3 }] }, savedAt: Date.now() }));
    const restoreLines = vi.fn();
    const { result } = renderHook(() => {
      const form = useForm({ defaultValues: { notes: '' } });
      return { form, experience: useDocumentFormExperience({ form, lines: [], restoreLines, documentKey: 'purchase_order_new', open: true, busy: false, submit: vi.fn(), close: vi.fn() }) };
    });
    expect(result.current.experience.hasDraft).toBe(true);
    act(() => result.current.experience.restore());
    expect(result.current.form.getValues('notes')).toBe('مراجعة الطلب');
    expect(restoreLines).toHaveBeenCalledWith([{ quantity: 3 }]);
    expect(result.current.form.formState.isDirty).toBe(true);
  });
  it('protects closing when only line items have changed', () => {
    const close = vi.fn();
    const { result } = renderHook(() => {
      const form = useForm({ defaultValues: { notes: '' } });
      return useDocumentFormExperience({ form, lines: [{ quantity: 2 }], restoreLines: vi.fn(), documentKey: 'purchase_order_new', open: true, busy: false, submit: vi.fn(), close, linesDirty: true });
    });
    act(() => result.current.onOpenChange(false));
    expect(close).not.toHaveBeenCalled();
    expect(result.current.confirmOpen).toBe(true);
    act(() => result.current.confirmLeave());
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('reveals the invalid wizard step without submitting', async () => {
    const submit = vi.fn();
    const onInvalid = vi.fn();
    const { result } = renderHook(() => {
      const form = useForm({ defaultValues: { supplier: '' }, resolver: async () => ({ values: {}, errors: { supplier: { type: 'required', message: 'المورد مطلوب' } } }) });
      return useDocumentFormExperience({ form, lines: [], restoreLines: vi.fn(), documentKey: 'purchase_order_new', open: true, busy: false, submit, close: vi.fn(), onInvalid });
    });
    await act(async () => { await result.current.save(); });
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
  });
});