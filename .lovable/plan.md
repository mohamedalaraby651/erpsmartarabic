# 🏗️ خطة التحول المؤسسي - Q1: Foundation & Governance
## Enterprise Transformation Plan - Supabase Hardening

---

## ✅ Q1 مكتمل بالكامل! (100%)

### ملخص الإنجازات

| المرحلة | الحالة | التفاصيل |
|---------|--------|----------|
| 1. Security Functions | ✅ | `check_section_permission`, `check_financial_limit`, `log_activity` |
| 2. Audit Triggers | ✅ | 13 جدول مراقب |
| 3. Edge Functions | ✅ | 4 وظائف (validate-invoice, process-payment, approve-expense, stock-movement) |
| 4. Frontend Security | ✅ | secureOperations.ts + usePermissions server verification |
| 5. RLS Policies Update | ✅ | 24 جدول محدث |
| 6. Documentation | ✅ | `docs/Q1_SECURITY_DOCUMENTATION.md` |

### 📋 ملفات التوثيق
- `docs/Q1_SECURITY_DOCUMENTATION.md` - RLS Matrix + Security Functions + Edge Functions

---

## 🔜 الخطوات القادمة (Q2)

### المرحلة القادمة: Enterprise Finance Core
- [ ] chart_of_accounts
- [ ] journals + journal_entries
- [ ] fiscal_periods
- [ ] Double-Entry Accounting
- [ ] Period Close enforcement

---

## ✅ التقدم المفصل (للمرجعية)

### ✅ المرحلة 1: Security Functions (مكتمل 100%)

| العنصر | الحالة | ملاحظات |
|--------|--------|---------|
| `check_section_permission()` | ✅ مكتمل | فحص صلاحيات من custom roles |
| `check_financial_limit()` | ✅ مكتمل | فحص الحدود المالية |
| `log_activity()` | ✅ مكتمل | تسجيل تلقائي للنشاطات |
| Security Views | ✅ مكتمل | security_dashboard + suspicious_activities |

### ✅ المرحلة 2: Audit Triggers (مكتمل 100%)

| الجدول | الحالة |
|--------|--------|
| invoices | ✅ |
| payments | ✅ |
| customers | ✅ |
| products | ✅ |
| purchase_orders | ✅ |
| expenses | ✅ |
| cash_transactions | ✅ |
| stock_movements | ✅ |
| user_roles | ✅ |
| quotations | ✅ |
| sales_orders | ✅ |
| suppliers | ✅ |
| employees | ✅ |

### ✅ المرحلة 3: Edge Functions (مكتمل 100%)

| Function | الحالة | الوصف |
|----------|--------|-------|
| `validate-invoice` | ✅ منشور | تحقق من الفواتير |
| `process-payment` | ✅ منشور | معالجة الدفعات |
| `approve-expense` | ✅ منشور | الموافقة على المصروفات |
| `stock-movement` | ✅ منشور | حركات المخزون |

### ✅ المرحلة 4: Frontend Security Layer (مكتمل 100%)

| ملف | الحالة |
|-----|--------|
| `src/lib/api/secureOperations.ts` | ✅ مكتمل |
| `src/hooks/usePermissions.ts` | ✅ محدث (server-side verification) |

### ✅ المرحلة 5: تحديث RLS Policies (مكتمل 100%)

| الجدول | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| invoices | ✅ check_section_permission | ✅ + check_financial_limit | ✅ + check_financial_limit | admin only |
| invoice_items | ✅ | ✅ | ✅ | admin only |
| payments | ✅ | ✅ | ✅ | admin only |
| quotations | ✅ | ✅ | ✅ | ✅ |
| quotation_items | ✅ | ✅ | ✅ | ✅ |
| sales_orders | ✅ | ✅ | ✅ | ✅ |
| sales_order_items | ✅ | ✅ | ✅ | ✅ |
| customers | ✅ | ✅ + check_financial_limit | ✅ + check_financial_limit | ✅ |
| customer_addresses | ✅ | ✅ | ✅ | ✅ |
| customer_categories | ✅ | admin | admin | admin |
| products | ✅ | ✅ | ✅ | ✅ |
| product_categories | ✅ | admin/warehouse | admin/warehouse | admin/warehouse |
| product_stock | ✅ | ✅ | ✅ | admin only |
| stock_movements | ✅ | ✅ | admin only | admin only |
| suppliers | ✅ | ✅ | ✅ | ✅ |
| supplier_notes | ✅ | ✅ | - | ✅ |
| purchase_orders | ✅ | ✅ | ✅ | ✅ |
| expenses | ✅ + own | authenticated | admin/accountant | admin only |
| expense_categories | all | admin/accountant | admin/accountant | admin/accountant |
| cash_registers | ✅ | admin/accountant | admin/accountant | admin/accountant |
| cash_transactions | ✅ | ✅ | admin only | admin only |
| bank_accounts | admin/accountant | admin/accountant | admin/accountant | admin/accountant |
| employees | ✅ + own | ✅ | ✅ | admin only |
| tasks | own/assigned | authenticated | own/assigned | own/admin |

