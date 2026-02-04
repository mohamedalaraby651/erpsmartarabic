
# الخطة الشاملة لإكمال جميع المهام غير المكتملة
## Complete Implementation Plan for All Pending Tasks

---

## ملخص المهام المتبقية

بناءً على مراجعة شاملة لملفات المشروع (`plan.md`، `SYSTEM_ISSUES_REPORT.md`، `PROJECT_PROGRESS.md`)، تم تحديد المهام التالية:

| الأولوية | المهمة | الحالة الحالية |
|----------|--------|---------------|
| **P0** | إصلاح console.log في secureOperations.ts | ✅ مكتمل |
| **P1** | تحسين secureOperations.ts لاستخدام getSafeErrorMessage | ✅ مكتمل |
| **P2** | تقسيم الملفات الكبيرة (4 ملفات) | ✅ مكتمل |
| **P2** | إعادة هيكلة AppSidebar.tsx لاستخدام SidebarNavSections | ✅ مكتمل |
| **P2** | إعادة هيكلة QuotationFormDialog.tsx لاستخدام useQuotationItems | ✅ مكتمل |
| **P2** | إعادة هيكلة InvoiceFormDialog.tsx | ✅ مكتمل |
| **P2** | إنشاء API_DOCUMENTATION.md | ✅ مكتمل |
| **P2** | إنشاء DATABASE_SCHEMA.md | ✅ مكتمل |
| **P2** | إنشاء DEPLOYMENT_GUIDE.md | ✅ مكتمل |

---

## المرحلة 1: إصلاحات الأمان والكود (P0-P1)

### 1.1 تحسين secureOperations.ts

**الملف:** `src/lib/api/secureOperations.ts`

**المشكلة:** استخدام `console.error` في الـ production يكشف تفاصيل تقنية، واستخدام `error.message` بشكل مباشر.

**التغييرات:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  قبل التعديل                                                    │
├─────────────────────────────────────────────────────────────────┤
│  console.error('[secureOperations] ...', error);                │
│  error: error.message || 'فشل...'                               │
├─────────────────────────────────────────────────────────────────┤
│  بعد التعديل                                                    │
├─────────────────────────────────────────────────────────────────┤
│  logErrorSafely('secureOperations.validateInvoice', error);     │
│  error: getSafeErrorMessage(error) || 'فشل...'                  │
└─────────────────────────────────────────────────────────────────┘
```

**الإجراءات:**
1. استيراد `logErrorSafely` و `getSafeErrorMessage` من `errorHandler.ts`
2. استبدال 6 instances من `console.error` بـ `logErrorSafely`
3. استبدال 4 instances من `error.message` بـ `getSafeErrorMessage(error)`

---

## المرحلة 2: تقسيم الملفات الكبيرة (P2)

### 2.1 تقسيم AppSidebar.tsx (586 سطر)

**الملفات الجديدة:**
```text
src/components/layout/sidebar/
├── SidebarHeader.tsx      # شعار + زر الطي (موجود)
├── SidebarFooter.tsx      # أزرار الإعدادات والخروج (موجود)
├── SidebarNavSections.tsx # 🆕 الأقسام الأربعة الرئيسية
└── index.ts               # تصدير موحد (موجود)
```

**التغييرات:**
1. إنشاء `SidebarNavSections.tsx` لاحتواء الأقسام الأربعة (المبيعات، المخزون، المالية، النظام)
2. نقل `defaultNavSections` و `sectionIconColors` للملف الجديد
3. تبسيط `AppSidebar.tsx` لاستخدام المكونات الفرعية

**الحجم المتوقع بعد التقسيم:** ~300 سطر

---

### 2.2 تقسيم MobileDrawer.tsx (470 سطر)

**الملفات الموجودة:**
```text
src/components/layout/mobile/
├── MobileFavoritesSection.tsx  # ✅ موجود
├── MobileFooter.tsx            # ✅ موجود
├── MobileNavSection.tsx        # ✅ موجود
├── MobileQuickActions.tsx      # ✅ موجود
└── index.ts                    # ✅ موجود
```

**التغييرات:**
1. إنشاء `MobileDrawerHeader.tsx` لاحتواء الشعار والبحث
2. إنشاء `MobileNavSections.tsx` لاحتواء الأقسام الأربعة
3. تبسيط `MobileDrawer.tsx` لاستخدام المكونات الفرعية

**الحجم المتوقع بعد التقسيم:** ~250 سطر

---

### 2.3 تقسيم InvoiceFormDialog.tsx (541 سطر)

**الملفات الموجودة والجديدة:**
```text
src/components/invoices/
├── InvoiceFormDialog.tsx       # الملف الرئيسي
├── InvoiceItemsTable.tsx       # ✅ موجود
├── InvoiceTotalsSection.tsx    # ✅ موجود
├── useInvoiceItems.ts          # ✅ موجود
├── InvoiceFormHeader.tsx       # 🆕 حقول الفاتورة الأساسية
└── InvoiceValidation.tsx       # 🆕 شارة التحقق والرسائل
```

**التغييرات:**
1. إنشاء `InvoiceFormHeader.tsx` لحقول العميل والتاريخ والحالة
2. إنشاء `InvoiceValidation.tsx` لعرض حالة التحقق من Edge Function
3. تبسيط `InvoiceFormDialog.tsx` لاستخدام المكونات الفرعية

**الحجم المتوقع بعد التقسيم:** ~300 سطر

---

### 2.4 تقسيم QuotationFormDialog.tsx (497 سطر)

**الملفات الموجودة والجديدة:**
```text
src/components/quotations/
├── QuotationFormDialog.tsx       # الملف الرئيسي
├── QuotationItemsTable.tsx       # ✅ موجود
├── QuotationTotalsSection.tsx    # ✅ موجود
├── QuotationFormHeader.tsx       # 🆕 حقول عرض السعر الأساسية
└── useQuotationItems.ts          # 🆕 Hook لإدارة البنود
```

**التغييرات:**
1. إنشاء `QuotationFormHeader.tsx` لحقول العميل والتاريخ والصلاحية
2. إنشاء `useQuotationItems.ts` لإدارة منطق البنود (مشابه لـ useInvoiceItems)
3. تبسيط `QuotationFormDialog.tsx` لاستخدام المكونات الفرعية

**الحجم المتوقع بعد التقسيم:** ~280 سطر

---

## المرحلة 3: إنشاء التوثيق (P2)

### 3.1 API_DOCUMENTATION.md

**المحتوى:**
```markdown
# توثيق واجهات البرمجة (API Documentation)

