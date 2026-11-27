# Customer profile page /customers/:id — v19 design

Scope: the customer profile page only, matching the two approved v19 images (collapsed and expanded). Suppliers, lists, GitHub settings and existing business data stay untouched. Nothing gets deleted. Everything is built in one pass that reuses existing hooks and components.

## Checked current state
- `customers` has no `code` column or anything equivalent. It already has phone, email, governorate/city, credit_limit, tax_number, vip_level, customer_type, contact_person, payment_terms_days and current_balance.
- `invoices` has due_date and notes, but no warehouse column.
- No `customer_contacts` or `payment_promises` tables exist. No promise feature exists in the code.

## Page layout (RTL)
1. Top bar: a "طباعة الصفحة PDF" button.
2. Customer card. When collapsed it shows the initial, name, badges (نشط / VIP / النوع / عليه متأخرات), "عميل منذ…" and the buttons تسجيل دفعة, وعد سداد, فاتورة جديدة. "عرض التفاصيل" expands it to show the code, phone (call and WhatsApp), email, address, credit limit and tax number.
3. "ملخص نظرة" banner: amount owed, open invoice count, last payment and its date, oldest overdue days, and a "تذكيره بالسداد" button with a ready message.
4. Side column with these cards: الرصيد في لمحة (donut, plus credit use = outstanding dues ÷ credit limit), أعمار الديون, وعد السداد, أحدث المدفوعات, جهات الاتصال. The width options are ضيق, متوسط and عريض, with طي الكل, فتح الكل and إعادة ضبط. These choices are saved in the browser only.
5. Five tabs: كشف حساب, سجل النشاط, المشتريات (default), المدفوعات, مركز التحصيل.
6. المشتريات tab:
   - Search, status filter and a "last 3 months" chip.
   - Selecting rows shows a bulk bar with the remaining total.
   - Columns: number, type, date, items, total, remaining, status with paid %.
   - Expanding a row shows five sub-tabs: items, payments, returns, notes, attachments.
   - The expanded row also has a large "بيانات الفاتورة" box, a small "ملخص المبالغ" box (subtotal, VAT, total, paid, remaining) and its action bar.
7. Notes and attachments sections below the table.

All numbers are computed from real data. A field with no data shows "—".

## Additive database changes (one migration)
- `customers.code text` (nullable) with a unique index per company. Existing rows keep NULL and the page shows "—". No existing data is backfilled.
- `invoices.warehouse_id uuid` (nullable, references warehouses). Existing invoices show "—".
- New `customer_contacts` table: id, tenant_id, customer_id, name, role, phone, email, is_primary, created_at.
- New `payment_promises` table: id, tenant_id, customer_id, invoice_id (nullable), promised_date, amount, status (pending/kept/broken/cancelled), notes, created_by, created_at.
- Rules for both new tables:
  - Grants: authenticated and service_role only.
  - Row-level security: every read and write requires `tenant_id = get_current_tenant()` and membership in that company. Inserting or updating also requires the customer to belong to the same company.
  - Contacts and promises are never hard-deleted. A promise is cancelled through its status.

## Files
| File | Action |
|---|---|
| migration `customer_profile_v19_additive` | new |
| src/lib/repositories/customerProfileRepository.ts (contacts, promises, invoice expansion queries) | new |
| src/hooks/customers/useCustomerProfileV19.ts (wraps the existing useCustomerDetail and aging hook, plus contacts and promises) | new |
| src/lib/customers/profileMetrics.ts (credit use, overdue, summary sentence) + test | new |
| src/components/customers/profile/CustomerProfileCard.tsx | new |
| src/components/customers/profile/CustomerSummaryBanner.tsx | new |
| src/components/customers/profile/CustomerProfileSidebar.tsx (5 cards in one file) | new |
| src/components/customers/profile/PromiseDialog.tsx, ContactDialog.tsx | new |
| src/components/customers/profile/CustomerPurchasesTab.tsx + ExpandableInvoiceRow.tsx | new |
| src/components/customers/profile/CustomerProfilePrint.css (print styles) | new |
| src/pages/customers/CustomerDetailsPage.tsx | modify: assemble the layout, reuse StatementOfAccount, CustomerTabActivity, CustomerTabPayments, CustomerTabNotes, CustomerTabAttachments and the collection view |

The existing payment, invoice, notes and attachments dialogs are reused as they are.

## Print page to PDF
The button opens every collapsed section and calls `window.print()`. Print styles hide the app frame and buttons, keep the page RTL in the Cairo font, and avoid page breaks inside cards. The browser's "Save as PDF" produces the file. This adds no new dependency and no server job.

## Checks
- Unit tests for credit use, overdue days and the summary sentence.
- One signed-in browser pass on a QA customer: collapsed and expanded card, a row expansion, and the print preview.

## Credit estimate
About 8–14 credits: 1 for the migration, about 6–9 for the components, and 1–3 for the check and fixes.

## Risks
- A new code column starts empty, so customers show "—" until codes are entered. Generating codes automatically would change existing data and is not part of this plan.
- Invoices have no warehouse, so that field shows "—" for all existing invoices.
- The current tabs beyond these five (more than 12 today) disappear from this page. Their components stay in the code, unused.
- Big customers have many invoices. The 3-month default and per-row loading of items keep the database load low, and the database instance is small.
- Browser printing varies slightly between Chrome and mobile.
- The image shows a 14% VAT line. The page shows the tax stored on each invoice, not a fixed rate.
