# الخطة الشاملة: المحاور الثلاثة لإكمال ERP

> **الحالة الراهنة:** فحص أمني تلقائي كشف **166 ثغرة فعلية** (أكثر من 13 الموثقة في التقارير السابقة). 3 ثغرات منطقية حرجة في RLS تم تأكيدها. الجداول التالية **غير موجودة فعلياً**: `goods_receipts`, `delivery_notes`, `currencies`, `exchange_rates`, `tax_rates`. لا يوجد عمود `currency` أو `exchange_rate` في الفواتير.

---

## 🔴 المحور الأول: الأمان الشامل (P0 — أسبوع واحد)

### 1.1 ثغرات منطقية حرجة مؤكدة من الفحص

| # | الثغرة | الوصف الفني | الحل |
|---|--------|------------|------|
| 1 | **PRIVILEGE_ESCALATION_RISK** | `user_roles_insert_admin_tenant` يمنع تعيين `role='admin'` لكنه **لا يقيّد `custom_role_id`** — أي tenant admin يستطيع إنشاء custom role بصلاحيات admin كاملة وتعيينه | إضافة CHECK يرفض custom_role_id الذي يحتوي على صلاحيات admin-equivalent |
| 2 | **MISSING_TENANT_ISOLATION** | سياسة إنشاء notifications لا تتحقق من `tenant_id = get_current_tenant()` — يمكن إرسال إشعارات لمستخدمين في tenants أخرى | إضافة `WITH CHECK (tenant_id = get_current_tenant() AND user_id IN (SELECT id FROM profiles WHERE tenant_id = get_current_tenant()))` |
| 3 | **سياسات UPDATE معطلة فعلياً** | `customers_update_policy`, `quotations_update_policy`, `employees_update_policy`, `sales_orders_update_policy`, `suppliers_update_policy` تستدعي `check_section_permission(..., 'update')` لكن الدالة تتعامل مع `'edit'` فقط — السياسات الفرعية تفشل دائماً، والوصول يمر عبر السياسات الأخرى مما **يتجاوز فحص section permissions كلياً للتحديثات** | تصحيح string من `'update'` إلى `'edit'` في كل السياسات الخمس |

### 1.2 ثغرات SECURITY DEFINER (163 finding)

عشرات دوال `SECURITY DEFINER` قابلة للاستدعاء من `anon` و `authenticated` بدون تقييد. القائمة تشمل: `get_current_tenant`, `get_supplier_health_score`, `auto_assign_default_tenant`, وغيرها.

**الإجراء:**
- مراجعة كل دالة وتحديد: هل تحتاج فعلاً استدعاء من العميل؟
- للدوال الداخلية (triggers, helpers): `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon, authenticated`
- للدوال العامة المطلوبة (مثل `has_role`, `get_current_tenant`): إبقاؤها لكن مع التأكد من `STABLE` و `search_path = public`

### 1.3 حماية البيانات الحساسة (Field-Level)

| الجدول | الأعمدة الحساسة | الحل |
|--------|-----------------|------|
| `employees` | `national_id`, `bank_account`, `birth_date` | استخدام view `employees_safe` (موجود بالفعل) في كل الواجهات + إنشاء سياسة منفصلة تسمح بالحقول الكاملة لـ HR + الموظف نفسه فقط |
| `suppliers` | `iban`, `bank_account` | نفس النمط مع `suppliers_safe` (موجود) — تقييد للدور `accountant` فقط |
| `customers` | `phone`, `email` | إنشاء `customers_safe` view مع masking للأرقام (آخر 4 خانات) للأدوار الأقل |
| `bank_accounts` | كامل الجدول | تقييد على الدور `accountant` + `admin` فقط، إضافة 2FA challenge قبل العرض |
| `user_2fa_settings` | `secret` (TOTP) | تشفير at-rest باستخدام `pgcrypto` + `pgp_sym_encrypt` بمفتاح من Vault |

### 1.4 تشفير TOTP secrets

```text
ALTER TABLE user_2fa_settings ADD COLUMN secret_encrypted bytea;
-- migration: encrypt existing → drop plaintext column
-- Edge function verify-totp يفك التشفير وقت التحقق فقط
```

### 1.5 إخفاء error.message (10 ملفات)

