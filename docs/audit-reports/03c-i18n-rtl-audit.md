# Localization & RTL Audit Report (03c)

## 1. Hardcoded English Text in JSX
Visible English text in components and pages that should be translated to Arabic for an Arabic-first ERP.

| File:Line | Code | Severity | Suggested Fix |
|-----------|------|----------|---------------|
| src/components/ui/pagination.tsx:52 | `<span>Previous</span>` | Medium | Translate to "السابق" |
| src/components/ui/pagination.tsx:59 | `<span>Next</span>` | Medium | Translate to "التالي" |
| src/pages/install/InstallPage.tsx:232 | `<span>Add to Home Screen</span>` | Medium | Translate to "إضافة إلى الشاشة الرئيسية" |
| src/components/accounting/AccountFormDialog.tsx:190 | `placeholder="Account name in English"` | Low | Translate to "اسم الحساب بالإنجليزية" |
| src/components/ui/carousel.tsx:189 | `<span className="sr-only">Previous slide</span>` | Low | Translate to "الشريحة السابقة" |
| src/components/ui/carousel.tsx:217 | `<span className="sr-only">Next slide</span>` | Low | Translate to "الشريحة التالية" |
| src/components/ui/sidebar.tsx:237 | `<span className="sr-only">Toggle Sidebar</span>` | Low | Translate to "تبديل القائمة الجانبية" |
| src/components/ui/breadcrumb.tsx:77 | `<span className="sr-only">More</span>` | Low | Translate to "المزيد" |
| src/components/export/ExportWithTemplateButton.tsx:279 | `<span className="text-xs">Excel</span>` | Low | Translate to "إكسل" |
| src/components/settings/ExportCenter/FormatPreferencesSection.tsx:103 | `<SelectItem value="en">English</SelectItem>` | Low | Translate to "الإنجليزية" |

## 2. Use of LTR-only CSS
Hardcoded LTR spacing and alignment classes that do not automatically swap in RTL mode.

| File:Line | Code | Severity | Suggested Fix |
|-----------|------|----------|---------------|
| src/pages/payments/PaymentsPage.tsx:326 | `className="text-left"` | High | Use `text-start` |
| src/pages/products/ProductsPage.tsx:100 | `className="text-left"` | High | Use `text-start` |
| src/components/ui/table.tsx:49 | `text-left align-middle` | High | Use `text-start` |
| src/pages/treasury/TreasuryPage.tsx:62 | `className="h-4 w-4 ml-2"` | Medium | Use `ms-2` |
| src/pages/payments/PaymentsPage.tsx:180 | `className="h-4 w-4 ml-2"` | Medium | Use `ms-2` |
| src/pages/payments/PaymentsPage.tsx:248 | `className="absolute right-3 ..."` | Medium | Use `inset-is-3` or `right-3 rtl:right-auto rtl:left-3` |
| src/pages/payments/PaymentsPage.tsx:253 | `className="pr-10"` | Medium | Use `pe-10` |
| src/pages/search/SearchPage.tsx:253 | `className="pr-12 pl-24 h-12 text-lg"` | Medium | Use `pe-12 ps-24` |
| src/pages/search/SearchPage.tsx:257 | `className="absolute left-3 ..."` | Medium | Use `inset-ie-3` or `left-3 rtl:left-auto rtl:right-3` |
| src/components/ui/sidebar.tsx:197 | `left-0 ... right-0` | Medium | Use `start-0 ... end-0` |

## 3. Date/Number Formatting Issues
Hardcoded locales or missing locales in formatting functions.

| File:Line | Code | Severity | Suggested Fix |
|-----------|------|----------|---------------|
| src/lib/statementPdfGenerator.ts:82 | `toLocaleString('en-US', ...)` | High | Use `ar-EG` or current locale |
| src/pages/treasury/TreasuryPage.tsx:78 | `totalBalance.toLocaleString()` | Medium | Explicitly use `ar-EG` for consistency |
| src/pages/expenses/ExpensesPage.tsx:216 | `(stats?.pending \|\| 0).toLocaleString()` | Medium | Explicitly use `ar-EG` |
| src/pages/suppliers/SupplierDetailsPage.tsx:135 | `e.debit.toLocaleString()` | Medium | Explicitly use `ar-EG` |
| src/pages/inventory/InventoryPage.tsx:93 | `totalQuantity.toLocaleString()` | Medium | Explicitly use `ar-EG` |
| src/pages/sales-orders/SalesOrderDetailsPage.tsx:77 | `totalAmount.toLocaleString()` | Medium | Explicitly use `ar-EG` |

## 4. Bidi Marker Injection without sanitizeSearch
Search logic that directly injects user input into queries without sanitizing for bidi markers or extra spaces.

| File:Line | Code | Severity | Suggested Fix |
|-----------|------|----------|---------------|
| src/pages/search/SearchPage.tsx:88 | `.or(\`name.ilike.%${query}%,...\`)` | High | Use `sanitizeSearch(query)` |
| src/pages/search/SearchPage.tsx:105 | `.or(\`name.ilike.%${query}%,...\`)` | High | Use `sanitizeSearch(query)` |
| src/pages/search/SearchPage.tsx:122 | `.ilike('invoice_number', \`%${query}%\`)` | High | Use `sanitizeSearch(query)` |
| src/pages/search/SearchPage.tsx:139 | `.ilike('quotation_number', \`%${query}%\`)` | High | Use `sanitizeSearch(query)` |
| src/pages/search/SearchPage.tsx:156 | `.or(\`name.ilike.%${query}%,...\`)` | High | Use `sanitizeSearch(query)` |

| src/components/mobile/FABMenu.tsx:283 | `className="... left-3 ..."` | High | Use `inset-is-3` or `start-3` |
| src/components/ui/calendar.tsx:25 | `nav_button_previous: "absolute left-1"` | Medium | Use `start-1` |
| src/components/customers/tabs/CustomerTabQuotations.tsx:76 | `className="text-muted-foreground mr-4 ..."` | Medium | Use `me-4` |
| src/components/customers/tabs/CustomerTabPayments.tsx:70 | `<Plus className="h-4 w-4 ml-2" />` | Medium | Use `ms-2` |
