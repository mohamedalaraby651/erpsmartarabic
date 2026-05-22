/**
 * Price List Repository — CRUD for price_lists + price_list_items.
 * Tenant injection happens via RLS / RPC; UI never touches supabase.from.
 */

import { supabase } from "@/integrations/supabase/client";
import { getCurrentTenantId } from "@/lib/tenantContext";
import { mapRepoError } from "./_base";

export interface PriceListRow {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface PriceListItemRow {
  id: string;
  price_list_id: string;
  product_id: string;
  price: number;
  min_quantity: number;
  discount_percentage: number;
  products?: { name: string; selling_price: number | null; sku: string | null } | null;
}

export interface PriceListInput {
  name: string;
  description?: string | null;
  is_default?: boolean;
}

export interface PriceListItemInput {
  price_list_id: string;
  product_id: string;
  price: number;
  min_quantity?: number;
  discount_percentage?: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const priceListRepository = {
  async list(): Promise<PriceListRow[]> {
    const { data, error } = await supabase
      .from("price_lists")
      .select("*")
      .order("is_default", { ascending: false })
      .order("name");
    if (error) throw mapRepoError(error, "تعذّر تحميل قوائم الأسعار.");
    return (data ?? []) as PriceListRow[];
  },

  async listProductsForPricing() {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, selling_price, sku")
      .eq("is_active", true)
      .order("name");
    if (error) throw mapRepoError(error, "تعذّر تحميل المنتجات.");
    return data ?? [];
  },

  async listItems(priceListId: string): Promise<PriceListItemRow[]> {
    const { data, error } = await supabase
      .from("price_list_items")
      .select("*, products(name, selling_price, sku)")
      .eq("price_list_id", priceListId)
      .order("created_at");
    if (error) throw mapRepoError(error, "تعذّر تحميل عناصر القائمة.");
    return (data ?? []) as unknown as PriceListItemRow[];
  },

  async create(input: PriceListInput): Promise<void> {
    const tenant_id = await getCurrentTenantId();
    const { error } = await supabase.from("price_lists").insert({
      name: input.name,
      description: input.description ?? null,
      is_default: input.is_default ?? false,
      tenant_id,
    });
    if (error) throw mapRepoError(error, "تعذّر إنشاء قائمة الأسعار.");
  },

  async update(id: string, input: PriceListInput): Promise<void> {
    const { error } = await supabase
      .from("price_lists")
      .update({
        name: input.name,
        description: input.description ?? null,
        is_default: input.is_default ?? false,
      })
      .eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر تحديث القائمة.");
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("price_lists").delete().eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر حذف القائمة.");
  },

  async addItem(input: PriceListItemInput): Promise<void> {
    const tenant_id = await getCurrentTenantId();
    const { error } = await supabase.from("price_list_items").insert({
      price_list_id: input.price_list_id,
      product_id: input.product_id,
      price: round2(Number(input.price) || 0),
      min_quantity: Math.max(1, Math.floor(Number(input.min_quantity ?? 1))),
      discount_percentage: round2(Number(input.discount_percentage ?? 0)),
      tenant_id,
    });
    if (error) throw mapRepoError(error, "تعذّر إضافة المنتج للقائمة (قد يكون مكرراً).");
  },

  async removeItem(id: string): Promise<void> {
    const { error } = await supabase.from("price_list_items").delete().eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر حذف العنصر.");
  },
};
