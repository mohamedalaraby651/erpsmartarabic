/**
 * Reference Repository — lightweight pickers used across forms / dialogs
 * (customers / warehouses / quick PO list). Keeps these tiny selects from
 * scattering `supabase.from(...)` calls all over the UI.
 */

import { supabase } from "@/integrations/supabase/client";
import { mapRepoError } from "./_base";

export const referenceRepository = {
  async listCustomersForSelect(limit = 500) {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name")
      .order("name")
      .limit(limit);
    if (error) throw mapRepoError(error, "تعذّر تحميل العملاء.");
    return data ?? [];
  },

  async listActiveWarehouses() {
    const { data, error } = await supabase
      .from("warehouses")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    if (error) throw mapRepoError(error, "تعذّر تحميل المستودعات.");
    return data ?? [];
  },

  async listRecentPurchaseOrders(limit = 200) {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("id, order_number")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw mapRepoError(error, "تعذّر تحميل أوامر الشراء.");
    return data ?? [];
  },

  async listSuppliersForSelect(limit = 500) {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name")
      .order("name")
      .limit(limit);
    if (error) throw mapRepoError(error, "تعذّر تحميل الموردين.");
    return data ?? [];
  },

  /** Safe view (PII-masked when applicable). */
  async listCustomersSafe(limit = 1000) {
    const { data, error } = await supabase
      .from("customers_safe")
      .select("*")
      .eq("is_active", true)
      .order("name")
      .limit(limit);
    if (error) throw mapRepoError(error, "تعذّر تحميل العملاء.");
    return data ?? [];
  },

  async listActiveProducts(limit = 1000) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("name")
      .limit(limit);
    if (error) throw mapRepoError(error, "تعذّر تحميل المنتجات.");
    return data ?? [];
  },
};
