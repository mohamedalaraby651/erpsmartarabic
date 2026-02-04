# توثيق واجهات البرمجة (API Documentation)

## نظرة عامة

يعتمد النظام على مجموعة من Edge Functions للتحقق من الصلاحيات ومعالجة العمليات الحساسة على مستوى الخادم، بالإضافة إلى وظائف SQL (RPC) للتحقق من الصلاحيات والحدود المالية.

---

## Edge Functions

### 1. validate-invoice

**الوظيفة:** التحقق من صلاحية بيانات الفاتورة قبل إنشائها

**المسار:** `/functions/v1/validate-invoice`

**المدخلات:**
```typescript
{
  invoice_data: {
    customer_id: string;
    total_amount: number;
    items: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
    }>;
  }
}
```

**المخرجات:**
```typescript
{
  valid: boolean;
  message?: string;
  error?: string;
  code?: string;
  details?: {
    customer_credit?: number;
    current_balance?: number;
    limit?: number;
  };
}
```

**رموز الخطأ:**
| الكود | الوصف |
|-------|-------|
| `UNAUTHORIZED` | المستخدم غير مسجل الدخول |
| `INVALID_TOKEN` | انتهت صلاحية الجلسة |
| `NO_PERMISSION` | لا يملك صلاحية إنشاء فواتير |
| `LIMIT_EXCEEDED` | مبلغ الفاتورة يتجاوز الحد المسموح |
| `CREDIT_LIMIT_EXCEEDED` | تجاوز الحد الائتماني للعميل |
| `CUSTOMER_NOT_FOUND` | العميل غير موجود |
| `PRODUCT_NOT_FOUND` | منتج غير موجود |
| `INACTIVE_PRODUCTS` | منتجات غير نشطة |

---

### 2. process-payment

**الوظيفة:** معالجة الدفعات وتحديث الأرصدة في معاملة واحدة

**المسار:** `/functions/v1/process-payment`

**المدخلات:**
```typescript
{
  payment_data: {
    customer_id: string;
    invoice_id?: string;
    amount: number;
    payment_method: 'cash' | 'credit_card' | 'bank_transfer' | 'check';
    payment_number: string;
    reference_number?: string;
    notes?: string;
  }
}
```

**المخرجات:**
```typescript
{
  success: boolean;
  payment_id?: string;
  error?: string;
  code?: string;
  details?: {
    new_balance?: number;
    invoice_status?: string;
  };
}
```

**رموز الخطأ:**
| الكود | الوصف |
|-------|-------|
| `NO_PERMISSION` | لا يملك صلاحية معالجة الدفعات |
| `INVOICE_NOT_FOUND` | الفاتورة غير موجودة |
| `AMOUNT_EXCEEDS_BALANCE` | المبلغ يتجاوز رصيد الفاتورة |
| `CUSTOMER_NOT_FOUND` | العميل غير موجود |

---

### 3. approve-expense

**الوظيفة:** الموافقة أو رفض المصروفات مع التحقق من سير العمل

**المسار:** `/functions/v1/approve-expense`

**المدخلات:**
```typescript
{
  expense_id: string;
  action: 'approve' | 'reject';
  rejection_reason?: string; // مطلوب عند الرفض
}
```

**المخرجات:**
```typescript
{
  success: boolean;
  error?: string;
  code?: string;
  details?: {
    new_status?: string;
    approved_by?: string;
  };
}
```

**رموز الخطأ:**
| الكود | الوصف |
|-------|-------|
| `SELF_APPROVAL` | لا يمكن الموافقة على مصروفاتك الخاصة |
| `INVALID_STATUS` | حالة المصروف لا تسمح بهذا الإجراء |
| `MISSING_REASON` | يجب إدخال سبب الرفض |
| `NO_PERMISSION` | لا يملك صلاحية الموافقة |

---

### 4. stock-movement

**الوظيفة:** تنفيذ حركات المخزون مع التحقق من التوفر

**المسار:** `/functions/v1/stock-movement`

**المدخلات:**
```typescript
{
  movement_data: {
    product_id: string;
    variant_id?: string;
    movement_type: 'in' | 'out' | 'transfer' | 'adjustment';
    quantity: number;
    from_warehouse_id?: string;
    to_warehouse_id?: string;
    reference_type?: string;
    reference_id?: string;
    notes?: string;
  }
}
```

**المخرجات:**
```typescript
{
  success: boolean;
  movement_id?: string;
  error?: string;
  code?: string;
  details?: {
    new_stock?: number;
    warehouse_name?: string;
  };
}
```

**رموز الخطأ:**
| الكود | الوصف |
|-------|-------|
| `INSUFFICIENT_STOCK` | الكمية غير متوفرة |
| `MISSING_WAREHOUSE` | يجب تحديد المستودع |
| `PRODUCT_NOT_FOUND` | المنتج غير موجود |

---

### 5. approve-invoice

**الوظيفة:** سير عمل الموافقة على الفواتير

**المسار:** `/functions/v1/approve-invoice`

