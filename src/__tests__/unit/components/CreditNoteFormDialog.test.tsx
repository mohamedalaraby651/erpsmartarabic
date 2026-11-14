import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreditNoteFormDialog from '@/components/credit-notes/CreditNoteFormDialog';

const mocks = vi.hoisted(() => ({ create: vi.fn(), refresh: vi.fn(), toast: vi.fn(), remaining: 2, items: [{ id: 'line', product_id: 'product', quantity: 10, unit_price: 50, total_price: 500, products: { name: 'صنف اختبار' } }] }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-a' } }) }));
vi.mock('@/hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 'tenant-a' }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [{ id: 'customer', name: 'عميل' }] }) }));
vi.mock('@/hooks/credit-notes', () => ({
  useInvoicesForCreditNote: () => ({ data: [{ id: 'invoice', invoice_number: 'INV', total_amount: 500 }], refetch: async () => ({ data: [{ id: 'invoice' }] }) }),
  useInvoiceItemsForCredit: () => ({ data: mocks.items, refetch: async () => ({ data: mocks.items }) }),
  useInvoiceItemReturnsSummary: () => ({ data: summary, refetch: async () => ({ data: { line: { confirmed: 8, draft: 0, remaining: mocks.remaining } } }) }),
  useCreateCreditNoteDraft: () => ({ mutateAsync: mocks.create, isPending: false }),
  useRefreshCreditNoteReferences: () => mocks.refresh,
}));
const summary = { line: { confirmed: 8, draft: 0, remaining: 2 } };

describe('credit note draft experience', () => {
  beforeEach(() => { localStorage.clear(); mocks.create.mockReset(); mocks.toast.mockReset(); mocks.refresh.mockResolvedValue([]); mocks.remaining = 2; });
  function renderDraft(quantity: number) {
    localStorage.setItem('draft_tenant-a:user-a:credit_note_new:all', JSON.stringify({ savedAt: Date.now(), data: { values: { customerId: 'customer', invoiceId: 'invoice', reason: 'استعادة' }, lines: [{ invoice_item_id: 'line', selected: true, requested_qty: quantity, unit_price: 1, returnable: 100 }] } }));
    render(<CreditNoteFormDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'استعادة المسودة' }));
  }
  it('restores intent but blocks quantity seven when only two currently remain', async () => {
    renderDraft(7);
    await waitFor(() => expect(screen.getByRole('spinbutton', { name: 'كمية إرجاع صنف اختبار' })).toHaveValue(7));
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(mocks.refresh).toHaveBeenCalledWith('customer', 'invoice');
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء إشعار إرجاع' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalled());
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('revalidates at submission and saves the invoice price, not the local price', async () => {
    renderDraft(2);
    await waitFor(() => expect(screen.getByRole('spinbutton', { name: 'كمية إرجاع صنف اختبار' })).toHaveValue(2));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'إنشاء إشعار إرجاع' })));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ totalAmount: 100, items: [{ invoice_item_id: 'line', product_id: 'product', quantity: 2, unit_price: 50 }] }));
  });
  it('blocks a concurrent return which reduces availability to one before saving', async () => {
    renderDraft(2);
    await waitFor(() => expect(screen.getByRole('spinbutton', { name: 'كمية إرجاع صنف اختبار' })).toHaveValue(2));
    mocks.remaining = 1;
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'إنشاء إشعار إرجاع' })));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalled();
  });
});