
# خطة تنفيذ شاملة — تطوير منظومة المحاسبة والـ GL إلى المستوى الاحترافي

> مبنية على التقرير في `accounting-architecture-audit.md` — مقسّمة إلى 8 مراحل قابلة للتنفيذ بشكل منفصل ومُختبر.
> كل مرحلة تنتهي باختبارات (Vitest + RLS + Integration) ومراجعة Linter قبل الانتقال للتالية.

---

## المرحلة 1 — تحصين الأمان الحرج (Security Hardening) [أولوية قصوى]

**الهدف:** سدّ ثغرات الـ INSERT المفتوحة وفرض إغلاق الفترات المالية.

1. Migration: إضافة `WITH CHECK` لجميع سياسات INSERT على:
   - `chart_of_accounts` → `check_section_permission(auth.uid(),'accounting','create')`
   - `journals` → نفس الشيء
   - `journal_entries` → نفس الشيء
   - `fiscal_periods` → نفس الشيء
2. إعادة كتابة سياسة INSERT على `document_posting_log` → السماح فقط للـ `service_role` و RPCs المُعرّفة بـ `SECURITY DEFINER` (REVOKE من `authenticated`).
3. Trigger جديد `enforce_fiscal_period_open()` على `journals` BEFORE INSERT/UPDATE → يرفض القيد إذا كانت `fiscal_period_id` مغلقة أو إذا `journal_date` خارج النطاق.
4. دمج Triggers المكررة: حذف `protect_posted_journal` / `protect_posted_journal_lines` والاكتفاء بـ `prevent_posted_*`.
5. اختبارات RLS سلبية جديدة في `src/__tests__/security/accounting-rls.test.ts`.

**معايير القبول:** Linter أخضر، 0 INSERT مفتوح، اختبار يمنع الترحيل في فترة مغلقة.

---

## المرحلة 2 — طبقة Repositories & Hooks للمحاسبة

**الهدف:** الالتزام بنمط المشروع (Repository-first).

1. `src/lib/repositories/journalRepository.ts` — list, get, create, post, reverse.
2. `src/lib/repositories/coaRepository.ts` — tree, flat, byCode, upsert.
3. `src/lib/repositories/fiscalPeriodRepository.ts` — list, open, close.
4. Hooks: `src/hooks/accounting/{useJournals,useChartOfAccounts,useFiscalPeriods,usePostingLog}.ts` مع React Query.
5. إعادة توصيل صفحات `JournalEntriesPage` / `ChartOfAccountsPage` / `PostingLogPage` لاستخدام الـ hooks بدلاً من استدعاءات `supabase` المباشرة.
6. اختبارات Unit لكل repository.

---

## المرحلة 3 — Auto-Posting Pipeline (تفعيل الترحيل التلقائي)

**الهدف:** ربط الـ Sales/Procurement بـ `createJournalFromEvent` فعلياً.

1. RPC جديد `post_document_atomic(p_event, p_source_type, p_source_id, p_context jsonb)` في PostgreSQL:
   - يحل `account_id` من `posting_account_map` (للفئة الخاصة بالـ tenant) ثم fallback إلى `chart_of_accounts.code`.
   - ينشئ `journals` + `journal_entries` داخل transaction واحدة.
   - يكتب صفّاً في `document_posting_log` بـ `status='posted'`.
   - يفرض idempotency: `UNIQUE(source_type, source_id, event)` على `document_posting_log`.
2. تعديل Edge Functions الحالية لتستدعي الـ RPC:
   - `approve-invoice` → بعد تغيير الحالة إلى `approved` → posting event `invoice.approved`.
   - `process-payment` → `payment.received`.
   - `approve-expense` → `expense.approved`.
   - Credit-notes Edge Function → `credit_note.approved` (موجود نظرياً، التحقق من التفعيل).
   - Supplier payments RPC → `supplier_payment.made`.
3. توسيع `posting.rules.ts` بـ:
   - `goods_receipt.posted` (DR Inventory / CR GR-IR Clearing).
   - `purchase_invoice.posted` (DR GR-IR Clearing / CR AP + Tax).
   - `inventory.adjustment` (DR/CR Inventory vs Adjustment a/c).
4. اختبارات Integration: فاتورة → دفعة → كريديت نوت → التأكد من توازن GL.

---

## المرحلة 4 — أبعاد التحليل (Cost Centers / Projects / Departments)

1. Migration: جداول جديدة
   - `cost_centers (id, code, name, tenant_id, is_active, parent_id)`.
   - `projects (id, code, name, tenant_id, start_date, end_date, status)`.
   - `departments (id, code, name, tenant_id)`.
2. إضافة أعمدة nullable على `journal_entries`:
   - `cost_center_id`, `project_id`, `department_id`.
3. Indexes: `(tenant_id, cost_center_id)` ، `(tenant_id, project_id)`.
4. تحديث `JournalFormDialog` بحقول اختيارية للأبعاد.
5. تحديث `posting.rules.ts` لتمرير الأبعاد من context الـ source document.
6. تقرير: P&L by Cost Center / Project.

---

## المرحلة 5 — Multi-Currency (متعدد العملات)

1. جداول جديدة:
   - `currencies (code PK, name, name_ar, symbol, decimals)`.
   - `exchange_rates (id, base_code, quote_code, rate, rate_date, tenant_id, source)`.
2. أعمدة جديدة على `journals` و `journal_entries`:
   - `currency_code` (default tenant functional currency).
   - `fx_rate`, `functional_debit`, `functional_credit`.
