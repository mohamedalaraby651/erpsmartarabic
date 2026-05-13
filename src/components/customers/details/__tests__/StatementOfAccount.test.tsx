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

  // ─── Stress: extreme/uneven response timings ────────────────────────────────
  // Helper: builds an rpc mock that returns distinct rows per range with custom delays
  function buildTimedRpc(delays: Record<string, number>) {
    const datasets: Record<string, typeof sampleRow[]> = {
      none: [{ ...sampleRow, reference: 'ALL-ROW' }],
      [daysAgoIso(7)]: [{ ...sampleRow, reference: 'ROW-7' }],
      [daysAgoIso(30)]: [{ ...sampleRow, reference: 'ROW-30' }],
      [daysAgoIso(90)]: [{ ...sampleRow, reference: 'ROW-90' }],
    };
    rpcMock.mockReset();
    rpcMock.mockImplementation((_fn: string, params: Record<string, unknown>) => {
      const key = (params._date_from as string) ?? 'none';
      const delay = delays[key] ?? 0;
      return new Promise((resolve) => {
        setTimeout(() => resolve({ data: datasets[key] ?? [], error: null }), delay);
      });
    });
  }

  async function expectFinalRow(expected: string, others: string[]) {
    await waitFor(
      () => {
        expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );
    // Drain any remaining late responses
    await new Promise((r) => setTimeout(r, 400));
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
    for (const o of others) {
      expect(screen.queryByText(o)).not.toBeInTheDocument();
    }
  }

  it('all responses 0ms (synchronous-like): last click still wins', async () => {
    buildTimedRpc({ none: 0, [daysAgoIso(7)]: 0, [daysAgoIso(30)]: 0, [daysAgoIso(90)]: 0 });

    render(<StatementOfAccount customerName="عميل" customerId="cust-1" />);
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'آخر 7 أيام' }));
    fireEvent.click(screen.getByRole('button', { name: 'آخر 30 يوم' }));
    fireEvent.click(screen.getByRole('button', { name: 'آخر 90 يوم' }));

    await expectFinalRow('ROW-90', ['ROW-7', 'ROW-30', 'ALL-ROW']);
  });

  it('extreme inversion: 7=300ms, 30=200ms, 90=0ms — slowest is the oldest, must NOT overwrite', async () => {
    buildTimedRpc({
      none: 0,
      [daysAgoIso(7)]: 300, // first click, slowest — arrives LAST
      [daysAgoIso(30)]: 200,
      [daysAgoIso(90)]: 0, // last click, fastest — arrives FIRST
    });

    render(<StatementOfAccount customerName="عميل" customerId="cust-1" />);
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'آخر 7 أيام' }));
    fireEvent.click(screen.getByRole('button', { name: 'آخر 30 يوم' }));
    fireEvent.click(screen.getByRole('button', { name: 'آخر 90 يوم' }));

    // ROW-90 must be visible immediately, and must SURVIVE the late ROW-7/ROW-30 arrivals
    await expectFinalRow('ROW-90', ['ROW-7', 'ROW-30', 'ALL-ROW']);
    expect(screen.getByRole('button', { name: 'آخر 90 يوم' }).className).toMatch(/bg-primary/);
  });

  it('mixed 0ms / 300ms with toggling back to "الكل": final state is "الكل"', async () => {
    buildTimedRpc({
      none: 300, // toggling back to "الكل" — slowest of all
      [daysAgoIso(7)]: 0,
      [daysAgoIso(30)]: 0,
      [daysAgoIso(90)]: 0,
    });

    render(<StatementOfAccount customerName="عميل" customerId="cust-1" />);
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'آخر 7 أيام' }));
    fireEvent.click(screen.getByRole('button', { name: 'آخر 30 يوم' }));
    fireEvent.click(screen.getByRole('button', { name: 'آخر 90 يوم' }));
    fireEvent.click(screen.getByRole('button', { name: 'الكل' }));

    await expectFinalRow('ALL-ROW', ['ROW-7', 'ROW-30', 'ROW-90']);
    expect(screen.getByRole('button', { name: 'الكل' }).className).toMatch(/bg-primary/);

    // Note: toggling back to "الكل" reuses the cached initial query (same queryKey),
    // so React Query may NOT issue a new RPC — UI correctness is what matters.

  });

  it('burst of 6 rapid clicks alternating ranges: only the very last range renders', async () => {
    buildTimedRpc({
      none: 0,
      [daysAgoIso(7)]: 250,
      [daysAgoIso(30)]: 50,
      [daysAgoIso(90)]: 150,
    });

    render(<StatementOfAccount customerName="عميل" customerId="cust-1" />);
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));

    const b7 = () => screen.getByRole('button', { name: 'آخر 7 أيام' });
    const b30 = () => screen.getByRole('button', { name: 'آخر 30 يوم' });
    const b90 = () => screen.getByRole('button', { name: 'آخر 90 يوم' });

    fireEvent.click(b7());
    fireEvent.click(b30());
    fireEvent.click(b90());
    fireEvent.click(b7());
    fireEvent.click(b30());
    fireEvent.click(b7()); // ← winner

    await expectFinalRow('ROW-7', ['ROW-30', 'ROW-90', 'ALL-ROW']);
    expect(b7().className).toMatch(/bg-primary/);
  });
});

