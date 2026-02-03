
# 📋 خطة التحول المؤسسي الشاملة
## Enterprise Transformation Roadmap - Q1 to Q3

---

## 📊 ملخص الوضع الحالي (Current State Summary)

### ✅ Q1 - Foundation & Governance (100% Complete)

| العنصر | الحالة | التفاصيل |
|--------|--------|----------|
| Security Functions | ✅ 100% | `check_section_permission`, `check_financial_limit`, `log_activity` |
| Audit Triggers | ✅ 100% | 13 جدول مراقب |
| Edge Functions | ✅ 100% | 4 وظائف: validate-invoice, process-payment, approve-expense, stock-movement |
| RLS Policies | ✅ 100% | 52 جدول + 120 سياسة |
| secureOperations.ts | ✅ 100% | طبقة API موحدة |
| Edge Function Tests | ✅ 100% | 27 اختبار Deno |
| Frontend Integration | ✅ 100% | **8 من 8 forms متكاملة** |
| E2E Security Tests | ✅ 100% | security-journey.spec.ts |
| Documentation | ✅ 100% | Q1_SECURITY_DOCUMENTATION.md + Q1_COMPLETION_REPORT.md |

### ✅ Q1 Completion - All Tasks Done

```text
✅ Forms متكاملة مع Permission Verification:
├── ✅ QuotationFormDialog - permission + discount check
├── ✅ SalesOrderFormDialog - permission + discount check
├── ✅ PurchaseOrderFormDialog - permission check
├── ✅ CustomerFormDialog - permission + credit limit check
├── ✅ InvoiceFormDialog - Edge Function validation
├── ✅ PaymentFormDialog - Edge Function processing
├── ✅ StockMovementDialog - Edge Function validation
└── ✅ ExpenseFormDialog - Edge Function approval
```

---

## 🗓️ خارطة الطريق الكاملة

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Q1: Foundation & Governance                          │
│                           ✅ COMPLETE - 100%                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ ✅ تكامل 8/8 Forms مع secureOperations                                     │
│ ✅ E2E Security Tests (security-journey.spec.ts)                            │
│ ✅ Q1 Completion Report                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Q2: Enterprise Finance Core                           │
│                              🔜 NEXT                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ ▶ Double-Entry Accounting System                                            │
│ ▶ 2FA Authentication                                                        │
│ ▶ Invoice Approval Workflow                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Q3: Governance & Multi-Tenant                            │
│                             🔮 FUTURE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ ▶ Multi-Tenant Architecture (tenant_id)                                     │
│ ▶ Rate Limiting (Edge Level)                                                │
│ ▶ SoD (Segregation of Duties)                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# ✅ Q1: Foundation & Governance (COMPLETE)

## المهام المكتملة (Completed Tasks)

### المرحلة 1.1: تكامل Forms المتبقية
**المدة: 2 ساعة | الأولوية: P0**

#### 1.1.1 تحديث QuotationFormDialog

**الملف:** `src/components/quotations/QuotationFormDialog.tsx`

**التغييرات:**
- إضافة import لـ `verifyPermissionOnServer` و `verifyFinancialLimit` من `secureOperations.ts`
- التحقق من صلاحية `quotations.create` أو `quotations.edit` قبل الإرسال
- التحقق من حد الخصم للـ items (discount_percentage)

**الكود المقترح:**
```typescript
// قبل mutation
const canCreate = await verifyPermissionOnServer('quotations', 'create');
if (!canCreate) {
  toast({ title: "ليس لديك صلاحية لإنشاء عروض أسعار", variant: "destructive" });
  return;
}

// التحقق من حد الخصم لكل item
const maxDiscount = Math.max(...items.map(i => i.discount_percentage));
const discountAllowed = await verifyFinancialLimit('discount', maxDiscount);
if (!discountAllowed) {
  toast({ title: "نسبة الخصم تتجاوز الحد المسموح لك", variant: "destructive" });
  return;
}
```

#### 1.1.2 تحديث SalesOrderFormDialog

**الملف:** `src/components/sales-orders/SalesOrderFormDialog.tsx`

**التغييرات:**
- التحقق من صلاحية `sales_orders.create` أو `sales_orders.edit`
- التحقق من حد الخصم

#### 1.1.3 تحديث PurchaseOrderFormDialog

**الملف:** `src/components/purchase-orders/PurchaseOrderFormDialog.tsx`

**التغييرات:**
- التحقق من صلاحية `purchase_orders.create` أو `purchase_orders.edit`

#### 1.1.4 تحديث CustomerFormDialog

**الملف:** `src/components/customers/CustomerFormDialog.tsx`

