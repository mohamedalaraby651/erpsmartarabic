import { z } from 'zod';

/** A local draft remembers intent, never product identity, price or availability. */
const selectionSchema = z.array(z.object({
  invoice_item_id: z.string(), selected: z.boolean(), requested_qty: z.number().finite(),
}));
export type ReturnSelection = z.infer<typeof selectionSchema>[number];
export function readReturnSelection(value: unknown): ReturnSelection[] {
  const result = selectionSchema.safeParse(value);
  return result.success ? result.data : [];
}

export interface FreshInvoiceItem {
  id: string; product_id: string; quantity: number; unit_price: number;
  products?: { name: string; sku?: string | null } | null;
}
export interface ReturnSummary { confirmed: number; draft: number; remaining: number }

export function reconcileReturnSelection(items: FreshInvoiceItem[], summary: Record<string, ReturnSummary>, selection: ReturnSelection[]) {
  const choices = new Map(selection.map(choice => [choice.invoice_item_id, choice]));
  return items.map(item => {
    const current = summary[item.id];
    const confirmed = current?.confirmed ?? 0;
    const available = current?.remaining ?? Math.max(0, Number(item.quantity) - confirmed);
    const choice = choices.get(item.id);
    return {
      invoice_item_id: item.id, product_id: item.product_id,
      product_name: item.products?.name ?? '—', product_sku: item.products?.sku ?? undefined,
      unit_price: Number(item.unit_price), original_qty: Number(item.quantity),
      already_returned: confirmed, draft_reserved: current?.draft ?? 0,
      returnable: available, selected: choice?.selected ?? false,
      requested_qty: choice?.requested_qty ?? available,
    };
  });
}