---

## 📊 ملخص التقدم

| المرحلة | الحالة | النسبة |
|---------|--------|--------|
| Security Functions | ✅ مكتمل | 100% |
| Audit Triggers | ✅ مكتمل | 100% |
| Edge Functions | ✅ مكتمل | 100% |
| Frontend Security Layer | ✅ مكتمل | 100% |
| RLS Policies Update | ✅ مكتمل | 100% |
| **إجمالي Q1 Phase 1 + 2** | ✅ **مكتمل** | **100%** |

---

## 📋 خطة التنفيذ المفصلة (للمرجعية)

```sql
-- وظيفة فحص permission من role_section_permissions
CREATE OR REPLACE FUNCTION public.check_section_permission(
    _user_id UUID,
    _section TEXT,
    _action TEXT -- 'view' | 'create' | 'edit' | 'delete'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _role app_role;
    _custom_role_id UUID;
    _has_permission BOOLEAN := false;
BEGIN
    -- Admin has all permissions
    IF has_role(_user_id, 'admin') THEN
        RETURN true;
    END IF;
    
    -- Get user's custom role
    SELECT custom_role_id INTO _custom_role_id
    FROM user_roles
    WHERE user_id = _user_id
    LIMIT 1;
    
    IF _custom_role_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check section permission
    SELECT 
        CASE _action
            WHEN 'view' THEN can_view
            WHEN 'create' THEN can_create
            WHEN 'edit' THEN can_edit
            WHEN 'delete' THEN can_delete
            ELSE false
        END INTO _has_permission
    FROM role_section_permissions
    WHERE role_id = _custom_role_id 
    AND section = _section;
    
    RETURN COALESCE(_has_permission, false);
END;
$$;
```

```sql
-- وظيفة فحص الحد المالي
CREATE OR REPLACE FUNCTION public.check_financial_limit(
    _user_id UUID,
    _limit_type TEXT, -- 'discount' | 'credit' | 'invoice'
    _value DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _custom_role_id UUID;
    _max_value DECIMAL;
BEGIN
    -- Admin has no limits
    IF has_role(_user_id, 'admin') THEN
        RETURN true;
    END IF;
    
    -- Get custom role
    SELECT custom_role_id INTO _custom_role_id
    FROM user_roles
    WHERE user_id = _user_id
    LIMIT 1;
    
    IF _custom_role_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Get limit
    SELECT 
        CASE _limit_type
            WHEN 'discount' THEN max_discount_percentage
            WHEN 'credit' THEN max_credit_limit
            WHEN 'invoice' THEN max_invoice_amount
            ELSE 999999999
        END INTO _max_value
    FROM role_limits
    WHERE role_id = _custom_role_id;
    
    RETURN _value <= COALESCE(_max_value, 999999999);
END;
$$;
```

#### 1.2 وظيفة تسجيل النشاط التلقائي

```sql
-- وظيفة Audit Log التلقائية
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
    _action TEXT;
    _old_values JSONB;
    _new_values JSONB;
BEGIN
    _user_id := auth.uid();
    
    IF TG_OP = 'INSERT' THEN
        _action := 'create';
        _new_values := to_jsonb(NEW);
        _old_values := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        _action := 'update';
        _old_values := to_jsonb(OLD);
        _new_values := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        _action := 'delete';
        _old_values := to_jsonb(OLD);
        _new_values := NULL;
    END IF;
    
    INSERT INTO activity_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        entity_name,
        old_values,
        new_values,
        ip_address
    ) VALUES (
        COALESCE(_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
        _action,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id)::TEXT,
        COALESCE(NEW.name, OLD.name, NEW.invoice_number, OLD.invoice_number, 
                 NEW.order_number, OLD.order_number, 'N/A'),
        _old_values,
        _new_values,
        current_setting('request.headers', true)::json->>'x-forwarded-for'
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;
```