**التغييرات:**
- التحقق من `check_financial_limit('credit', credit_limit)` عند تعيين حد ائتماني
- عرض تحذير إذا تجاوز المستخدم صلاحيته

### المرحلة 1.2: اختبارات E2E للأمان
**المدة: 1 ساعة | الأولوية: P1**

**ملف جديد:** `e2e/security-journey.spec.ts`

**السيناريوهات:**
1. مستخدم sales يحاول إنشاء فاتورة → نجاح (إذا لديه صلاحية)
2. مستخدم sales يحاول حذف فاتورة → رفض (admin only)
3. مستخدم يحاول تجاوز حده المالي → رفض
4. مستخدم accountant يحاول الموافقة على مصروفه → رفض (self-approval)

### المرحلة 1.3: توثيق وإغلاق Q1
**المدة: 30 دقيقة | الأولوية: P0**

**الملفات:**
- تحديث `docs/PROJECT_PROGRESS.md` إلى v1.1.0
- تحديث `docs/Q1_SECURITY_DOCUMENTATION.md`
- إنشاء `docs/Q1_COMPLETION_REPORT.md`

---

# 🟩 Q2: Enterprise Finance Core

## الهدف الاستراتيجي
**بناء نظام محاسبة مزدوج القيد + تعزيز المصادقة**

---

## المرحلة 2.1: Double-Entry Accounting System
**المدة: 8-10 ساعات | الأولوية: P0 - Critical**

### 2.1.1 تصميم قاعدة البيانات (ERD)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DOUBLE-ENTRY ACCOUNTING SCHEMA                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐        ┌──────────────────────┐
│   chart_of_accounts  │        │    fiscal_periods    │
├──────────────────────┤        ├──────────────────────┤
│ id (PK)              │        │ id (PK)              │
│ code (unique)        │        │ name                 │
│ name                 │        │ start_date           │
│ account_type         │◄───┐   │ end_date             │
│   (asset/liability/  │    │   │ is_closed            │
│    equity/revenue/   │    │   │ closed_at            │
│    expense)          │    │   │ closed_by            │
│ parent_id (FK→self)  │    │   └──────────────────────┘
│ is_active            │    │
│ normal_balance       │    │   ┌──────────────────────┐
│   (debit/credit)     │    │   │      journals        │
│ current_balance      │    │   ├──────────────────────┤
└──────────────────────┘    │   │ id (PK)              │
         ▲                  │   │ fiscal_period_id (FK)│──────►
         │                  │   │ journal_number       │
         │                  │   │ journal_date         │
         │                  │   │ description          │
         │                  │   │ is_posted            │
         │                  │   │ posted_at            │
         │                  │   │ created_by           │
         │                  │   │ source_type          │
         │                  │   │   (invoice/payment/  │
         │                  │   │    expense/manual)   │
         │                  │   │ source_id            │
         │                  │   └──────────────────────┘
         │                              │
         │                              │
         │                              ▼
         │                  ┌──────────────────────┐
         │                  │   journal_entries    │
         │                  ├──────────────────────┤
         └──────────────────│ account_id (FK)      │
                            │ journal_id (FK)      │
                            │ debit_amount         │
                            │ credit_amount        │
                            │ memo                 │
                            │ line_number          │
                            └──────────────────────┘
```

### 2.1.2 SQL Migration Script

**ملف:** `supabase/migrations/xxx_double_entry_accounting.sql`

```sql
-- 1. Chart of Accounts
CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
CREATE TYPE balance_type AS ENUM ('debit', 'credit');

CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_en TEXT,
  account_type account_type NOT NULL,
  parent_id UUID REFERENCES chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  normal_balance balance_type NOT NULL,
  current_balance DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Fiscal Periods
CREATE TABLE fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_period CHECK (end_date > start_date)
);