استبدال مباشر في الملفات: `TwoFactorSetup.tsx`, `JournalFormDialog.tsx`, `JournalDetailDialog.tsx`, `AccountFormDialog.tsx`, `InvoiceApprovalDialog.tsx`, `ExpensesPage.tsx`, `Auth.tsx`, `secureOperations.ts` — استخدام `getSafeErrorMessage()` الموجود في `errorHandler.ts`.

### 1.6 تفعيل Leaked Password Protection
استخدام `configure_auth` لتفعيل `password_hibp_enabled: true`.

**نتيجة المحور الأول:** نظام يجتاز فحص Lovable Security Scanner بـ 0 ERROR و < 10 WARN.

---

## 🟠 المحور الثاني: إكمال الدورة المستندية (P0 — 3 أسابيع)

### 2.1 جداول جديدة كاملة

```text
goods_receipts (إيصالات استلام البضاعة)
├── id, receipt_number, tenant_id
├── purchase_order_id (FK → purchase_orders)
├── supplier_id, warehouse_id
├── received_date, received_by
├── status: draft|posted|cancelled
├── notes, attachments
└── created_at, updated_at

goods_receipt_items
├── id, receipt_id (FK → goods_receipts CASCADE)
├── purchase_order_item_id (FK)
├── product_id, ordered_qty, received_qty
├── unit_cost, total_cost
└── quality_status: accepted|rejected|partial

delivery_notes (إذونات تسليم)
├── id, delivery_number, tenant_id
├── sales_order_id (FK → sales_orders)
├── invoice_id (nullable — قد تُسلَّم قبل الفوترة)
├── customer_id, warehouse_id
├── delivery_date, delivered_by, received_by_name
├── status: draft|in_transit|delivered|returned
└── signature_url (PNG توقيع رقمي)

delivery_note_items
├── id, delivery_id, sales_order_item_id
├── product_id, ordered_qty, delivered_qty
└── condition: good|damaged
```

### 2.2 Three-Way Matching (Trigger DB)

```text
عند posting الفاتورة الواردة (Purchase Invoice):
  IF supplier_id موجود في purchase_orders:
    تحقق: invoice_qty ≤ goods_receipt_qty
    تحقق: invoice_unit_price ≈ po_unit_price (±5% tolerance)
    إذا فشل → رفع approval_required = true
```

### 2.3 Auto Journal Entries

ربط trigger على `payments`, `expenses`, `goods_receipts` ينشئ تلقائياً:
- Payment → Dr Cash / Cr Receivable (أو AP)
- Expense → Dr Expense Account / Cr Cash (أو AP)
- Goods Receipt → Dr Inventory / Cr GR/IR Clearing
- Purchase Invoice → Dr GR/IR Clearing / Cr AP

استخدام `posting.rules.ts` الموجود + توسيعه.

### 2.4 إكمال Credit Notes

ربط `credit_notes` بـ `invoice_items` عبر جدول وسيط `credit_note_items` يشير إلى `invoice_item_id` المرجعي + كمية الإرجاع.

### 2.5 تقارير محاسبية أساسية

- **Trial Balance** (ميزان المراجعة): تجميع من `journal_entries` لفترة محددة
- **P&L** (قائمة الدخل): تجميع حسابات الإيرادات والمصروفات
- **Balance Sheet** (الميزانية): الأصول/الخصوم/حقوق الملكية في تاريخ معين

كلها صفحات React تستخدم RPCs محسّنة مع indexes على `journal_entries(tenant_id, period, account_id)`.

### 2.6 صفحات وواجهات

| الصفحة | الملف |
|--------|------|
| قائمة إيصالات الاستلام | `src/pages/goods-receipts/GoodsReceiptsPage.tsx` |
| تفاصيل/إنشاء استلام | `src/pages/goods-receipts/GoodsReceiptFormDialog.tsx` |
| قائمة إذونات التسليم | `src/pages/delivery-notes/DeliveryNotesPage.tsx` |
| تفاصيل/إنشاء تسليم + توقيع | `src/pages/delivery-notes/DeliveryNoteFormDialog.tsx` |
| ميزان المراجعة | `src/pages/accounting/TrialBalancePage.tsx` |
| قائمة الدخل | `src/pages/accounting/ProfitLossPage.tsx` |
| الميزانية العمومية | `src/pages/accounting/BalanceSheetPage.tsx` |

