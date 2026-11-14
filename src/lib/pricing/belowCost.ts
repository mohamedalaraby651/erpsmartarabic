/** Decision 356: detect invoice lines sold below the item's recorded cost (after line discount). */
export interface BelowCostLine { product_id: string; product_name: string; net_unit_price: number; cost_price: number }

export function findBelowCostLines(
  items: { product_id: string; product_name: string; unit_price: number; discount_percentage: number }[],
  products: { id: string; cost_price: number | null }[],
): BelowCostLine[] {
  const costs = new Map(products.map((p) => [p.id, Number(p.cost_price) || 0]));
  const out: BelowCostLine[] = [];
  for (const it of items) {
    const cost = costs.get(it.product_id) ?? 0;
    if (!it.product_id || cost <= 0) continue; // unknown cost or zero-priced samples are not flagged
    const net = Math.round(it.unit_price * (1 - (it.discount_percentage || 0) / 100) * 100) / 100;
    if (net < cost) out.push({ product_id: it.product_id, product_name: it.product_name, net_unit_price: net, cost_price: cost });
  }
  return out;
}
