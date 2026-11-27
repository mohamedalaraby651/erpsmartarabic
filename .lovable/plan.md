# Customers and suppliers: profiles, lists, duplicates

Arabic RTL throughout. No data deleted, and every database change only adds something.

## 1. Customer profile (/customers/:id)
- Keep all existing tabs.
- New **Purchases** tab: one table of every invoice and sales order (date, number, type, status, total). Each row expands to show its lines (product, quantity, unit price, discount, line total).
- **Payments** table: date, method, amount, linked invoice number.
- **Balance summary** card: total purchases, paid, remaining.
- New **preferred contact method** field (phone, WhatsApp, email, visit), shown in the edit form, the contact card and, optionally, the list.

## 2. Supplier profile (/suppliers/:id)
- **Purchases** table under purchase orders: date, number, status, total quantity, total. Each row expands to show its lines (product, quantity, unit cost, total).
- **Payments made**, plus a balance summary (total purchased, paid, remaining).
- **Requests** section: purchase orders still open or not yet received ("what we ordered from them").
- Contact card shows phone, email, address, governorate/city and the preferred contact method (new field, same choices as customers).
- **Address question mark:** no stored address contains "?", so the cause is still unconfirmed. Step one is to reproduce it on a real supplier. Likely causes are the header cutting the address mid-character (`slice(0,30)`) or a missing font for one character. Fix it in the display only.

## 3. Customers and suppliers lists (redesign)
- One shared table layout that fits 1280px with no horizontal clipping.
- Header: title, an "add" button and one compact summary line, replacing the current widget rows.
- Filter bar: search, type, status, governorate, balance from/to, VIP (customers only).
- Sortable columns: name, phone, governorate, balance, last activity, status, actions (view, edit, delete with a confirmation dialog).
- Bulk select (already exists for customers, reused), pagination, and the current card view kept on mobile.

## 4. Supplier duplicates (27 rows, 9 unique names)
- No deletion. Add a "possible duplicate" badge, matched on the same name after trimming spaces, upper/lowercase and Arabic letter variants, or the same phone.
- A **Review duplicates** screen for admins: groups side by side with their balances and documents.
- Optional, admin-confirmed **merge** in a later step: move documents and payments onto the kept supplier, recompute its balance, and mark the others as inactive and "merged into X" (nothing deleted, every action logged). I'll build it only if you approve it separately.

## Technical details
- Migration (only adds columns): `customers.preferred_contact_method text NULL` and `suppliers.preferred_contact_method text NULL`, with a check trigger allowing phone/whatsapp/email/visit; `suppliers.merged_into_id uuid NULL` and `suppliers.duplicate_group text NULL` (computed by a read-only view `supplier_duplicate_candidates`, security invoker, tenant-scoped). Grants and row access rules stay the same.
- Repositories/query hooks (following the existing layers): `customerPurchasesQuery` (invoices and sales_orders with their items), `supplierPurchasesQuery` (purchase_orders and purchase_order_items, purchase_invoices, supplier_payments).
- Files: `src/pages/customers/CustomerDetailsPage.tsx`, new `src/components/customers/tabs/CustomerTabPurchases.tsx`, `CustomerTabPayments.tsx`, `CustomerTabBasicInfo.tsx`, customer form; `src/pages/suppliers/SupplierDetailsPage.tsx`, new `src/components/suppliers/tabs/SupplierTabPurchases.tsx` and `SupplierTabRequests.tsx`, `SupplierProfileHeader.tsx`, `SupplierInfoTab.tsx`, `SupplierFormDialog.tsx`; lists via `CustomersPage.tsx`, `SuppliersPage.tsx`, `customerTableColumns.ts`, new supplier column contract on the shared WorkspaceTable, new `src/pages/suppliers/SupplierDuplicatesPage.tsx` and its route.
- Tests: preferred contact values, balance summary math (two decimals), duplicate-name normalization.

## Estimated credits
I can't measure this ahead of time. As a rough guide: profiles about 15–25, lists about 15–20, duplicate badges and review screen about 8–12, so roughly 40–60 in total. The optional merge would cost more.
