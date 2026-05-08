/**
 * Unified entity types extracted from the auto-generated Supabase types.
 * Use these in components/hooks instead of inline `Database['public']['Tables'][...]`
 * to keep imports short and refactors safe.
 *
 * NOTE: Do NOT edit src/integrations/supabase/types.ts — it is auto-generated.
 * If a new table is added, just re-export it here.
 */
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];

// Core CRM
export type Customer = T["customers"]["Row"];
export type CustomerInsert = T["customers"]["Insert"];
export type Supplier = T["suppliers"]["Row"];
export type SupplierInsert = T["suppliers"]["Insert"];

// Sales cycle
export type Quote = T["quotes"]["Row"];
export type QuoteItem = T["quote_items"]["Row"];
export type SalesOrder = T["sales_orders"]["Row"];
export type Invoice = T["invoices"]["Row"];
export type InvoiceItem = T["invoice_items"]["Row"];

// Purchase / logistics
export type PurchaseOrder = T["purchase_orders"]["Row"];
export type PurchaseInvoice = T["purchase_invoices"]["Row"];
export type GoodsReceipt = T["goods_receipts"]["Row"];
export type DeliveryNote = T["delivery_notes"]["Row"];

// Inventory
export type Product = T["products"]["Row"];
export type Warehouse = T["warehouses"]["Row"];

// Engagement
export type Reminder = T["customer_reminders"]["Row"];