-- 3. Journals
CREATE TABLE journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_period_id UUID NOT NULL REFERENCES fiscal_periods(id),
  journal_number TEXT NOT NULL UNIQUE,
  journal_date DATE NOT NULL,
  description TEXT,
  is_posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  source_type TEXT, -- invoice, payment, expense, manual
  source_id UUID,
  total_debit DECIMAL(15,2) DEFAULT 0,
  total_credit DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Journal Entries
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  line_number INTEGER NOT NULL,
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  memo TEXT,
  CONSTRAINT valid_entry CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  )
);
```

### 2.1.3 RLS Policies للجداول المالية

```sql
-- chart_of_accounts: الجميع يرى، admin/accountant يدير
-- journals: صارم - accountant + admin فقط
-- journal_entries: مرتبط بـ journals
-- fiscal_periods: admin فقط يغلق
```

### 2.1.4 Edge Function: create-journal

**الغرض:** إنشاء قيد محاسبي مع التحقق من التوازن

**التحققات:**
1. ✅ الفترة المالية مفتوحة
2. ✅ مجموع الدين = مجموع الدائن
3. ✅ الحسابات موجودة ونشطة
4. ✅ صلاحية المستخدم

### 2.1.5 Auto-Posting من الفواتير والدفعات

عند إنشاء فاتورة:
```text
DR: Accounts Receivable (العميل)
CR: Sales Revenue
CR: VAT Payable (إن وجد)
```

عند تسجيل دفعة:
```text
DR: Cash/Bank
CR: Accounts Receivable
```

---

## المرحلة 2.2: Two-Factor Authentication (2FA)
**المدة: 4-5 ساعات | الأولوية: P1 - High**

### 2.2.1 استراتيجية التنفيذ

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            2FA FLOW                                         │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │   Login     │
                    │ (Email/Pass)│
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Check if    │
                    │ 2FA enabled │
                    └──────┬──────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
            ▼                             ▼
     ┌─────────────┐              ┌─────────────┐
     │ 2FA Enabled │              │2FA Disabled │
     │ → OTP Page  │              │ → Dashboard │
     └──────┬──────┘              └─────────────┘
            │
            ▼
     ┌─────────────┐
     │ Verify TOTP │
     │ (6 digits)  │
     └──────┬──────┘
            │
            ▼
     ┌─────────────┐
     │  Dashboard  │
     └─────────────┘
```

### 2.2.2 جدول قاعدة البيانات

```sql
CREATE TABLE user_2fa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  secret_key TEXT, -- encrypted TOTP secret
  backup_codes TEXT[], -- encrypted backup codes
  enabled_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: المستخدم يرى إعداداته فقط
```

### 2.2.3 المكونات المطلوبة

**ملفات جديدة:**
- `src/components/auth/TwoFactorSetup.tsx` - إعداد 2FA مع QR Code
- `src/components/auth/TwoFactorVerify.tsx` - صفحة إدخال OTP
- `src/hooks/useTwoFactor.ts` - Hook لإدارة 2FA
- `supabase/functions/verify-totp/index.ts` - Edge Function للتحقق

### 2.2.4 Edge Function: verify-totp

```typescript
// التحقق من TOTP باستخدام مكتبة otplib
// يُرجع JWT token جديد إذا نجح
```

---

## المرحلة 2.3: Invoice Approval Workflow
**المدة: 3-4 ساعات | الأولوية: P1 - High**

### 2.3.1 تصميم سير العمل

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INVOICE APPROVAL WORKFLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │   Draft     │ ← إنشاء بواسطة Sales
                    │  (مسودة)    │
                    └──────┬──────┘
                           │
                           ▼ Submit للموافقة
                    ┌─────────────┐
                    │  Pending    │ ← في انتظار موافقة
                    │ Approval    │   Accountant/Admin
                    └──────┬──────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
            ▼                             ▼
     ┌─────────────┐              ┌─────────────┐
     │  Approved   │              │  Rejected   │
     │  (معتمدة)   │              │  (مرفوضة)   │
     └──────┬──────┘              └─────────────┘
            │
            ▼ عند الدفع الكامل
     ┌─────────────┐
     │    Paid     │
     │  (مدفوعة)   │
     └─────────────┘
```

### 2.3.2 تعديلات قاعدة البيانات

```sql
-- إضافة أعمدة لجدول invoices
ALTER TABLE invoices 
ADD COLUMN approval_status TEXT DEFAULT 'draft', -- draft, pending, approved, rejected
ADD COLUMN submitted_at TIMESTAMPTZ,
ADD COLUMN approved_at TIMESTAMPTZ,
ADD COLUMN approved_by UUID REFERENCES auth.users(id),
ADD COLUMN rejection_reason TEXT;
```

### 2.3.3 Edge Function: approve-invoice

**مشابه لـ approve-expense:**
- التحقق من الدور (admin/accountant)
- منع الموافقة الذاتية
- تسجيل في activity_logs
- إنشاء القيد المحاسبي تلقائياً عند الموافقة

---

# 🟨 Q3: Governance & Multi-Tenant

## الهدف الاستراتيجي
**عزل البيانات + حوكمة تشغيلية صارمة**

---

## المرحلة 3.1: Multi-Tenant Architecture
**المدة: 10-12 ساعة | الأولوية: P0 - Critical**

### 3.1.1 استراتيجية العزل

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TENANT ISOLATION MODEL                              │
└─────────────────────────────────────────────────────────────────────────────┘

الخيار المختار: Row-Level Tenant Isolation
- كل جدول يحتوي على tenant_id
- RLS يفرض العزل تلقائياً
- أسهل في التنفيذ على Supabase

┌─────────────────────┐      ┌─────────────────────┐
│     Tenant A        │      │     Tenant B        │
├─────────────────────┤      ├─────────────────────┤
│ customers (A only)  │      │ customers (B only)  │
│ products (A only)   │      │ products (B only)   │
│ invoices (A only)   │      │ invoices (B only)   │
│ ...                 │      │ ...                 │
└─────────────────────┘      └─────────────────────┘
          ▲                            ▲
          │                            │
          └──────────┬─────────────────┘
                     │
              ┌──────┴──────┐
              │    RLS      │
              │ tenant_id = │
              │ get_tenant()│
              └─────────────┘
```

