import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFormDraft, DRAFT_TTL_MS } from '@/hooks/useFormDraft';
import { useFormDialog } from '@/hooks/useFormDialog';
import { z } from 'zod';

describe('document draft retention', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());
  it('keeps drafts for seven days and discards them at expiry', () => {
    expect(DRAFT_TTL_MS).toBe(604800000);
    localStorage.setItem('draft_expired', JSON.stringify({ data: { amount: 25 }, savedAt: Date.now() - 604800000 }));
    const { result } = renderHook(() => useFormDraft({ key: 'expired', data: {}, autoSave: false }));
    expect(result.current.hasDraft).toBe(false);
    expect(localStorage.getItem('draft_expired')).toBeNull();
  });
  it('does not overwrite an unresolved previous draft', () => {
    localStorage.setItem('draft_existing', JSON.stringify({ data: { amount: 125 }, savedAt: Date.now() - 1000 }));
    const { result } = renderHook(() => useFormDraft({ key: 'existing', data: { amount: 0 } }));
    act(() => vi.advanceTimersByTime(10000));
    expect(JSON.parse(localStorage.getItem('draft_existing') || '{}').data.amount).toBe(125);
    expect(result.current.restoreDraft()).toEqual({ amount: 125 });
  });
  it('reads but does not save a pristine form', () => {
    renderHook(() => useFormDraft({ key: 'pristine', data: { amount: 0 }, autoSave: false }));
    act(() => vi.advanceTimersByTime(10000));
    expect(localStorage.getItem('draft_pristine')).toBeNull();
  });
});

describe('submission concurrency', () => {
  it('runs only one write when two save actions arrive together', async () => {
    let finish: (() => void) | undefined;
    const mutationFn = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useFormDialog({ schema: z.object({ name: z.string() }), entity: null, toValues: () => ({ name: 'قيد' }), toPayload: values => values, mutationFn }));
    let first: Promise<void> | undefined;
    let second: Promise<void> | undefined;
    await act(async () => {
      first = result.current.submit();
      second = result.current.submit();
      await Promise.resolve(); await Promise.resolve();
    });
    expect(mutationFn).toHaveBeenCalledTimes(1);
    await act(async () => { finish?.(); await first; await second; });
  });
});