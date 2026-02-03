# 📋 Q1 Enterprise Security Documentation
## توثيق الأمان المؤسسي - المرحلة الأولى

---

## 🔐 RLS Matrix (مصفوفة سياسات أمان الصفوف)

### الجداول المالية (Financial Tables)

| الجدول | SELECT | INSERT | UPDATE | DELETE | ملاحظات |
|--------|--------|--------|--------|--------|---------|
| `invoices` | `check_section_permission('invoices', 'view')` | `check_section_permission + check_financial_limit` | `check_section_permission + check_financial_limit` | admin only | فحص حد الفاتورة |
| `invoice_items` | `check_section_permission('invoices', 'view')` | `check_section_permission('invoices', 'create')` | `check_section_permission('invoices', 'edit')` | admin only | مرتبط بالفواتير |
| `payments` | `check_section_permission('payments', 'view')` | `check_section_permission('payments', 'create')` | `check_section_permission('payments', 'edit')` | admin only | Edge Function مطلوب |
| `expenses` | `own + admin/accountant` | authenticated | admin/accountant | admin only | workflow approval |
| `expense_categories` | all authenticated | admin/accountant | admin/accountant | admin/accountant | - |
| `cash_registers` | `admin/accountant + check_section_permission` | admin/accountant | admin/accountant | admin/accountant | الخزائن |
| `cash_transactions` | `admin/accountant + check_section_permission` | `check_section_permission('treasury', 'create')` | admin only | admin only | immutable |
| `bank_accounts` | admin/accountant | admin/accountant | admin/accountant | admin/accountant | حساسة |

### جداول المبيعات (Sales Tables)

| الجدول | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `quotations` | `check_section_permission('quotations', 'view')` | `check_section_permission('quotations', 'create')` | `check_section_permission('quotations', 'edit')` | `check_section_permission('quotations', 'delete')` |
| `quotation_items` | `check_section_permission('quotations', 'view')` | `check_section_permission('quotations', 'create')` | `check_section_permission('quotations', 'edit')` | `check_section_permission('quotations', 'delete')` |
| `sales_orders` | `check_section_permission('sales_orders', 'view')` | `check_section_permission('sales_orders', 'create')` | `check_section_permission('sales_orders', 'edit')` | `check_section_permission('sales_orders', 'delete')` |
| `sales_order_items` | `check_section_permission('sales_orders', 'view')` | `check_section_permission('sales_orders', 'create')` | `check_section_permission('sales_orders', 'edit')` | `check_section_permission('sales_orders', 'delete')` |

### جداول العملاء (Customer Tables)

| الجدول | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `customers` | `check_section_permission('customers', 'view')` | `check_section_permission + check_financial_limit(credit)` | `check_section_permission + check_financial_limit(credit)` | `check_section_permission('customers', 'delete')` |
| `customer_addresses` | `check_section_permission('customers', 'view')` | `check_section_permission('customers', 'create')` | `check_section_permission('customers', 'edit')` | `check_section_permission('customers', 'delete')` |
| `customer_categories` | `check_section_permission('customers', 'view')` | admin only | admin only | admin only |

### جداول المنتجات والمخزون (Inventory Tables)

| الجدول | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `products` | `check_section_permission('products', 'view')` | `check_section_permission('products', 'create')` | `check_section_permission('products', 'edit')` | `check_section_permission('products', 'delete')` |
| `product_categories` | `check_section_permission('products', 'view')` | admin/warehouse | admin/warehouse | admin/warehouse |
| `product_stock` | `check_section_permission('inventory', 'view')` | `check_section_permission('inventory', 'create')` | `check_section_permission('inventory', 'edit')` | admin only |
| `stock_movements` | `check_section_permission('inventory', 'view')` | `check_section_permission('inventory', 'create')` | admin only | admin only |

### جداول الموردين (Supplier Tables)