---

### المرحلة 2: تحديث RLS Policies
**المدة: 3 ساعات | الأولوية: P0 - Critical**

#### 2.1 مصفوفة RLS الجديدة

| الجدول | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `invoices` | role-based | check_section_permission + check_financial_limit | check_section_permission | admin only |
| `payments` | role-based | check_section_permission | check_section_permission | admin only |
| `customers` | role-based | check_section_permission | check_section_permission | check_section_permission |
| `products` | all authenticated | check_section_permission | check_section_permission | check_section_permission |
| `employees` | admin/hr + own | admin/hr | admin/hr | admin only |
| `bank_accounts` | admin/accountant | admin/accountant | admin/accountant | admin only |

#### 2.2 تحديث سياسات الفواتير (مثال)

```sql
-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Admin or sales or accountant can manage invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated can view invoices" ON invoices;

-- سياسة العرض المحسّنة
CREATE POLICY "invoices_select_policy" ON invoices
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'invoices', 'view')
);

-- سياسة الإنشاء مع فحص الحد المالي
CREATE POLICY "invoices_insert_policy" ON invoices
FOR INSERT TO authenticated
WITH CHECK (
    (has_role(auth.uid(), 'admin') OR check_section_permission(auth.uid(), 'invoices', 'create'))
    AND check_financial_limit(auth.uid(), 'invoice', total_amount)
);

-- سياسة التحديث
CREATE POLICY "invoices_update_policy" ON invoices
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin') 
    OR check_section_permission(auth.uid(), 'invoices', 'edit')
)
WITH CHECK (
    check_financial_limit(auth.uid(), 'invoice', total_amount)
);

-- سياسة الحذف
CREATE POLICY "invoices_delete_policy" ON invoices
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));
```

---

### المرحلة 3: إنشاء Edge Functions للعمليات الحساسة
**المدة: 4 ساعات | الأولوية: P1 - High**

#### 3.1 قائمة Edge Functions المطلوبة

| Function | الغرض | التحقق |
|----------|-------|--------|
| `validate-invoice` | فحص بيانات الفاتورة قبل الإنشاء | limits + permissions |
| `process-payment` | معالجة الدفعات بـ transaction | balance update |
| `approve-expense` | الموافقة على المصروفات | approval workflow |
| `stock-movement` | حركات المخزون الآمنة | quantity checks |
| `audit-export` | تصدير سجلات النشاط | admin only |

#### 3.2 مثال: validate-invoice

```typescript
// supabase/functions/validate-invoice/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { invoice_data } = await req.json();

    // Check permission using DB function
    const { data: hasPermission } = await supabase.rpc('check_section_permission', {
      _user_id: user.id,
      _section: 'invoices',
      _action: 'create'
    });

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Permission denied', code: 'NO_PERMISSION' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check financial limit
    const { data: withinLimit } = await supabase.rpc('check_financial_limit', {
      _user_id: user.id,
      _limit_type: 'invoice',
      _value: invoice_data.total_amount
    });

    if (!withinLimit) {
      return new Response(
        JSON.stringify({ 
          error: 'Invoice amount exceeds your limit', 
          code: 'LIMIT_EXCEEDED' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate customer credit limit
    const { data: customer } = await supabase
      .from('customers')
      .select('credit_limit, current_balance')
      .eq('id', invoice_data.customer_id)
      .single();

    if (customer) {
      const newBalance = (customer.current_balance || 0) + invoice_data.total_amount;
      if (newBalance > (customer.credit_limit || 0)) {
        return new Response(
          JSON.stringify({ 
            error: 'Customer credit limit exceeded',
            code: 'CREDIT_LIMIT_EXCEEDED',
            details: {
              current_balance: customer.current_balance,
              credit_limit: customer.credit_limit,
              requested: invoice_data.total_amount
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ valid: true, message: 'Invoice validation passed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### المرحلة 4: Audit Triggers
**المدة: 1 ساعة | الأولوية: P1 - High**

#### 4.1 الجداول التي تحتاج Audit

```sql
-- إضافة Triggers للجداول الحساسة
CREATE TRIGGER audit_invoices
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_customers
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_purchase_orders
    AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_expenses
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_cash_transactions
    AFTER INSERT OR UPDATE OR DELETE ON cash_transactions
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_stock_movements
    AFTER INSERT OR UPDATE OR DELETE ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_user_roles
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION log_activity();
```

---

### المرحلة 5: توحيد Access Patterns في Frontend
**المدة: 3 ساعات | الأولوية: P2 - Medium**

#### 5.1 إنشاء Centralized API Layer

```typescript
// src/lib/api/secureOperations.ts
import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
  details?: Record<string, any>;
}

