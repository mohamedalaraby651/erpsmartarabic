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

  it('rapid clicks 7 → 30 → 90: only the last range determines the rendered result', async () => {
    // Distinct dataset per range so we can assert which one "won"
    const datasets: Record<string, typeof sampleRow[]> = {
      none: [{ ...sampleRow, reference: 'ALL-ROW' }],
      [daysAgoIso(7)]: [{ ...sampleRow, reference: 'ROW-7' }],
      [daysAgoIso(30)]: [{ ...sampleRow, reference: 'ROW-30' }],
      [daysAgoIso(90)]: [{ ...sampleRow, reference: 'ROW-90' }],
    };

    // Slow down responses so earlier requests are still in-flight when we click again.
    // We resolve them in REVERSE order (slowest first) to simulate out-of-order network.
    const delays: Record<string, number> = {
      [daysAgoIso(7)]: 120,
      [daysAgoIso(30)]: 80,
      [daysAgoIso(90)]: 20,
      none: 0,
    };

    rpcMock.mockReset();
    rpcMock.mockImplementation((_fn: string, params: Record<string, unknown>) => {
      const key = (params._date_from as string) ?? 'none';
      const data = datasets[key] ?? [];
      const delay = delays[key] ?? 0;
      return new Promise((resolve) => {
        setTimeout(() => resolve({ data, error: null }), delay);
      });
    });

    render(<StatementOfAccount customerName="عميل" customerId="cust-1" />);
    // Wait for initial (الكل) request
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));

    // Rapid sequence — no awaits between clicks
    fireEvent.click(screen.getByRole('button', { name: 'آخر 7 أيام' }));
    fireEvent.click(screen.getByRole('button', { name: 'آخر 30 يوم' }));
    fireEvent.click(screen.getByRole('button', { name: 'آخر 90 يوم' }));

    // The LAST request's params must be 90-day window
    await waitFor(() => {
      const last = rpcMock.mock.calls[rpcMock.mock.calls.length - 1][1];
      expect(last).toEqual({ _customer_id: 'cust-1', _date_from: daysAgoIso(90) });
    });

    // Wait for all in-flight promises (including the slow 7-day one) to settle
    await new Promise((r) => setTimeout(r, 200));

    // Final UI must show ROW-90 only — never ROW-7 or ROW-30 or ALL-ROW
    expect(screen.getAllByText('ROW-90').length).toBeGreaterThan(0);
    expect(screen.queryByText('ROW-7')).not.toBeInTheDocument();
    expect(screen.queryByText('ROW-30')).not.toBeInTheDocument();
    expect(screen.queryByText('ALL-ROW')).not.toBeInTheDocument();

    // Active chip must be 90
    expect(screen.getByRole('button', { name: 'آخر 90 يوم' }).className).toMatch(/bg-primary/);
    expect(screen.getByRole('button', { name: 'آخر 7 أيام' }).className).not.toMatch(/bg-primary/);
    expect(screen.getByRole('button', { name: 'آخر 30 يوم' }).className).not.toMatch(/bg-primary/);
  });
});

