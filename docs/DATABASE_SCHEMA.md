# مخطط قاعدة البيانات (Database Schema)

## نظرة عامة

يحتوي النظام على **56 جدول** رئيسي مع تفعيل **Row Level Security (RLS)** على جميع الجداول الحساسة و **13 Audit Trigger** لتتبع التغييرات.

---

## الجداول حسب القسم

### 1. المبيعات والعملاء

| الجدول | الوصف | RLS | Audit |
|--------|-------|:---:|:-----:|
| `customers` | بيانات العملاء | ✅ | ✅ |
| `customer_addresses` | عناوين العملاء | ✅ | - |
| `customer_categories` | تصنيفات العملاء | ✅ | - |
| `quotations` | عروض الأسعار | ✅ | ✅ |
| `quotation_items` | بنود عروض الأسعار | ✅ | - |
| `invoices` | الفواتير | ✅ | ✅ |
| `invoice_items` | بنود الفواتير | ✅ | - |
| `sales_orders` | أوامر البيع | ✅ | ✅ |
| `sales_order_items` | بنود أوامر البيع | ✅ | - |
| `payments` | الدفعات والتحصيل | ✅ | ✅ |

---

### 2. المخزون والمشتريات

| الجدول | الوصف | RLS | Audit |
|--------|-------|:---:|:-----:|
| `products` | المنتجات | ✅ | ✅ |
| `product_variants` | متغيرات المنتجات | ✅ | - |
| `product_categories` | تصنيفات المنتجات | ✅ | - |
| `product_stock` | أرصدة المخزون | ✅ | - |
| `warehouses` | المستودعات | ✅ | - |
| `stock_movements` | حركات المخزون | ✅ | ✅ |
| `suppliers` | الموردين | ✅ | ✅ |
| `supplier_payments` | مدفوعات الموردين | ✅ | - |
| `purchase_orders` | أوامر الشراء | ✅ | ✅ |
| `purchase_order_items` | بنود أوامر الشراء | ✅ | - |

---

### 3. المحاسبة والمالية

| الجدول | الوصف | RLS | Audit |
|--------|-------|:---:|:-----:|
| `chart_of_accounts` | دليل الحسابات | ✅ | - |
| `journals` | قيود اليومية | ✅ | - |
| `journal_entries` | بنود القيود | ✅ | ✅ |
| `fiscal_periods` | الفترات المالية | ✅ | - |
| `bank_accounts` | الحسابات البنكية | ✅ (admin/accountant) | ✅ |
| `expenses` | المصروفات | ✅ | ✅ |
| `expense_categories` | تصنيفات المصروفات | ✅ | - |
| `cash_registers` | صناديق النقد | ✅ | - |
| `cash_transactions` | حركات الصندوق | ✅ | - |

---

### 4. الموظفين والموارد البشرية

| الجدول | الوصف | RLS | Audit |
|--------|-------|:---:|:-----:|
| `employees` | بيانات الموظفين | ✅ | ✅ |
| `profiles` | ملفات المستخدمين | ✅ | - |
| `tasks` | المهام | ✅ | - |
| `notifications` | الإشعارات | ✅ | - |

---

### 5. الأمان والتدقيق

| الجدول | الوصف | RLS | ملاحظات |
|--------|-------|:---:|---------|
| `user_roles` | أدوار المستخدمين | ✅ | يحدد الدور الأساسي |
| `custom_roles` | الأدوار المخصصة | ✅ | admin only |
| `role_section_permissions` | صلاحيات الأقسام | ✅ | admin only |
| `role_limits` | الحدود المالية | ✅ | admin only |
| `activity_logs` | سجل النشاطات | ✅ | للقراءة فقط |
| `user_2fa_settings` | إعدادات المصادقة الثنائية | ✅ | للمستخدم نفسه فقط |
| `push_subscriptions` | اشتراكات الإشعارات | ✅ | للمستخدم نفسه فقط |

---

### 6. الإعدادات والتخصيص

| الجدول | الوصف | RLS | ملاحظات |
|--------|-------|:---:|---------|
| `company_settings` | إعدادات الشركة | ✅ | مشترك |
| `user_preferences` | تفضيلات المستخدم | ✅ | للمستخدم نفسه |
| `user_sidebar_settings` | إعدادات القائمة | ✅ | للمستخدم نفسه |
| `export_templates` | قوالب التصدير | ✅ | - |
| `attachments` | المرفقات | ✅ | - |