export async function validateBeforeInsert(
  table: string,
  data: Record<string, any>
): Promise<ValidationResult> {
  // Map table to section
  const sectionMap: Record<string, string> = {
    invoices: 'invoices',
    quotations: 'quotations',
    sales_orders: 'sales_orders',
    payments: 'payments',
    customers: 'customers',
    products: 'products',
  };

  const section = sectionMap[table];
  if (!section) {
    return { valid: true }; // No validation needed
  }

  // For invoices, use edge function
  if (table === 'invoices') {
    const { data: result, error } = await supabase.functions.invoke('validate-invoice', {
      body: { invoice_data: data }
    });
    
    if (error) {
      return { valid: false, error: error.message };
    }
    
    return result;
  }

  return { valid: true };
}

export async function secureInsert<T>(
  table: string,
  data: Record<string, any>
): Promise<{ data: T | null; error: Error | null }> {
  // Validate first
  const validation = await validateBeforeInsert(table, data);
  
  if (!validation.valid) {
    return { 
      data: null, 
      error: new Error(validation.error || 'Validation failed') 
    };
  }

  // Proceed with insert
  const { data: result, error } = await supabase
    .from(table as any)
    .insert(data)
    .select()
    .single();

  return { data: result as T, error };
}
```

#### 5.2 تحديث usePermissions Hook

```typescript
// إضافة server-side permission check
export function usePermissions() {
  // ... existing code ...

  const verifyPermissionOnServer = async (
    section: string, 
    action: 'view' | 'create' | 'edit' | 'delete'
  ): Promise<boolean> => {
    if (!user?.id) return false;
    
    const { data } = await supabase.rpc('check_section_permission', {
      _user_id: user.id,
      _section: section,
      _action: action
    });
    
    return data === true;
  };

  return {
    // ... existing returns ...
    verifyPermissionOnServer,
  };
}
```

---

### المرحلة 6: Observability & Monitoring
**المدة: 1 ساعة | الأولوية: P2 - Medium**

#### 6.1 إضافة Logging View

```sql
-- View للوحة مراقبة الأمان
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
    DATE_TRUNC('hour', created_at) as time_bucket,
    action,
    entity_type,
    COUNT(*) as action_count,
    COUNT(DISTINCT user_id) as unique_users
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1, 2, 3
ORDER BY 1 DESC;

-- View للعمليات المشبوهة
CREATE OR REPLACE VIEW suspicious_activities AS
SELECT 
    user_id,
    entity_type,
    action,
    COUNT(*) as frequency,
    MIN(created_at) as first_action,
    MAX(created_at) as last_action
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY 1, 2, 3
HAVING COUNT(*) > 50 -- أكثر من 50 عملية في الساعة
ORDER BY frequency DESC;
```

---

## 📁 ملخص الملفات

### ملفات جديدة

| الملف | الغرض |
|-------|-------|
| `supabase/functions/validate-invoice/index.ts` | تحقق من الفواتير |
| `supabase/functions/process-payment/index.ts` | معالجة الدفعات |
| `supabase/functions/approve-expense/index.ts` | الموافقة على المصروفات |
| `supabase/functions/stock-movement/index.ts` | حركات المخزون |
| `src/lib/api/secureOperations.ts` | طبقة API الموحدة |

### ملفات تحتاج تعديل

| الملف | التغيير |
|-------|---------|
| `src/hooks/usePermissions.ts` | إضافة server-side verification |
| `src/pages/invoices/InvoicesPage.tsx` | استخدام secureInsert |
| `src/pages/payments/PaymentsPage.tsx` | استخدام Edge Function |
| `src/components/invoices/InvoiceFormDialog.tsx` | validation قبل الإرسال |

### تغييرات قاعدة البيانات

| التغيير | النوع |
|---------|-------|
| `check_section_permission()` | Function جديدة |
| `check_financial_limit()` | Function جديدة |
| `log_activity()` | Function جديدة |
| 9 Audit Triggers | Triggers جديدة |
| تحديث 20+ RLS Policy | تحديث |
| `security_dashboard` View | View جديدة |
| `suspicious_activities` View | View جديدة |

---

## 📊 المخرجات المطلوبة (Q1 Deliverables)

### 1. RLS Matrix Document

| الجدول | SELECT | INSERT | UPDATE | DELETE | Notes |
|--------|--------|--------|--------|--------|-------|
| invoices | ✅ | ✅+limit | ✅+limit | admin | financial |
| payments | ✅ | ✅ | ✅ | admin | financial |
| ... | ... | ... | ... | ... | ... |

### 2. Security Functions Documentation

```markdown
## has_role(_user_id, _role)
- Purpose: Check if user has specific role
- Returns: BOOLEAN
- Security: DEFINER

