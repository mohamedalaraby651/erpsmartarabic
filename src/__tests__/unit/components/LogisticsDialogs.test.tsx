import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoodsReceiptDialog, DeliveryNoteDialog, PurchaseInvoiceDialog } from '@/components/logistics/LogisticsDialogs';

vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [] }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-a' } }) }));
vi.mock('@/hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 'tenant-a' }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/useMutationToast', () => ({ useMutationToast: () => ({ onError: vi.fn() }) }));

describe('logistics document draft restoration', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());
  it.each([
    { Component: GoodsReceiptDialog, key: 'goods_receipt_new', values: { supplier_id: 's', warehouse_id: 'w', purchase_order_id: '', received_date: '2026-11-14', notes: 'استلام تجريبي' }, line: { product_id: 'p', received_qty: 7, unit_cost: 25, ordered_qty: 7 }, label: 'كمية مستلمة * 1', quantity: 7 },
    { Component: DeliveryNoteDialog, key: 'delivery_note_new', values: { customer_id: 'c', warehouse_id: 'w', delivery_date: '2026-11-14', notes: 'تسليم تجريبي' }, line: { product_id: 'p', delivered_qty: 3, ordered_qty: 3 }, label: 'كمية مسلّمة * 1', quantity: 3 },
    { Component: PurchaseInvoiceDialog, key: 'purchase_invoice_new', values: { supplier_id: 's', purchase_order_id: '', invoice_date: '2026-11-14', due_date: '', tax_amount: 0, discount_amount: 0, notes: 'شراء تجريبي' }, line: { product_id: 'p', quantity: 4, unit_price: 25 }, label: 'الكمية * 1', quantity: 4 },
  ])('restores $key without creating or posting a document', ({ Component, key, values, line, label, quantity }) => {
    localStorage.setItem(`draft_tenant-a:user-a:${key}`, JSON.stringify({ data: { values, lines: [line] }, savedAt: Date.now() }));
    const onSubmit = vi.fn();
    render(<Component open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    act(() => fireEvent.click(screen.getByRole('button', { name: 'استعادة المسودة' })));
    expect(screen.getByRole('spinbutton', { name: label })).toHaveValue(quantity);
    expect(screen.getByRole('textbox')).toHaveValue(values.notes);
    expect(onSubmit).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(5500));
    const saved = JSON.parse(localStorage.getItem(`draft_tenant-a:user-a:${key}`) || '{}');
    expect(saved.data.lines[0].product_id).toBe('p');
  });
});