**المدخلات:**
```typescript
{
  invoice_id: string;
  action: 'approve' | 'reject';
  rejection_reason?: string;
}
```

**المخرجات:**
```typescript
{
  success: boolean;
  error?: string;
  code?: string;
  details?: {
    new_status?: string;
  };
}
```

---

### 6. create-journal

**الوظيفة:** إنشاء قيود محاسبية مزدوجة القيد مع التحقق من التوازن

**المسار:** `/functions/v1/create-journal`

**المدخلات:**
```typescript
{
  journal_date: string; // YYYY-MM-DD
  description: string;
  entries: Array<{
    account_id: string;
    debit_amount?: number;
    credit_amount?: number;
    memo?: string;
  }>;
}
```

**المخرجات:**
```typescript
{
  success: boolean;
  journal_id?: string;
  journal_number?: string;
  error?: string;
  code?: string;
}
```

**رموز الخطأ:**
| الكود | الوصف |
|-------|-------|
| `UNBALANCED` | القيد غير متوازن (مدين ≠ دائن) |
| `NO_ENTRIES` | لا توجد بنود في القيد |
| `ACCOUNT_NOT_FOUND` | حساب غير موجود |
| `PERIOD_CLOSED` | الفترة المالية مغلقة |

---

### 7. verify-totp

**الوظيفة:** إعداد وتحقق المصادقة الثنائية (2FA)

**المسار:** `/functions/v1/verify-totp`

**المدخلات:**
```typescript
{
  action: 'setup' | 'enable' | 'disable' | 'verify';
  totp_code?: string; // مطلوب لـ enable, disable, verify
}
```

**المخرجات (setup):**
```typescript
{
  success: true;
  secret: string;
  qr_code: string; // data URL
}
```

**المخرجات (enable/disable/verify):**
```typescript
{
  success: boolean;
  error?: string;
  code?: string;
}
```

---

## SQL Functions (RPC)

### check_section_permission

**الوظيفة:** التحقق من صلاحية المستخدم لقسم معين

**الاستدعاء:**
```typescript
const { data } = await supabase.rpc('check_section_permission', {
  _user_id: userId,
  _section: 'invoices',
  _action: 'create' // 'view' | 'create' | 'edit' | 'delete'
});
```

**المخرجات:** `boolean`

---

### check_financial_limit

**الوظيفة:** التحقق من الحدود المالية للمستخدم

**الاستدعاء:**
```typescript
const { data } = await supabase.rpc('check_financial_limit', {
  _user_id: userId,
  _limit_type: 'discount', // 'discount' | 'credit' | 'invoice'
  _value: 15 // القيمة المراد التحقق منها
});
```

**المخرجات:** `boolean`

---

### has_role

**الوظيفة:** التحقق من دور المستخدم

**الاستدعاء:**
```typescript
const { data } = await supabase.rpc('has_role', {
  _user_id: userId,
  _role: 'admin' // 'admin' | 'sales' | 'accountant' | 'warehouse' | 'hr'
});
```

**المخرجات:** `boolean`

---

### log_activity

**الوظيفة:** تسجيل النشاطات (يتم تفعيلها تلقائياً عبر Triggers)

**الجداول المراقبة:**
- invoices
- payments
- expenses
- stock_movements
- customers
- suppliers
- products
- purchase_orders
- sales_orders
- journal_entries
- bank_accounts
- quotations
- employees

---

## استخدام الوحدة المركزية

### الملف: `src/lib/api/secureOperations.ts`

```typescript
import { 
  validateInvoice,
  processPayment,
  approveExpense,
  processStockMovement,
  verifyPermissionOnServer,
  verifyFinancialLimit,
  getErrorMessage
} from '@/lib/api/secureOperations';

// مثال: التحقق من فاتورة
const validation = await validateInvoice({
  customer_id: 'xxx',
  total_amount: 5000,
  items: [...]
});

if (!validation.valid) {
  console.error(getErrorMessage(validation.code));
}
```

---

## معالجة الأخطاء

يستخدم النظام وحدة `errorHandler.ts` لتحويل الأخطاء التقنية إلى رسائل عربية واضحة:

```typescript
import { getSafeErrorMessage, logErrorSafely } from '@/lib/errorHandler';

try {
  // عملية قد تفشل
} catch (error) {
  logErrorSafely('contextName', error); // تسجيل آمن (dev فقط)
  toast({ 
    title: 'خطأ', 
    description: getSafeErrorMessage(error) 
  });
}
```

---

## ملاحظات أمنية

1. **جميع العمليات الحساسة** تمر عبر Edge Functions وليس من الواجهة مباشرة
2. **التحقق المزدوج**: الواجهة + الخادم (الخادم هو المرجع النهائي)
3. **لا يتم كشف** أسماء الجداول أو تفاصيل الأخطاء التقنية للمستخدم
4. **RLS مفعّل** على جميع الجداول الحساسة
5. **Audit Triggers** تسجل جميع التغييرات على البيانات الحرجة