| الجدول | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `suppliers` | `check_section_permission('suppliers', 'view')` | `check_section_permission('suppliers', 'create')` | `check_section_permission('suppliers', 'edit')` | `check_section_permission('suppliers', 'delete')` |
| `supplier_notes` | `check_section_permission('suppliers', 'view')` | `check_section_permission('suppliers', 'create')` | - | `check_section_permission('suppliers', 'delete')` |
| `purchase_orders` | `check_section_permission('purchase_orders', 'view')` | `check_section_permission('purchase_orders', 'create')` | `check_section_permission('purchase_orders', 'edit')` | `check_section_permission('purchase_orders', 'delete')` |

### جداول الموظفين (HR Tables)

| الجدول | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `employees` | `own + check_section_permission('employees', 'view')` | `check_section_permission('employees', 'create')` | `check_section_permission('employees', 'edit')` | admin only |
| `tasks` | own/assigned/admin | authenticated | own/assigned/admin | own/admin |

---

## 🛡️ Security Functions (وظائف الأمان)

### `has_role(_user_id UUID, _role app_role) → BOOLEAN`
```sql
-- التحقق من وجود دور محدد للمستخدم
-- استخدام: SECURITY DEFINER لتجنب RLS recursion
-- مثال: has_role(auth.uid(), 'admin')
```

### `has_any_role(_user_id UUID) → BOOLEAN`
```sql
-- التحقق من وجود أي دور للمستخدم
-- مستخدم في فحص المصادقة العامة
```

### `check_section_permission(_user_id UUID, _section TEXT, _action TEXT) → BOOLEAN`
```sql
-- التحقق من صلاحية القسم من جدول role_section_permissions
-- Actions: 'view' | 'create' | 'edit' | 'delete'
-- Admin = true always
-- يبحث عن custom_role_id في user_roles ثم يفحص role_section_permissions
```

### `check_financial_limit(_user_id UUID, _limit_type TEXT, _value DECIMAL) → BOOLEAN`
```sql
-- التحقق من الحدود المالية من جدول role_limits
-- Limit Types: 'discount' | 'credit' | 'invoice'
-- Admin = no limits (always true)
-- يقارن القيمة مع max_discount_percentage, max_credit_limit, max_invoice_amount
```

### `log_activity() → TRIGGER FUNCTION`
```sql
-- تسجيل تلقائي لجميع التغييرات
-- يُنفّذ عند INSERT, UPDATE, DELETE
-- يحفظ: user_id, action, entity_type, entity_id, old_values, new_values, ip_address
```

---

## 📊 Audit Triggers (مشغلات التدقيق)

| الجدول | Trigger Name | Events |
|--------|-------------|--------|
| `invoices` | `audit_invoices` | INSERT, UPDATE, DELETE |
| `payments` | `audit_payments` | INSERT, UPDATE, DELETE |
| `customers` | `audit_customers` | INSERT, UPDATE, DELETE |
| `products` | `audit_products` | INSERT, UPDATE, DELETE |
| `purchase_orders` | `audit_purchase_orders` | INSERT, UPDATE, DELETE |
| `expenses` | `audit_expenses` | INSERT, UPDATE, DELETE |
| `cash_transactions` | `audit_cash_transactions` | INSERT, UPDATE, DELETE |
| `stock_movements` | `audit_stock_movements` | INSERT, UPDATE, DELETE |
| `user_roles` | `audit_user_roles` | INSERT, UPDATE, DELETE |
| `quotations` | `audit_quotations` | INSERT, UPDATE, DELETE |
| `sales_orders` | `audit_sales_orders` | INSERT, UPDATE, DELETE |
| `suppliers` | `audit_suppliers` | INSERT, UPDATE, DELETE |
| `employees` | `audit_employees` | INSERT, UPDATE, DELETE |

---

## ⚡ Edge Functions (الوظائف الطرفية)

### `validate-invoice`
**الغرض**: تحقق من صحة بيانات الفاتورة قبل الإنشاء

