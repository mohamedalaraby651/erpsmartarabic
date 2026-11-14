import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GoodsReceiptsPage from '@/pages/goods-receipts/GoodsReceiptsPage';
import DeliveryNotesPage from '@/pages/delivery-notes/DeliveryNotesPage';

const mocks = vi.hoisted(() => ({ post: vi.fn(), cancel: vi.fn(), navigate: vi.fn() }));
vi.mock('@/lib/router-compat', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('@/hooks/useTableLayout', () => ({ useTableLayout: () => ({}) }));
vi.mock('@/components/logistics/LogisticsDialogs', () => ({ GoodsReceiptDialog: () => null, DeliveryNoteDialog: () => null }));
const base = { id: 'doc', status: 'draft', suppliers: { name: 'مورد' }, customers: { name: 'عميل' }, warehouses: { name: 'مخزن' } };
vi.mock('@/hooks/logistics/useGoodsReceipts', () => ({
  useGoodsReceiptsList: () => ({ data: [{ ...base, receipt_number: 'GR-1', received_date: '2026-11-14' }] }),
  useCreateGoodsReceipt: () => ({}), usePostGoodsReceipt: () => ({ mutate: mocks.post }), useCancelGoodsReceipt: () => ({ mutate: mocks.cancel }),
}));
vi.mock('@/hooks/logistics/useDeliveryNotes', () => ({
  useDeliveryNotesList: () => ({ data: [{ ...base, delivery_number: 'DN-1', delivery_date: '2026-11-14' }] }),
  useCreateDeliveryNote: () => ({}), usePostDeliveryNote: () => ({ mutate: mocks.post }), useCancelDeliveryNote: () => ({ mutate: mocks.cancel }),
}));

describe.each([{ Component: GoodsReceiptsPage, command: 'ترحيل' }, { Component: DeliveryNotesPage, command: 'تسليم' }])('logistics confirmation $command', ({ Component, command }) => {
  beforeEach(() => { mocks.post.mockReset(); mocks.cancel.mockReset(); });
  it('never posts before explicit confirmation', () => {
    render(<Component />);
    fireEvent.click(screen.getByRole('button', { name: command, exact: true }));
    expect(mocks.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'رجوع', exact: true }));
    expect(mocks.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: command, exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد', exact: true }));
    expect(mocks.post).toHaveBeenCalledWith('doc', expect.objectContaining({ onSuccess: expect.any(Function) }));
  });
  it('allows optional cancellation reason but still requires confirmation', () => {
    render(<Component />);
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء', exact: true }));
    expect(mocks.cancel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد', exact: true }));
    expect(mocks.cancel).toHaveBeenCalledWith({ id: 'doc', reason: undefined }, expect.any(Object));
  });
});