**نتيجة المحور الثاني:** نظام يدعم دورة Purchase Order → GR → Invoice → Payment الكاملة + Sales Order → Delivery Note → Invoice → Payment + 3 تقارير محاسبية معيارية.

---

## 🟢 المحور الثالث: Multi-Currency (P1 — أسبوعان)

### 3.1 جداول جديدة

```text
currencies
├── code (PK, char(3)): 'EGP', 'SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR'
├── name_ar, name_en, symbol
├── decimal_places (2 افتراضي، 3 لـ KWD/BHD)
├── is_active boolean
└── seeded افتراضياً بـ 15 عملة

exchange_rates
├── id, tenant_id, from_currency, to_currency
├── rate numeric(18,8)
├── valid_from date, valid_to date (nullable)
├── source: manual|api|bank
└── UNIQUE(tenant_id, from_currency, to_currency, valid_from)

tenant_settings.base_currency (إضافة عمود)
├── default 'EGP'
└── العملة الأساسية للحسابات
```

### 3.2 تعديل الجداول المالية

إضافة الأعمدة التالية على: `invoices`, `quotations`, `sales_orders`, `purchase_orders`, `payments`, `expenses`, `credit_notes`:

```text
+ currency_code char(3) DEFAULT (SELECT base_currency FROM tenant_settings)
+ exchange_rate numeric(18,8) DEFAULT 1.0
+ base_amount numeric(18,2) GENERATED ALWAYS AS (total * exchange_rate) STORED
```

كل التقارير المالية تستخدم `base_amount` للتجميع (لتفادي خلط العملات).

### 3.3 RPC: `get_exchange_rate(from, to, date)`

ترجع السعر الساري في تاريخ معين. تُستخدم تلقائياً عند إنشاء أي مستند مالي بعملة غير الأساسية.

### 3.4 واجهات

- **CurrencySelector component** في كل forms المالية
- **ExchangeRatesPage** لإدارة الأسعار يدوياً
- **(اختياري لاحقاً)** Edge Function لجلب الأسعار من API مجاني (exchangerate.host) يومياً عبر pg_cron

### 3.5 Tax Rates (مع Multi-Currency لأنها مرتبطة)

```text
tax_rates
├── id, tenant_id, name_ar, name_en
├── rate numeric(5,2) — مثلاً 14.00 للضريبة المصرية
├── type: vat|withholding|stamp
├── is_default boolean
└── account_id (FK → chart_of_accounts للقيود التلقائية)
```

ربط `invoice_items.tax_rate_id` بدلاً من `tax_amount` المحسوب يدوياً.

**نتيجة المحور الثالث:** النظام يدعم 15 عملة + ضرائب متعددة + حساب تلقائي بالعملة الأساسية للتقارير. يفتح السوق الخليجي بأكمله.

---

## 📅 الجدول الزمني المقترح

```text
الأسبوع 1     │ المحور 1: الأمان (كل البنود 1.1 → 1.6)
الأسبوع 2-3   │ المحور 2 جزء أ: GR + DN + Three-Way Match + UI
الأسبوع 4     │ المحور 2 جزء ب: Auto Journal + Credit Notes + 3 تقارير
الأسبوع 5-6   │ المحور 3: Multi-Currency + Tax Rates + Exchange Rates
```

**إجمالي:** 6 أسابيع لتحويل النظام من "ERP بنسبة 80%" إلى "ERP enterprise قابل للبيع إقليمياً بثقة كاملة".

---

## 🎯 طريقة التنفيذ المقترحة

أقترح **التنفيذ التتابعي** لا التوازي، بهذا الترتيب الإلزامي:
1. **الأمان أولاً** — لأن أي ميزة تُبنى فوق RLS مكسور تضاعف المخاطر.
2. **ثم الدورة المستندية** — لأن Multi-Currency يعدّل نفس الجداول التي ستضاف بها أعمدة GR/DN.
3. **ثم Multi-Currency** — كطبقة أخيرة فوق نظام مكتمل.

عند الموافقة على هذه الخطة، سأبدأ فوراً بـ **المحور الأول (الأمان)** كأول منفذ تنفيذي، ثم نراجع معاً قبل الانتقال للمحور الثاني.
