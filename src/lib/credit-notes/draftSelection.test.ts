import { describe, expect, it } from 'vitest';
import { readReturnSelection, reconcileReturnSelection } from './draftSelection';

describe('credit note local intent revalidation', () => {
  const item = { id: 'line', product_id: 'real-product', quantity: 10, unit_price: 50, products: { name: 'الصنف' } };
  it('uses current invoice price and product, never a local draft price or product', () => {
    const selection = readReturnSelection([{ invoice_item_id: 'line', selected: true, requested_qty: 7, unit_price: 1, product_id: 'forged', returnable: 100 }]);
    expect(reconcileReturnSelection([item], {}, selection)[0]).toMatchObject({ unit_price: 50, product_id: 'real-product', returnable: 10, requested_qty: 7 });
    expect(selection[0]).not.toHaveProperty('unit_price');
  });
  it('preserves a requested quantity above current availability for visible validation, not silent clamping', () => {
    expect(reconcileReturnSelection([item], { line: { confirmed: 8, draft: 0, remaining: 2 } }, [{ invoice_item_id: 'line', selected: true, requested_qty: 7 }])[0]).toMatchObject({ requested_qty: 7, returnable: 2, already_returned: 8 });
  });
  it('drops lines no longer belonging to the selected invoice', () => {
    expect(reconcileReturnSelection([], {}, [{ invoice_item_id: 'removed', selected: true, requested_qty: 2 }])).toEqual([]);
  });
  it('rejects malformed local quantities', () => {
    expect(readReturnSelection([{ invoice_item_id: 'line', selected: true, requested_qty: Infinity }])).toEqual([]);
  });
});