/**
 * Inventory Domain Service Layer
 * Centralized inventory queries and logic.
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================
// Low Stock Products (unified query)
// ============================================

export interface LowStockProduct {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
}

/**
 * Fetch products whose total stock is at or below min_stock.
 * Replaces 3 duplicate implementations across the codebase.
 */
export async function getLowStockProducts(): Promise<LowStockProduct[]> {
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id, name, min_stock')
    .eq('is_active', true)
    .not('min_stock', 'is', null)
    .gt('min_stock', 0);

  if (pErr || !products) return [];

  const { data: stock, error: sErr } = await supabase
    .from('product_stock')
    .select('product_id, quantity');

  if (sErr) return [];

  const stockMap = new Map<string, number>();
  (stock || []).forEach((s) => {
    stockMap.set(s.product_id, (stockMap.get(s.product_id) || 0) + s.quantity);
  });

  return products
    .filter((p) => {
      const currentStock = stockMap.get(p.id) || 0;
      return currentStock <= (p.min_stock || 0);
    })
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      currentStock: stockMap.get(p.id) || 0,
      minStock: p.min_stock!,
    }));
}
