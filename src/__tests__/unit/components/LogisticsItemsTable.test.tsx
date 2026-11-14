import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LogisticsItemsTable from '@/components/logistics/LogisticsItemsTable';

vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [] }) }));

describe('controlled logistics line editing', () => {
  const columns = [{ key: 'received_qty', label: 'كمية مستلمة', type: 'number' as const }];
  it('reads restored quantities from its parent and clears them on reset', () => {
    const onChange = vi.fn();
    const { rerender } = render(<LogisticsItemsTable value={[]} onChange={onChange} columns={columns} />);
    rerender(<LogisticsItemsTable value={[{ product_id: 'product-a', received_qty: 7 }]} onChange={onChange} columns={columns} />);
    expect(screen.getByRole('spinbutton', { name: 'كمية مستلمة 1' })).toHaveValue(7);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'كمية مستلمة 1' }), { target: { value: '9' } });
    expect(onChange).toHaveBeenLastCalledWith([{ product_id: 'product-a', received_qty: 9 }]);
    rerender(<LogisticsItemsTable value={[]} onChange={onChange} columns={columns} />);
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });
  it('deletes only the chosen row from the current restored document', () => {
    const onChange = vi.fn();
    render(<LogisticsItemsTable value={[{ product_id: 'a', received_qty: 2 }, { product_id: 'b', received_qty: 3 }]} onChange={onChange} columns={columns} />);
    fireEvent.click(screen.getByRole('button', { name: 'حذف البند 1' }));
    expect(onChange).toHaveBeenCalledWith([{ product_id: 'b', received_qty: 3 }]);
  });
});