**التحققات**:
1. ✅ JWT validation via `getClaims()`
2. ✅ `check_section_permission('invoices', 'create')`
3. ✅ `check_financial_limit('invoice', total_amount)`
4. ✅ Customer credit limit validation
5. ✅ Product existence and active status

**Response Codes**:
- `401 UNAUTHORIZED` - No/invalid token
- `403 NO_PERMISSION` - No section permission
- `403 LIMIT_EXCEEDED` - Invoice amount > role limit
- `400 CREDIT_LIMIT_EXCEEDED` - Customer credit exceeded
- `400 INACTIVE_PRODUCTS` - Product not active
- `200` - Validation passed

---

### `process-payment`
**الغرض**: معالجة الدفعات مع تحديث الأرصدة

**العمليات**:
1. ✅ JWT validation
2. ✅ Permission check
3. ✅ Customer validation
4. ✅ Invoice validation (if provided)
5. ✅ Payment creation
6. ✅ Customer balance update
7. ✅ Invoice paid_amount + payment_status update

**Response Codes**:
- `400 AMOUNT_EXCEEDS_BALANCE` - Payment > invoice remaining
- `403 NO_PERMISSION` - No payments permission

---

### `approve-expense`
**الغرض**: سير عمل الموافقة على المصروفات

**التحققات**:
1. ✅ Only admin/accountant can approve
2. ✅ Cannot self-approve (except admin)
3. ✅ Only pending expenses can be processed
4. ✅ Rejection requires reason

**العمليات عند الموافقة**:
- Update expense status → 'approved'
- Update cash_register balance
- Create cash_transaction record

---

### `stock-movement`
**الغرض**: حركات المخزون الآمنة

**التحققات**:
1. ✅ Permission check for 'inventory' section
2. ✅ Product existence validation
3. ✅ Stock availability for outgoing movements
4. ✅ Warehouse requirements per movement type

**Movement Types**:
- `in` → requires `to_warehouse_id`
- `out` → requires `from_warehouse_id` + stock check
- `transfer` → requires both + stock check
- `adjustment` → flexible

---

## 📈 Monitoring Views (عروض المراقبة)

### `security_dashboard`
```sql
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
```

### `suspicious_activities`
```sql
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
HAVING COUNT(*) > 50 -- More than 50 operations per hour
ORDER BY frequency DESC;
```

---

## 🔒 Frontend Security Layer

### `src/lib/api/secureOperations.ts`
Centralized API layer for secure operations:
- `validateBeforeInsert()` - Pre-validation via Edge Functions
- `secureInsert()` - Insert with validation
- `securePayment()` - Payment processing via Edge Function
- `approveExpense()` - Expense approval workflow
- `processStockMovement()` - Stock movement via Edge Function

### `src/hooks/usePermissions.ts`
Enhanced with server-side verification:
- `verifyPermissionOnServer(section, action)` - RPC to `check_section_permission`
- `verifyFinancialLimitOnServer(type, value)` - RPC to `check_financial_limit`

---

## ✅ Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| RLS enabled on all tables | ✅ | 44+ tables |
| Security functions use DEFINER | ✅ | Prevents RLS bypass |
| No business logic in frontend | ✅ | Edge Functions handle |
| Audit trail for sensitive tables | ✅ | 13 tables with triggers |
| Financial limits enforced in DB | ✅ | Via RLS WITH CHECK |
| JWT validation in Edge Functions | ✅ | Using getClaims() |
| Admin-only delete on financial tables | ✅ | invoices, payments, expenses |
| Custom permissions via role_section_permissions | ✅ | Full CRUD control |
| Rate limiting visibility | ✅ | suspicious_activities view |

---

## 🚨 Known Limitations (Q1)

1. **No tenant isolation** - Will be addressed in Q3
2. **No 2FA** - Authentication enhancement planned
3. **No approval workflow for invoices** - Only expenses have approval
4. **Rate limiting is observational** - No automatic blocking yet

---

## 📅 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-03 | Initial Q1 security implementation |

---

*Generated by Q1 Enterprise Transformation - Foundation & Governance Phase*
