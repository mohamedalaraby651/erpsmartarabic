import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuotationFormDialog from '@/components/quotations/QuotationFormDialog';
import type { QuotationItem } from '@/components/quotations/useQuotationItems';

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), invalidate: vi.fn(), error: vi.fn() }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [{ id: 'customer', name: 'Customer' }] }), useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
vi.mock('@/application/queries/quotations', () => ({ legacyQuotationsRepository: { create: mocks.create, updateWithItems: mocks.update } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-a' } }) }));
vi.mock('@/hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 'tenant-a' }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/useMutationToast', () => ({ useMutationToast: () => ({ onSuccess: vi.fn(), onError: mocks.error }) }));
vi.mock('@/lib/api/secureOperations', () => ({ verifyPermissionOnServer: async () => true, verifyFinancialLimit: async () => true }));
vi.mock('@/components/mobile/AdaptiveContainer', () => ({ AdaptiveContainer: ({ desktop }: { desktop: React.ReactNode }) => desktop }));
vi.mock('@/components/settings/ExportCenter/useLivePreviewProfile', () => ({ useLivePreviewProfile: () => ({ profile: {} }) }));
vi.mock('@/components/settings/ExportCenter/LivePreviewPanel', () => ({ LivePreviewPanel: () => null }));
vi.mock('@/components/print/QuotationPrintView', () => ({ QuotationPrintView: () => null }));
vi.mock('@/components/quotations/QuotationItemsTable', () => ({ QuotationItemsTable: ({ items, onUpdateItem }: { items: QuotationItem[]; onUpdateItem: (index: number, field: keyof QuotationItem, value: number) => void }) => <input aria-label="Quantity" type="number" value={items[0]?.quantity ?? 0} onChange={e => onUpdateItem(0, 'quantity', Number(e.target.value))} /> }));

const key = 'draft_tenant-a:user-a:quotation_new';
async function saveRestoredQuotation() {
  localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data: { values: { customer_id: 'customer', valid_until: '', notes: 'draft' }, lines: { items: [{ product_id: 'product', product_name: 'Product', quantity: 2, unit_price: 50, discount_percentage: 0, total_price: 100 }], discountAmount: 10, vatEnabled: true } } }));
  const close = vi.fn();
  const view = render(<QuotationFormDialog open onOpenChange={close} />);
  fireEvent.click(screen.getByRole('button', { name: 'استعادة المسودة' }));
  await act(async () => {
    fireEvent.submit(screen.getByRole('button', { name: 'إنشاء' }).closest('form') as HTMLFormElement);
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(mocks.error.mock.calls).toEqual([]);
  expect(mocks.create).toHaveBeenCalledTimes(1);
  return { close, view };
}

describe('quotation save checkpoint', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); mocks.create.mockReset().mockResolvedValue({ id: 'saved' }); });
  afterEach(() => vi.useRealTimers());
  it('closes after saving without a discard prompt or beforeunload guard', async () => {
    const { close } = await saveRestoredQuotation();
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(close).toHaveBeenCalledWith(false);
  });
  it('does not autosave an already saved quotation or offer it on reopening', async () => {
    const { view } = await saveRestoredQuotation();
    await act(async () => { vi.advanceTimersByTime(6000); });
    expect(localStorage.getItem(key)).toBeNull();
    view.unmount();
    render(<QuotationFormDialog open onOpenChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'استعادة المسودة' })).not.toBeInTheDocument();
  });
  it('guards and autosaves genuine edits after saving', async () => {
    const { close } = await saveRestoredQuotation();
    expect(screen.getByRole('button', { name: 'طباعة PDF' })).toBeEnabled();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantity' }), { target: { value: '3' } });
    expect(screen.getByRole('button', { name: 'طباعة PDF' })).toBeDisabled();
    await act(async () => { vi.advanceTimersByTime(6000); });
    expect(JSON.parse(localStorage.getItem(key) ?? '{}').data.lines.items[0].quantity).toBe(3);
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(close).not.toHaveBeenCalled();
  });
});