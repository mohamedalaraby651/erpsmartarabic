/**
 * OPA-UX-001 — global mutation feedback contract.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { notifyMutationSuccess, notifyMutationError } from '@/lib/mutationFeedback';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Minimal stand-in for a react-query Mutation instance.
const mutationWith = (options: Record<string, unknown>) =>
  ({ options }) as never;

describe('mutationFeedback', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the declared success message', () => {
    notifyMutationSuccess(mutationWith({ meta: { successMessage: 'تم الحفظ' } }));
    expect(toast.success).toHaveBeenCalledWith('تم الحفظ');
  });

  it('stays quiet when no success message is declared', () => {
    notifyMutationSuccess(mutationWith({}));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('respects silentSuccess', () => {
    notifyMutationSuccess(mutationWith({ meta: { successMessage: 'x', silentSuccess: true } }));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows an error message for any failing mutation', () => {
    notifyMutationError(new Error('boom'), mutationWith({}));
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('does not double-report when the call site handles the error', () => {
    notifyMutationError(new Error('boom'), mutationWith({ onError: () => undefined }));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('respects silentError', () => {
    notifyMutationError(new Error('boom'), mutationWith({ meta: { silentError: true } }));
    expect(toast.error).not.toHaveBeenCalled();
  });
});