### 3.1.2 جدول Tenants

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- للـ subdomain
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ربط المستخدمين بالـ tenants
CREATE TABLE user_tenants (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  role TEXT NOT NULL, -- owner, admin, member
  PRIMARY KEY (user_id, tenant_id)
);
```

### 3.1.3 Helper Function

```sql
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id 
  FROM user_tenants 
  WHERE user_id = auth.uid()
  LIMIT 1
$$;
```

### 3.1.4 Migration Plan

1. إنشاء جداول tenants و user_tenants
2. إضافة tenant_id لكل الجداول الموجودة (52 جدول)
3. تحديث RLS policies لتشمل tenant check
4. إنشاء default tenant للبيانات الحالية

---

## المرحلة 3.2: Rate Limiting (Edge Level)
**المدة: 4-5 ساعات | الأولوية: P1 - High**

### 3.2.1 استراتيجية التنفيذ

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RATE LIMITING STRATEGY                              │
└─────────────────────────────────────────────────────────────────────────────┘

نوع Rate Limiting: Token Bucket مع PostgreSQL

┌─────────────────────┐
│   Edge Function     │
│  (كل request)       │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ Check Rate   │
    │ Limit Table  │
    └──────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
 Allowed       Blocked
 (200)         (429)
```

### 3.2.2 جدول Rate Limits

```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 1,
  UNIQUE(user_id, endpoint, window_start)
);

-- حدود افتراضية
CREATE TABLE rate_limit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  max_requests INTEGER NOT NULL, -- per window
  window_seconds INTEGER NOT NULL DEFAULT 60
);
```

### 3.2.3 Edge Function Middleware

```typescript
// في كل Edge Function
const isAllowed = await checkRateLimit(userId, 'invoice-create', 10, 60);
if (!isAllowed) {
  return new Response(
    JSON.stringify({ error: 'تم تجاوز الحد المسموح من الطلبات' }),
    { status: 429 }
  );
}
```

---

## المرحلة 3.3: Segregation of Duties (SoD)
**المدة: 5-6 ساعات | الأولوية: P1 - High**

### 3.3.1 مفهوم SoD

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SEGREGATION OF DUTIES                                  │
└─────────────────────────────────────────────────────────────────────────────┘

القاعدة: لا يجب أن يتحكم شخص واحد في كامل العملية

مثال - عملية الفاتورة:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Create    │ ≠  │   Approve   │ ≠  │   Payment   │
│  (Sales)    │    │(Accountant) │    │ (Cashier)   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 3.3.2 جدول SoD Rules

```sql
CREATE TABLE sod_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  action_1 TEXT NOT NULL, -- e.g., 'invoice.create'
  action_2 TEXT NOT NULL, -- e.g., 'invoice.approve'
  is_strict BOOLEAN DEFAULT true, -- إذا true، ممنوع مطلقاً
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- مثال: منع نفس الشخص من إنشاء واعتماد الفاتورة
INSERT INTO sod_rules (rule_name, action_1, action_2, description)
VALUES ('invoice_create_approve', 'invoice.create', 'invoice.approve', 
        'لا يمكن لنفس المستخدم إنشاء واعتماد الفاتورة');
```

### 3.3.3 SQL Function للتحقق

```sql
CREATE OR REPLACE FUNCTION check_sod_violation(
  _user_id UUID,
  _action TEXT,
  _entity_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- البحث عن قواعد SoD المتعلقة بهذا الإجراء
  -- التحقق من activity_logs إذا كان المستخدم قام بالإجراء المتعارض
  -- إرجاع true إذا هناك مخالفة
END;
$$;
```

---

## 📁 ملخص الملفات لكل مرحلة

