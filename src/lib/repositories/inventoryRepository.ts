/**
 * Inventory Repository — warehouses, product_stock, stock_movements.
 * Writes go through this layer so hooks can bind cache invalidation
 * uniformly. Sensitive stock mutations still happen via the
 * `stock-movement` edge function elsewhere.
 */
import { supabase } from "@/integrations/supabase/client";
import { mapRepoError } from "./_base";
import type { Database } from "@/integrations/supabase/types";

export type WarehouseRow = Database["public"]["Tables"]["warehouses"]["Row"];

export interface StockMovementFilters {
  warehouseId?: string;
  productId?: string;
  movementType?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface InventoryLevelFilters {
  warehouseId?: string;
  productId?: string;
  lowStockOnly?: boolean;
}

export const inventoryRepository = {
  // ----- Warehouses -----
  async listWarehouses(): Promise<WarehouseRow[]> {
    const { data, error } = await supabase
      .from("warehouses")
      .select("*")
      .order("name");
    if (error) throw mapRepoError(error, "تعذّر تحميل المستودعات.");
    return (data ?? []) as WarehouseRow[];
  },

  async getWarehouse(id: string): Promise<WarehouseRow> {
    const { data, error } = await supabase
      .from("warehouses")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw mapRepoError(error, "تعذّر تحميل المستودع.");
    return data as WarehouseRow;
  },

  async deleteWarehouse(id: string): Promise<void> {
    const { error } = await supabase.from("warehouses").delete().eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر حذف المستودع.");
  },

  // ----- Stock Movements -----
  async listStockMovements(filters: StockMovementFilters = {}) {
    let q = supabase
      .from("stock_movements")
      .select(
        "*, product:products(id, name), from_warehouse:warehouses!stock_movements_from_warehouse_id_fkey(id, name), to_warehouse:warehouses!stock_movements_to_warehouse_id_fkey(id, name)",
      )
      .order("created_at", { ascending: false });

    if (filters.warehouseId) {
      q = q.or(
        `from_warehouse_id.eq.${filters.warehouseId},to_warehouse_id.eq.${filters.warehouseId}`,
      );
    }
    if (filters.productId) q = q.eq("product_id", filters.productId);
    if (filters.movementType) q = q.eq("movement_type", filters.movementType as "adjustment" | "in" | "out" | "transfer");
    if (filters.fromDate) q = q.gte("created_at", filters.fromDate);
    if (filters.toDate) q = q.lte("created_at", filters.toDate);
    q = q.limit(filters.limit ?? 50);

    const { data, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل حركات المخزون.");
    return data ?? [];
  },

  // ----- Inventory Levels -----
  async listInventoryLevels(filters: InventoryLevelFilters = {}) {
    let q = supabase
      .from("product_stock")
      .select(
        "*, product:products(id, name, sku, min_stock, image_url), warehouse:warehouses(id, name), variant:product_variants(id, name)",
      )
      .order("updated_at", { ascending: false });

    if (filters.warehouseId) q = q.eq("warehouse_id", filters.warehouseId);
    if (filters.productId) q = q.eq("product_id", filters.productId);

    const { data, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل أرصدة المخزون.");
    let rows = (data ?? []) as Array<{
      product_id: string;
      quantity: number;
      product?: { min_stock?: number | null } | null;
    }>;
    if (filters.lowStockOnly) {
      rows = rows.filter(
        (r) =>
          r.product?.min_stock != null && r.quantity <= (r.product.min_stock ?? 0),
      );
    }
    return rows as unknown as Array<Record<string, unknown>>;
  },
};