---

## الأعمدة الشائعة

### معرفات

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | UUID | المعرف الفريد (PRIMARY KEY) |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |
| `created_by` | UUID | معرف المُنشئ |

### أعمدة الحالة

| العمود | القيم | الجداول |
|--------|------|---------|
| `status` | draft, pending, confirmed, cancelled | invoices, quotations, orders |
| `payment_status` | pending, partial, paid | invoices |
| `approval_status` | pending, approved, rejected | invoices, expenses |
| `is_active` | boolean | customers, products, suppliers |

---

## العلاقات الرئيسية

```
customers ──┬── invoices ──── invoice_items ──── products
            ├── quotations ── quotation_items ── products
            ├── sales_orders ── sales_order_items
            └── payments

suppliers ──┬── purchase_orders ── purchase_order_items ── products
            └── supplier_payments

products ──┬── product_variants
           ├── product_stock ── warehouses
           └── stock_movements

chart_of_accounts ── journal_entries ── journals ── fiscal_periods

employees ── profiles ── user_roles ── custom_roles ── role_section_permissions
                                                   └── role_limits
```

---

## Enums (أنواع البيانات المحددة)

### app_role
```sql
'admin' | 'sales' | 'accountant' | 'warehouse' | 'hr'
```

### customer_type
```sql
'individual' | 'company'
```

### vip_level
```sql
'none' | 'silver' | 'gold' | 'platinum'
```

### payment_method
```sql
'cash' | 'bank_transfer' | 'credit' | 'advance_payment' | 'installment'
```

### payment_status
```sql
'pending' | 'partial' | 'paid'
```

### document_status
```sql
'draft' | 'pending' | 'confirmed' | 'cancelled'
```

### account_type
```sql
'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
```

### balance_type
```sql
'debit' | 'credit'
```

---

## Database Functions

### check_section_permission
```sql
check_section_permission(_user_id UUID, _section TEXT, _action TEXT) → BOOLEAN
```
التحقق من صلاحية المستخدم لإجراء معين على قسم محدد.

### check_financial_limit
```sql
check_financial_limit(_user_id UUID, _limit_type TEXT, _value NUMERIC) → BOOLEAN
```
التحقق من الحدود المالية (الخصم، الائتمان، مبلغ الفاتورة).

### has_role
```sql
has_role(_user_id UUID, _role app_role) → BOOLEAN
```
التحقق من دور المستخدم.

### log_activity
```sql
log_activity() → TRIGGER
```
تسجيل النشاطات تلقائياً على الجداول المراقبة.

### handle_new_user
```sql
handle_new_user() → TRIGGER
```
إنشاء ملف المستخدم ودور افتراضي عند التسجيل.

### update_updated_at_column
```sql
update_updated_at_column() → TRIGGER
```
تحديث عمود updated_at تلقائياً.

---

## Sequences (المتسلسلات)

| المتسلسل | الجدول | الصيغة |
|---------|--------|--------|
| `expense_seq` | expenses | EXP-YYYYMMDD-XXXX |
| `cash_txn_seq` | cash_transactions | TXN-YYYYMMDD-XXXX |
| `journal_seq` | journals | JRN-YYYYMMDD-XXXX |

---

## Storage Buckets

| الاسم | عام | الاستخدام |
|------|:---:|----------|
| `documents` | ❌ | المستندات والمرفقات |
| `avatars` | ❌ | صور المستخدمين |
| `employee-images` | ❌ | صور الموظفين |
| `customer-images` | ❌ | صور العملاء |
| `supplier-images` | ❌ | صور الموردين |
| `logos` | ❌ | شعارات الشركة |

---

## ملاحظات أمنية

1. **RLS مفعّل** على جميع الجداول - لا يمكن الوصول للبيانات بدون مصادقة
2. **Admin-only tables**: `custom_roles`, `role_section_permissions`, `role_limits`
3. **User-specific tables**: `user_preferences`, `user_2fa_settings`, `push_subscriptions`
4. **Audit logging** على 13 جدول حرج
5. **SECURITY DEFINER** على الوظائف الحساسة مع `search_path = 'public'`
