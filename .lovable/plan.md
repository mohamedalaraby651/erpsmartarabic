
# خطة تشغيل الاختبارات وإكمال المشروع

## الحالة الحالية

### ملفات الاختبار الموجودة

| النوع | العدد | الملفات |
|-------|-------|---------|
| **Unit Tests - Hooks** | 16 ملف | useAuth, usePermissions, useUserPreferences, useDashboardSettings, useFavoritePages, useTableFilter, useTableSort, useOnlineStatus, useDoubleTap, useLongPress, useOfflineData, useOfflineSync, useInfiniteScroll, useVirtualList, useSidebarCounts, useKeyboardShortcuts |
| **Unit Tests - Lib** | 6 ملفات | utils, errorHandler, themeManager, validations, offlineStorage, syncManager |
| **Integration Tests** | 11 ملف | business-logic, customer-workflow, data-flow, export-print, financial-calculations, inventory-workflow, navigation-routes, payment-workflow, pwa-offline, sales-workflow, ui-interactions |
| **Security Tests** | 3 ملفات | input-validation, rls-policies, data-exposure |
| **E2E Tests** | 12 ملف | accessibility, auth, customer-journey, inventory-journey, mobile-journey, navigation, performance, reports-journey, responsive-design, rtl-layout, sales-journey, settings-journey |
| **الإجمالي** | **48 ملف** | ~450+ حالة اختبار |

### مشاكل مكتشفة تحتاج إصلاح

1. **تحذير forwardRef في ShimmerSkeleton** - يظهر في Console
2. **تأكيد Migration لـ bank_accounts RLS** - بانتظار الموافقة

---

## المرحلة 1: إصلاح تحذير forwardRef

### الملفات المتأثرة:
- `src/components/shared/ShimmerSkeleton.tsx`

### المشكلة:
المكون `ShimmerSkeleton` يُستخدم كـ child لمكونات قد تحاول تمرير `ref` إليه، لكنه لا يدعم `forwardRef`.

### الحل:
```typescript
// تحويل المكون لاستخدام forwardRef
const ShimmerSkeleton = React.forwardRef<HTMLDivElement, ShimmerSkeletonProps>(
  ({ className, variant, width, height, lines }, ref) => {
    // ... نفس الكود الحالي
    return <div ref={ref} ... />
  }
);
ShimmerSkeleton.displayName = 'ShimmerSkeleton';
```

### المكونات المشتقة التي تحتاج تحديث:
- `ShimmerCardSkeleton`
- `ShimmerListSkeleton`
- `ShimmerStatsSkeleton`
- `ShimmerDetailSkeleton`

---

## المرحلة 2: تشغيل اختبارات Vitest

### الاختبارات المتوقع تشغيلها:

```text
src/__tests__/
├── unit/
│   ├── hooks/ (16 ملف)
│   │   ├── useAuth.test.tsx         ✓
│   │   ├── usePermissions.test.tsx  ✓
│   │   ├── useOfflineData.test.ts   ✓
│   │   └── ... (13 أخرى)
│   └── lib/ (6 ملفات)
│       ├── utils.test.ts            ✓
│       ├── errorHandler.test.ts     ✓
│       └── ... (4 أخرى)
├── integration/ (11 ملف)
│   ├── business-logic.test.ts       ✓
│   ├── sales-workflow.test.tsx      ✓
│   └── ... (9 أخرى)
└── security/ (3 ملفات)
    ├── input-validation.test.ts     ✓
    ├── rls-policies.test.ts         ✓
    └── data-exposure.test.ts        ✓
```

### الأمر المستخدم:
```bash
npm run test
# أو
vitest run
```

---

## المرحلة 3: التحقق من نتائج الاختبارات

### المقاييس المتوقعة:

| المقياس | الهدف |
|---------|-------|
| Unit Tests Pass Rate | 100% |
| Integration Tests Pass Rate | 100% |
| Security Tests Pass Rate | 100% |
| Total Test Cases | ~450+ |
| Code Coverage | 85%+ |

### نوعية الاختبارات المنفذة:

**اختبارات Unit:**
- تحميل البيانات المخزنة محلياً
- مزامنة البيانات عند عودة الاتصال
- التعامل مع أخطاء IndexedDB
- Keyboard shortcuts
- Infinite scrolling
- Virtual lists

**اختبارات Integration:**
- سير عمل العملاء الكامل
- سير عمل المبيعات (Quote → Order → Invoice → Payment)
- سير عمل المخزون
- الحسابات المالية ودقة الأرقام العشرية
- التصدير والطباعة (PDF/Excel)
- PWA والعمل دون اتصال

**اختبارات Security:**
- RLS Policies لـ 15+ جدول
- Input Validation (SQL Injection, XSS)
- Data Exposure Prevention
- Role-based Access Control

---

## المرحلة 4: إصلاح أي اختبارات فاشلة

### سيناريوهات محتملة:

| السيناريو | الإجراء |
|-----------|---------|
| خطأ في Mock | تحديث Mock functions |
| خطأ في Type | إضافة Type assertions |
| خطأ في Async | إضافة waitFor/act |
| خطأ في Import | تصحيح المسارات |

---

## المرحلة 5: تأكيد Migration الأمان

### الـ Migration المعلق:
```sql
-- إصلاح RLS لـ bank_accounts
-- تقييد الوصول لـ admin و accountant فقط
DROP POLICY "Authenticated can view bank accounts" ON public.bank_accounts;

CREATE POLICY "Financial staff can view bank accounts"
ON public.bank_accounts FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'accountant'::app_role)
);
```

هذا يحمي البيانات المالية الحساسة من الوصول غير المصرح.

---

## ملخص المهام

| # | المهمة | الأولوية | الحالة |
|---|--------|----------|--------|
| 1 | إصلاح forwardRef في ShimmerSkeleton | P0 | ⏳ |
| 2 | تشغيل اختبارات Vitest | P0 | ⏳ |
| 3 | إصلاح أي اختبارات فاشلة | P0 | ⏳ |
| 4 | تأكيد Migration bank_accounts | P0 | ⏳ بانتظار موافقة |
| 5 | توثيق نتائج الاختبارات | P1 | ⏳ |

---

## النتائج المتوقعة بعد الإكمال

```text
✅ 48 ملف اختبار يعمل بنجاح
✅ ~450+ حالة اختبار تمر بنجاح
✅ تغطية كود 85%+
✅ إصلاح تحذير forwardRef
✅ تأمين جدول bank_accounts
✅ لا أخطاء في Console
```

---

## الخطوة التالية

سأبدأ بـ:
1. إصلاح تحذير forwardRef في ShimmerSkeleton
2. تشغيل الاختبارات والتحقق من نتائجها
3. إصلاح أي مشاكل مكتشفة
