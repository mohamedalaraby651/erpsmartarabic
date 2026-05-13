import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import StatementOfAccount from '../StatementOfAccount';

// Capture rpc calls
const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
      }),
    }),
  },
}));

const sampleRow = {
  entry_date: '2026-05-01',
  entry_type: 'فاتورة',
  reference: 'INV-1',
  debit: 100,
  credit: 0,
  running_balance: 100,
  status: 'معتمد',
};

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

describe('StatementOfAccount — date range chips', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: [sampleRow], error: null });
  });

  it('initial query sends only customer id (الكل)', async () => {
    render(<StatementOfAccount customerName="عميل" customerId="cust-1" />);
    await waitFor(() => expect(rpcMock).toHaveBeenCalled());
    const [fn, params] = rpcMock.mock.calls[0];
    expect(fn).toBe('get_customer_statement');
    expect(params).toEqual({ _customer_id: 'cust-1' });
  });

  it.each([
    [7, 'آخر 7 أيام'],
    [30, 'آخر 30 يوم'],
    [90, 'آخر 90 يوم'],
  ])('chip %s sets _date_from to today-%s and omits _date_to', async (days, label) => {
    render(<StatementOfAccount customerName="عميل" customerId="cust-1" />);
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: label }));

    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(2));
    const [, params] = rpcMock.mock.calls[1];
    expect(params).toEqual({
      _customer_id: 'cust-1',
      _date_from: daysAgoIso(days),
    });
    expect(params).not.toHaveProperty('_date_to');
  });

  it('clicking "الكل" after a range clears both dates', async () => {
    render(<StatementOfAccount customerName="عميل" customerId="cust-1" />);
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'آخر 30 يوم' }));
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: 'الكل' }));
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(3));

    const [, params] = rpcMock.mock.calls[2];
    expect(params).toEqual({ _customer_id: 'cust-1' });
  });

  it('renders rows once data is available', async () => {
    render(<StatementOfAccount customerName="عميل" customerId="cust-1" />);
    const matches = await screen.findAllByText('INV-1');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('active chip reflects current selection', async () => {
    render(<StatementOfAccount customerName="عميل" customerId="cust-1" />);
    await waitFor(() => expect(rpcMock).toHaveBeenCalled());

    const all = screen.getByRole('button', { name: 'الكل' });
    expect(all.className).toMatch(/bg-primary/);

    fireEvent.click(screen.getByRole('button', { name: 'آخر 7 أيام' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'آخر 7 أيام' }).className).toMatch(/bg-primary/);
      expect(screen.getByRole('button', { name: 'الكل' }).className).not.toMatch(/bg-primary/);
    });
  });
});