## check_section_permission(_user_id, _section, _action)
- Purpose: Check section-level permission from custom roles
- Returns: BOOLEAN
- Security: DEFINER

## check_financial_limit(_user_id, _limit_type, _value)
- Purpose: Validate financial operations against role limits
- Returns: BOOLEAN
- Security: DEFINER
```

### 3. Architecture Notes

```text
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ usePermissions (UI hints only - NOT authoritative)  │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ secureOperations.ts (validation layer)              │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────│────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTIONS                           │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │validate-invoice│  │process-payment│  │approve-expense│   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
│  - Permission check via RPC                                 │
│  - Limit validation                                         │
│  - Business rules                                           │
└────────────────────────────│────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    POSTGRESQL                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  RLS POLICIES                        │   │
│  │  - Uses check_section_permission()                   │   │
│  │  - Uses check_financial_limit()                      │   │
│  │  - Uses has_role()                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 AUDIT TRIGGERS                       │   │
│  │  - log_activity() on all sensitive tables           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ معايير القبول (Acceptance Criteria)

| المعيار | الاختبار | الهدف |
|---------|---------|-------|
| RLS Enforcement | محاولة الوصول بدون permission | رفض مع 403 |
| Financial Limits | إنشاء فاتورة فوق الحد | رفض مع رسالة واضحة |
| Audit Trail | أي عملية على invoices | سجل في activity_logs |
| Edge Function Auth | استدعاء بدون token | رفض مع 401 |
| Permission Check | non-admin يحاول delete | رفض |
| Rate Limit View | عمليات مكثفة | تظهر في suspicious_activities |

---

## ⏱️ الجدول الزمني

```text
الأسبوع 1:
├── اليوم 1-2: Security Functions (check_section_permission, check_financial_limit)
├── اليوم 3-4: تحديث RLS Policies (جميع الجداول)
└── اليوم 5: اختبار وتوثيق

الأسبوع 2:
├── اليوم 1-2: Edge Functions (validate-invoice, process-payment)
├── اليوم 3: Edge Functions (approve-expense, stock-movement)
└── اليوم 4-5: Audit Triggers + Views

الأسبوع 3:
├── اليوم 1-2: تحديث Frontend (secureOperations.ts)
├── اليوم 3-4: تحديث usePermissions + الصفحات
└── اليوم 5: اختبار شامل

الأسبوع 4:
├── اليوم 1-2: توثيق RLS Matrix
├── اليوم 3: Architecture Notes
└── اليوم 4-5: مراجعة أمنية + إصلاحات
```

**إجمالي: 4 أسابيع (Q1)**

---

## ⚠️ المخاطر والتحديات

| المخاطر | الاحتمال | التأثير | الحل |
|---------|---------|---------|------|
| تعطل RLS الحالي | متوسط | عالي | اختبار في staging أولاً |
| أداء Security Functions | منخفض | متوسط | استخدام STABLE |
| تعارض مع الكود الحالي | متوسط | متوسط | تحديث تدريجي |
| Edge Function latency | منخفض | منخفض | تحسين queries |

---

## 🚫 ممنوع في Q1

- ❌ إضافة ميزات جديدة
- ❌ تغيير UI/UX
- ❌ إضافة جداول جديدة (ما عدا views)
- ❌ تعديل business logic
- ❌ Multi-tenant (Q3)
- ❌ Financial accounting (Q2)