### Q1 - إكمال (4-5 ملفات تعديل)

| الملف | التغيير |
|-------|---------|
| `src/components/quotations/QuotationFormDialog.tsx` | إضافة permission check |
| `src/components/sales-orders/SalesOrderFormDialog.tsx` | إضافة permission check |
| `src/components/purchase-orders/PurchaseOrderFormDialog.tsx` | إضافة permission check |
| `src/components/customers/CustomerFormDialog.tsx` | إضافة credit limit check |
| `e2e/security-journey.spec.ts` | جديد - اختبارات E2E |
| `docs/Q1_COMPLETION_REPORT.md` | جديد - تقرير الإغلاق |

### Q2 - Enterprise Finance (15+ ملف)

| الملف | الغرض |
|-------|-------|
| `supabase/migrations/xxx_double_entry.sql` | جداول المحاسبة |
| `supabase/functions/create-journal/index.ts` | إنشاء قيود |
| `supabase/functions/close-period/index.ts` | إغلاق الفترة |
| `supabase/functions/verify-totp/index.ts` | تحقق 2FA |
| `supabase/functions/approve-invoice/index.ts` | اعتماد فواتير |
| `src/pages/accounting/ChartOfAccounts.tsx` | شجرة الحسابات |
| `src/pages/accounting/JournalEntries.tsx` | القيود |
| `src/pages/accounting/FiscalPeriods.tsx` | الفترات |
| `src/components/auth/TwoFactorSetup.tsx` | إعداد 2FA |
| `src/components/auth/TwoFactorVerify.tsx` | تحقق 2FA |
| `src/hooks/useTwoFactor.ts` | Hook لـ 2FA |

### Q3 - Multi-Tenant (20+ ملف)

| الملف | الغرض |
|-------|-------|
| `supabase/migrations/xxx_multi_tenant.sql` | جداول Tenants |
| `supabase/migrations/xxx_add_tenant_id.sql` | إضافة tenant_id |
| `supabase/functions/rate-limit-check/index.ts` | Rate limiting |
| `src/contexts/TenantContext.tsx` | Tenant context |
| `src/hooks/useTenant.ts` | Hook للـ tenant |
| تحديث جميع RLS policies | إضافة tenant check |

---

## ✅ معايير القبول لكل مرحلة

### Q1 Completion Criteria

| المعيار | الهدف |
|---------|-------|
| جميع Forms بـ permission check | 8/8 forms |
| E2E Security Tests | 10+ scenarios |
| Documentation updated | ✅ |
| Supabase Linter | 0 errors |

### Q2 Completion Criteria

| المعيار | الهدف |
|---------|-------|
| chart_of_accounts table | ✅ Created |
| journals + journal_entries | ✅ Created |
| Auto-posting from invoices | ✅ Working |
| Period close prevention | ✅ Enforced |
| 2FA setup flow | ✅ Complete |
| Invoice approval workflow | ✅ Working |

### Q3 Completion Criteria

| المعيار | الهدف |
|---------|-------|
| tenant_id on all tables | 52 tables |
| Tenant RLS policies | 100% coverage |
| Rate limiting active | ✅ |
| SoD rules enforced | ✅ |
| Tenant isolation proof | ✅ Tested |

---

## ⚠️ المخاطر والافتراضات

### المخاطر

| الخطر | الاحتمال | التأثير | التخفيف |
|-------|---------|---------|---------|
| تعقيد Double-Entry | متوسط | عالي | توثيق مفصل + اختبارات |
| Performance مع tenant_id | منخفض | متوسط | Indexes + Materialized Views |
| 2FA adoption | متوسط | منخفض | اختياري في البداية |

### الافتراضات

1. **لا GAAP/IFRS compliance**: النظام المحاسبي أساسي
2. **TOTP فقط**: لا SMS 2FA (يحتاج خدمة خارجية)
3. **Single database**: لا database sharding في Q3
4. **Supabase limits**: العمل ضمن حدود الخطة الحالية

---

## ⏱️ الجدول الزمني المقدر

```text
Q1 Completion:     ~4 ساعات (يوم واحد)
Q2 Full:           ~20-25 ساعة (2-3 أسابيع)
Q3 Full:           ~25-30 ساعة (3-4 أسابيع)
─────────────────────────────────────────
Total:             ~55-60 ساعة عمل
```

---

## 🚀 الخطوة التالية المقترحة

**البدء بـ Q1 Completion:**
1. تحديث الـ 4 Forms المتبقية
2. إنشاء E2E security tests
3. تحديث التوثيق
4. إغلاق Q1 رسمياً

**هل تريد البدء؟**