3. Trigger يحسب `functional_*` تلقائياً عند INSERT.
4. `currency_settings` على مستوى الـ tenant (Functional currency).
5. واجهة لإدارة أسعار الصرف يدوياً + Edge Function لاحقاً لجلبها من API خارجي.
6. تحديث Posting rules لتمرير العملة من المستند المصدر.

---

## المرحلة 6 — Tax & Bank Reconciliation

**Tax Detail:**
1. جدول `tax_rates (id, code, name, rate, jurisdiction, is_active, tenant_id)`.
2. جدول `tax_transactions (id, journal_entry_id, tax_rate_id, taxable_amount, tax_amount, direction)`.
3. تحديث Posting rules لكتابة سطر/سطور TAX_PAYABLE تفصيلية.
4. تقرير VAT Return جاهز للطباعة.

**Bank Reconciliation:**
5. ربط `bank_accounts.gl_account_id` → `chart_of_accounts(id)` FK.
6. جداول: `bank_statements`, `bank_statement_lines`, `bank_reconciliation_matches`.
7. شاشة مطابقة (drag-drop matching) في `src/pages/accounting/BankReconciliationPage.tsx`.
8. Trigger لتحديث `bank_accounts.current_balance` من journal_entries المرتبطة.

---

## المرحلة 7 — التقارير وإغلاق الفترات

1. Views/Materialized Views:
   - `v_trial_balance(tenant_id, period_id, account_id, opening, debit, credit, closing)`.
   - `v_profit_loss(tenant_id, period_id, account_type, amount)`.
   - `v_balance_sheet(tenant_id, as_of_date, account_type, balance)`.
   - `v_general_ledger(tenant_id, account_id, journal_id, date, debit, credit, running_balance)`.
2. `pg_cron` لإعادة بناء MVs يومياً + fallback مباشر للجدول (وفق memory: MV Resilience).
3. صفحات جديدة:
   - `src/pages/accounting/TrialBalancePage.tsx`
   - `src/pages/accounting/ProfitLossPage.tsx`
   - `src/pages/accounting/BalanceSheetPage.tsx`
   - `src/pages/accounting/GeneralLedgerPage.tsx`
4. تصدير PDF/Excel (إعادة استخدام Edge Function `export-*`).
5. RPC `close_fiscal_period(p_period_id)`:
   - يتأكد من توازن كل الـ journals.
   - ينشئ Closing Entry لترحيل P&L → Retained Earnings.
   - يقفل الفترة (`is_closed=true`).
6. RPC `seed_opening_balances(p_period_id, p_lines jsonb)` للـ onboarding.
7. واجهة `JournalReversalDialog` لاستخدام `journal_reversals` من الـ UI.

---

## المرحلة 8 — تحسينات UX وميزات متقدمة

1. `JournalFormDialog`:
   - مؤشر توازن live (Debit/Credit/Δ) كـ chip ملوّن.
   - زر "Balance Line" يضيف سطر مكمل تلقائياً.
   - Keyboard shortcuts (`Ctrl+B` للترحيل، `Ctrl+R` لإضافة سطر).
   - عرض الـ source document deep-link.
2. `ChartOfAccountsPage`:
   - Tree view مع روول-أب للأرصدة.
   - Drill-down من حساب → general ledger.
3. `PostingLogPage`:
   - فلاتر (نوع المستند، الحالة، النطاق الزمني).
   - Re-post action للمستندات الفاشلة.
4. **Journal Templates / Recurring**:
   - جدول `journal_templates` + `recurring_journals` + cron job يولّد القيود الدورية (إهلاك، استحقاقات).
5. **Numbering Policy**: خيار `gapless_numbering` على مستوى الـ tenant — يستخدم `advisory_lock` بدلاً من sequence لضمان عدم وجود فجوات.
6. Toast Mapping للـ Postgres `check_violation` ERRCODE لرسائل عربية مفهومة.
7. **اختبار E2E** كامل لدورة: بيع → فاتورة → ترحيل → دفع → كريديت → عكس → إقفال فترة.

---

## معايير الإنجاز العامة بعد كل مرحلة

- ✅ Vitest: جميع الاختبارات خضراء.
- ✅ Supabase Linter: لا تحذيرات جديدة.
- ✅ RLS: اختبارات سلبية تتحقق من العزل.
- ✅ TypeScript: 0 errors.
- ✅ تحديث `mem://` (memory) بالقرارات المعمارية الجديدة.
- ✅ تحديث `.lovable/plan.md` بحالة التقدم.

---

## الترتيب المُوصى به للتنفيذ

```text
[1] Security ──► [2] Repos/Hooks ──► [3] Auto-Posting ──┐
                                                         ├─► [7] Reports + Closing ──► [8] UX
[4] Dimensions ─► [5] Multi-Currency ─► [6] Tax + Bank ─┘
```

المرحلتان (1) و (3) هما الأكثر إلحاحاً (أمان + ربط فعلي للترحيل التلقائي). المراحل 4–6 مستقلة ويمكن العمل عليها بالتوازي بعد الانتهاء من 1+2.

---

## نطاق هذه الموافقة

عند الموافقة سأبدأ بـ **المرحلة 1 فقط** (Security Hardening) لأنها الأخطر والأقصر، ثم أعرض حالتها قبل البدء في المرحلة 2. هذا يضمن عدم تضخّم التغييرات في PR واحد ويحافظ على استقرار الـ test suite (1156/1156 حالياً).