## Edge Functions

### 1. validate-invoice
- **الوظيفة:** التحقق من صلاحية بيانات الفاتورة
- **المدخلات:** invoice_data (customer_id, total_amount, items[])
- **المخرجات:** ValidationResult
- **رموز الخطأ:** UNAUTHORIZED, NO_PERMISSION, LIMIT_EXCEEDED, etc.

### 2. process-payment
- **الوظيفة:** معالجة الدفعات وتحديث الأرصدة
- **المدخلات:** payment_data (customer_id, invoice_id, amount, payment_method)
- **المخرجات:** OperationResult<payment_id>

### 3. approve-expense
- **الوظيفة:** الموافقة أو رفض المصروفات
- **المدخلات:** expense_id, action, rejection_reason?
- **المخرجات:** OperationResult

### 4. stock-movement
- **الوظيفة:** تنفيذ حركات المخزون
- **المدخلات:** movement_data (product_id, movement_type, quantity, etc.)
- **المخرجات:** OperationResult<movement_id>

### 5. approve-invoice
- **الوظيفة:** سير عمل الموافقة على الفواتير
- **المدخلات:** invoice_id, action, rejection_reason?
- **المخرجات:** OperationResult

### 6. create-journal
- **الوظيفة:** إنشاء قيود محاسبية مزدوجة القيد
- **المدخلات:** journal_date, description, entries[]
- **المخرجات:** OperationResult<journal_id>

### 7. verify-totp
- **الوظيفة:** إعداد وتحقق المصادقة الثنائية
- **المدخلات:** action (setup|enable|disable|verify), totp_code?
- **المخرجات:** varies by action

## SQL Functions (RPC)

### check_section_permission
### check_financial_limit
### log_activity
### has_role
```

---

### 3.2 DATABASE_SCHEMA.md

**المحتوى:**
```markdown
# مخطط قاعدة البيانات (Database Schema)

## الجداول الرئيسية (56 جدول)

### المبيعات والعملاء
| الجدول | الوصف | RLS |
|--------|-------|-----|
| customers | بيانات العملاء | ✅ |
| quotations | عروض الأسعار | ✅ |
| quotation_items | بنود العروض | ✅ |
| invoices | الفواتير | ✅ |
| invoice_items | بنود الفواتير | ✅ |
| sales_orders | أوامر البيع | ✅ |
| payments | الدفعات | ✅ |

### المخزون والمشتريات
| الجدول | الوصف | RLS |
|--------|-------|-----|
| products | المنتجات | ✅ |
| product_variants | متغيرات المنتجات | ✅ |
| categories | التصنيفات | ✅ |
| inventory | المخزون | ✅ |
| stock_movements | حركات المخزون | ✅ |
| suppliers | الموردين | ✅ |
| purchase_orders | أوامر الشراء | ✅ |

### المحاسبة
| الجدول | الوصف | RLS |
|--------|-------|-----|
| chart_of_accounts | دليل الحسابات | ✅ |
| journals | قيود اليومية | ✅ |
| journal_entries | بنود القيود | ✅ |
| fiscal_periods | الفترات المالية | ✅ |
| bank_accounts | الحسابات البنكية | ✅ (admin/accountant) |

