import { describe, it, expect } from 'vitest';
import { findBelowCostLines } from './belowCost';

const products = [{ id: 'a', cost_price: 100 }, { id: 'b', cost_price: null }];
const line = (o: Partial<{ product_id: string; unit_price: number; discount_percentage: number }>) =>
  ({ product_id: 'a', product_name: 'صنف', unit_price: 120, discount_percentage: 0, ...o });

describe('findBelowCostLines', () => {
  it('flags price below cost', () => expect(findBelowCostLines([line({ unit_price: 90 })], products)).toHaveLength(1));
  it('flags when discount pushes net below cost', () =>
    expect(findBelowCostLines([line({ unit_price: 120, discount_percentage: 20 })], products)[0].net_unit_price).toBe(96));
  it('does not flag price equal to cost', () => expect(findBelowCostLines([line({ unit_price: 100 })], products)).toHaveLength(0));
  it('ignores items with unknown cost', () => expect(findBelowCostLines([line({ product_id: 'b', unit_price: 1 })], products)).toHaveLength(0));
});