### الأمان والتدقيق
| الجدول | الوصف | RLS |
|--------|-------|-----|
| user_roles | أدوار المستخدمين | ✅ |
| custom_roles | الأدوار المخصصة | ✅ (admin only) |
| role_section_permissions | صلاحيات الأقسام | ✅ (admin only) |
| role_limits | الحدود المالية | ✅ (admin only) |
| activity_logs | سجل النشاطات | ✅ |
| user_2fa_settings | إعدادات 2FA | ✅ |

## Audit Triggers (13 جدول)
invoices, payments, expenses, stock_movements, customers, 
suppliers, products, purchase_orders, sales_orders, 
journal_entries, bank_accounts, quotations, employees
```

---

### 3.3 DEPLOYMENT_GUIDE.md

**المحتوى:**
```markdown
# دليل النشر (Deployment Guide)

## متطلبات النظام
- Node.js 18+
- Lovable Cloud (Supabase)

## إعداد البيئة

### 1. المتغيرات البيئية
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

### 2. Edge Functions
يتم نشرها تلقائياً عبر Lovable Cloud:
- validate-invoice
- process-payment
- approve-expense
- stock-movement
- approve-invoice
- create-journal
- verify-totp

## النشر للإنتاج

### خطوات النشر
1. التحقق من جميع الاختبارات: `npm run test`
2. البناء: `npm run build`
3. النشر: زر "Publish" في Lovable

### قائمة التحقق قبل النشر
- [ ] جميع الاختبارات ناجحة (850+)
- [ ] لا توجد أخطاء TypeScript
- [ ] RLS مفعّل على جميع الجداول
- [ ] Edge Functions تعمل بشكل صحيح

## النسخ الاحتياطي والاسترداد
- النسخ: Cloud View > Database > Backup
- الاسترداد: Cloud View > Database > Restore
```

---

## جدول التنفيذ

| # | المهمة | الوقت المتوقع | الأولوية |
|---|--------|--------------|----------|
| 1 | تحسين secureOperations.ts | 30 دقيقة | P0 |
| 2 | تقسيم AppSidebar.tsx | 45 دقيقة | P2 |
| 3 | تقسيم MobileDrawer.tsx | 45 دقيقة | P2 |
| 4 | تقسيم InvoiceFormDialog.tsx | 45 دقيقة | P2 |
| 5 | تقسيم QuotationFormDialog.tsx | 45 دقيقة | P2 |
| 6 | إنشاء API_DOCUMENTATION.md | 30 دقيقة | P2 |
| 7 | إنشاء DATABASE_SCHEMA.md | 30 دقيقة | P2 |
| 8 | إنشاء DEPLOYMENT_GUIDE.md | 20 دقيقة | P2 |

**الإجمالي:** ~4.5 ساعة عمل

---

## الملفات المتأثرة

### ملفات سيتم تعديلها:
1. `src/lib/api/secureOperations.ts`
2. `src/components/layout/AppSidebar.tsx`
3. `src/components/layout/MobileDrawer.tsx`
4. `src/components/invoices/InvoiceFormDialog.tsx`
5. `src/components/quotations/QuotationFormDialog.tsx`
6. `.lovable/plan.md` (تحديث الحالة)

### ملفات جديدة:
1. `src/components/layout/sidebar/SidebarNavSections.tsx`
2. `src/components/layout/mobile/MobileDrawerHeader.tsx`
3. `src/components/layout/mobile/MobileNavSections.tsx`
4. `src/components/invoices/InvoiceFormHeader.tsx`
5. `src/components/invoices/InvoiceValidation.tsx`
6. `src/components/quotations/QuotationFormHeader.tsx`
7. `src/components/quotations/useQuotationItems.ts`
8. `docs/API_DOCUMENTATION.md`
9. `docs/DATABASE_SCHEMA.md`
10. `docs/DEPLOYMENT_GUIDE.md`

---

## معايير النجاح

| المعيار | الهدف |
|---------|-------|
| console.error في Production | 0 |
| error.message مكشوف | 0 |
| ملفات > 400 سطر | 0 |
| توثيق API | 100% |
| توثيق Database | 100% |
| توثيق Deployment | 100% |

---

## ملاحظات تقنية

### نمط تقسيم الملفات
```typescript
// الملف الرئيسي (بعد التقسيم)
import { SidebarNavSections } from './sidebar/SidebarNavSections';
import { SidebarHeader } from './sidebar';
import { SidebarFooter } from './sidebar';

export function AppSidebar() {
  // منطق الحالة فقط
  return (
    <aside>
      <SidebarHeader />
      <SidebarNavSections />
      <SidebarFooter />
    </aside>
  );
}
```

### نمط Hooks المنفصلة
```typescript
// useQuotationItems.ts
export function useQuotationItems(initialItems = []) {
  const [items, setItems] = useState(initialItems);
  
  const addItem = useCallback(() => {...}, []);
  const removeItem = useCallback((index) => {...}, []);
  const updateItem = useCallback((index, field, value) => {...}, []);
  const calculateTotals = useMemo(() => {...}, [items]);
  
  return { items, addItem, removeItem, updateItem, ...calculateTotals };
}
```
