
# خطة اختبار شاملة لنظام ERP
## Enterprise-Grade Testing Plan

---

## 📊 نظرة تحليلية على المشروع

### إحصائيات المشروع

| المقياس | القيمة | التعليق |
|---------|--------|---------|
| عدد الصفحات | 27 صفحة | تغطي جميع وحدات النظام |
| عدد المكونات | 100+ مكون | UI + Business Logic |
| عدد الـ Hooks | 28 hook | Custom React Hooks |
| جداول قاعدة البيانات | 43+ جدول | مع 118 سياسة RLS |
| ملفات الاختبار الحالية | 17 ملف | Unit + Integration + E2E |
| حالات الاختبار الحالية | 113 حالة | ~65% تغطية |
| عدد أسطر الكود | ~25,000 سطر | TypeScript + TSX |

### المشاكل المكتشفة حالياً

| المشكلة | الخطورة | الموقع |
|---------|---------|--------|
| forwardRef Warning | متوسطة | `SettingsPageSkeleton`, `MobileSettingsList` |
| Bank Accounts Exposure | عالية | RLS policy يسمح لجميع المستخدمين برؤية حسابات البنوك |

---

## 🏗️ هيكل خطة الاختبار

```text
┌─────────────────────────────────────────────────────────────┐
│                    خطة الاختبار الشاملة                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  المرحلة 1: اختبارات الوحدة (Unit Tests)                   │
│  ├── Hooks Testing                                          │
│  ├── Utilities Testing                                      │
│  └── Validations Testing                                    │
│                                                             │
│  المرحلة 2: اختبارات التكامل (Integration Tests)           │
│  ├── Data Flow Testing                                      │
│  ├── Component Integration                                  │
│  └── API Integration                                        │
│                                                             │
│  المرحلة 3: اختبارات الأمان (Security Tests)               │
│  ├── RLS Policy Testing                                     │
│  ├── Input Validation                                       │
│  ├── Authentication/Authorization                           │
│  └── Data Exposure Testing                                  │
│                                                             │
│  المرحلة 4: اختبارات الأداء (Performance Tests)            │
│  ├── Load Time Testing                                      │
│  ├── Response Time Testing                                  │
│  └── Memory/Resource Testing                                │
│                                                             │
│  المرحلة 5: اختبارات E2E (End-to-End Tests)                │
│  ├── User Journeys                                          │
│  ├── Business Workflows                                     │
│  └── Cross-Browser Testing                                  │
│                                                             │
│  المرحلة 6: اختبارات UX/UI                                  │
│  ├── Responsive Design                                      │
│  ├── RTL Layout                                             │
│  ├── Accessibility (A11y)                                   │
│  └── Mobile Experience                                      │
│                                                             │
│  المرحلة 7: اختبارات الوظائف المالية                        │
│  ├── Invoice Calculations                                   │
│  ├── Payment Processing                                     │
│  └── Financial Reports                                      │
│                                                             │
│  المرحلة 8: اختبارات التصدير والطباعة                       │
│  ├── PDF Generation                                         │
│  ├── Excel Export                                           │
│  └── Print Templates                                        │
│                                                             │
│  المرحلة 9: اختبارات PWA والعمل دون اتصال                  │
│  ├── Service Worker                                         │
│  ├── Offline Storage                                        │
│  └── Sync Queue                                             │
│                                                             │
│  المرحلة 10: اختبارات الروابط والتنقل                       │
│  ├── Route Testing                                          │
│  ├── Navigation Flow                                        │
│  └── Deep Linking                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 المرحلة 1: اختبارات الوحدة (Unit Tests)

### 1.1 اختبارات Hooks

#### Hooks المطلوب اختبارها

| Hook | الحالة الحالية | الاختبارات المطلوبة |
|------|----------------|---------------------|
| `useAuth` | ✅ مكتمل | 15 حالة |
| `usePermissions` | ✅ مكتمل | 12 حالة |
| `useUserPreferences` | ✅ مكتمل | 8 حالات |
| `useDashboardSettings` | ✅ موجود | التحقق من الاكتمال |
| `useFavoritePages` | ✅ موجود | التحقق من الاكتمال |
| `useTableFilter` | ✅ موجود | التحقق من الاكتمال |
| `useTableSort` | ✅ موجود | التحقق من الاكتمال |
| `useOnlineStatus` | ✅ موجود | التحقق من الاكتمال |
| `useDoubleTap` | ✅ موجود | التحقق من الاكتمال |
| `useLongPress` | ✅ موجود | التحقق من الاكتمال |
| `useOfflineData` | ⏳ مفقود | إنشاء جديد |
| `useOfflineSync` | ⏳ مفقود | إنشاء جديد |
| `useOfflineMutation` | ⏳ مفقود | إنشاء جديد |
| `useInfiniteScroll` | ⏳ مفقود | إنشاء جديد |
| `useVirtualList` | ⏳ مفقود | إنشاء جديد |
| `useSidebarCounts` | ⏳ مفقود | إنشاء جديد |
| `useSidebarOrder` | ⏳ مفقود | إنشاء جديد |
| `useKeyboardShortcuts` | ⏳ مفقود | إنشاء جديد |

#### حالات الاختبار المطلوبة لـ useOfflineData

```typescript
describe('useOfflineData', () => {
  it('should return cached data when offline');
  it('should sync data when online');
  it('should handle sync conflicts');
  it('should queue mutations when offline');
  it('should process queue when back online');
  it('should show sync status correctly');
  it('should handle IndexedDB errors gracefully');
});
```

### 1.2 اختبارات المكتبات (lib/)

| الملف | الحالة | الحالات المطلوبة |
|-------|--------|------------------|
| `utils.ts` | ✅ مكتمل | 12 حالة |
| `errorHandler.ts` | ✅ مكتمل | 10 حالات |
| `themeManager.ts` | ✅ مكتمل | 10 حالات |
| `validations.ts` | ✅ مكتمل | 13 حالة |
| `pdfGenerator.ts` | ⏳ مفقود | 8 حالات جديدة |
| `offlineStorage.ts` | ⏳ مفقود | 10 حالات جديدة |
| `syncManager.ts` | ⏳ مفقود | 8 حالات جديدة |
| `haptics.ts` | ⏳ مفقود | 4 حالات جديدة |
| `navigation.ts` | ⏳ مفقود | 5 حالات جديدة |

#### اختبارات pdfGenerator.ts الجديدة

```typescript
describe('pdfGenerator', () => {
  it('should generate PDF with Arabic text correctly');
  it('should include company header when enabled');
  it('should format numbers in Arabic locale');
  it('should handle RTL layout');
  it('should generate table with correct columns');
  it('should add page numbers to footer');
  it('should handle empty data gracefully');
  it('should apply custom colors from settings');
});
```

---

## 📋 المرحلة 2: اختبارات التكامل (Integration Tests)

### 2.1 سيناريوهات تدفق البيانات

| السيناريو | الوصف | الحالة |
|-----------|-------|--------|
| Customer → Invoice | إنشاء عميل ثم فاتورة له | ⏳ مطلوب |
| Quotation → Order → Invoice | تحويل العرض لأمر ثم فاتورة | ⏳ مطلوب |
| Product → Stock → Movement | إضافة منتج وتتبع المخزون | ⏳ مطلوب |
| Supplier → PO → Stock | أمر شراء واستلام المخزون | ⏳ مطلوب |
| Invoice → Payment → Balance | فاتورة ودفعات وتحديث الرصيد | ⏳ مطلوب |

### 2.2 ملفات الاختبار المطلوبة

```text
src/__tests__/integration/
├── customer-workflow.test.tsx     // جديد
├── sales-workflow.test.tsx        // جديد
├── inventory-workflow.test.tsx    // جديد
├── payment-workflow.test.tsx      // جديد
├── supplier-workflow.test.tsx     // جديد
├── business-logic.test.ts         // موجود
├── data-flow.test.tsx             // موجود
└── ui-interactions.test.tsx       // موجود
```

### 2.3 اختبار سير العمل الكامل

```typescript
describe('Sales Workflow Integration', () => {
  it('should create customer successfully');
  it('should create quotation for customer');
  it('should convert quotation to sales order');
  it('should create invoice from sales order');
  it('should record payment against invoice');
  it('should update customer balance after payment');
  it('should update stock after invoice confirmation');
  it('should track all movements in audit log');
});
```

---

## 📋 المرحلة 3: اختبارات الأمان (Security Tests)

### 3.1 مشاكل أمنية مكتشفة تحتاج إصلاح

| المشكلة | الخطورة | الحل المطلوب |
|---------|---------|--------------|
| Bank Accounts Exposure | 🔴 عالية | تقييد SELECT لـ admin و accountant فقط |
| forwardRef Warnings | 🟡 متوسطة | إضافة forwardRef للمكونات المتأثرة |

### 3.2 اختبارات RLS الشاملة

```typescript
describe('RLS Policy Security', () => {
  describe('bank_accounts table', () => {
    it('should deny SELECT for sales role');
    it('should deny SELECT for warehouse role');
    it('should allow SELECT for admin role');
    it('should allow SELECT for accountant role');
  });
  
  describe('customers table', () => {
    it('should allow admin full access');
    it('should allow sales full access');
    it('should allow accountant read access only');
    it('should deny warehouse any access');
  });
  
  describe('employees table', () => {
    it('should allow admin full access');
    it('should allow hr full access');
    it('should allow employee to view own record only');
  });
  
  describe('attachments table', () => {
    it('should enforce entity-type based access');
    it('should allow uploader to delete own files');
  });
});
```

### 3.3 اختبارات التحقق من المدخلات

| نوع الاختبار | الحالة | الملاحظات |
|--------------|--------|-----------|
| SQL Injection | ✅ موجود | في input-validation.test.ts |
| XSS Prevention | ✅ موجود | في input-validation.test.ts |
| Length Validation | ✅ موجود | في input-validation.test.ts |
| Numeric Validation | ✅ موجود | في input-validation.test.ts |
| Email/Phone Validation | ✅ موجود | في input-validation.test.ts |
| CSRF Protection | ⏳ مطلوب | إضافة اختبارات جديدة |
| Rate Limiting | ⏳ مطلوب | إضافة اختبارات جديدة |

### 3.4 ملف اختبار أمان جديد

```text
src/__tests__/security/
├── input-validation.test.ts    // موجود
├── rls-policies.test.ts        // جديد
├── auth-security.test.ts       // جديد
└── data-exposure.test.ts       // جديد
```

---

## 📋 المرحلة 4: اختبارات الأداء (Performance Tests)

### 4.1 مقاييس الأداء المستهدفة

| المقياس | الهدف | الأداة |
|---------|-------|--------|
| First Contentful Paint (FCP) | < 1.5s | Lighthouse |
| Time to Interactive (TTI) | < 3s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| API Response Time | < 500ms | Custom |
| Page Load Time | < 3s | Playwright |

### 4.2 اختبارات الأداء E2E

```typescript
describe('Performance Tests', () => {
  it('should load dashboard under 3 seconds');
  it('should render customer list with 1000 items smoothly');
  it('should filter data in under 200ms');
  it('should export PDF in under 5 seconds');
  it('should handle concurrent operations');
  it('should not leak memory on navigation');
});
```

### 4.3 اختبارات حجم الحزمة

| الحزمة | الحجم المستهدف | الحالة |
|--------|----------------|--------|
| Main Bundle | < 500KB gzipped | ⏳ للقياس |
| Vendor Bundle | < 300KB gzipped | ⏳ للقياس |
| Lazy Chunks | < 50KB each | ⏳ للقياس |

---

## 📋 المرحلة 5: اختبارات E2E (End-to-End)

### 5.1 رحلات المستخدم الكاملة

| الرحلة | الوصف | الحالة |
|--------|-------|--------|
| تسجيل مستخدم جديد | Signup → Email Confirm → Login | ✅ موجود |
| دورة العميل الكاملة | Create → Edit → Invoices → Payments | ⏳ مطلوب |
| دورة المبيعات | Quote → Order → Invoice → Payment | ⏳ مطلوب |
| دورة المشتريات | PO → Receive → Stock Update | ⏳ مطلوب |
| إدارة المخزون | Add Product → Stock → Transfer | ⏳ مطلوب |
| التقارير والتصدير | Generate → Filter → Export | ⏳ مطلوب |

### 5.2 ملفات E2E المطلوبة

```text
e2e/
├── auth.spec.ts              // موجود
├── navigation.spec.ts        // موجود
├── accessibility.spec.ts     // موجود
├── performance.spec.ts       // موجود
├── customer-journey.spec.ts  // جديد
├── sales-journey.spec.ts     // جديد
├── inventory-journey.spec.ts // جديد
├── reports-journey.spec.ts   // جديد
├── settings-journey.spec.ts  // جديد
└── mobile-journey.spec.ts    // جديد
```

### 5.3 اختبار رحلة المبيعات

```typescript
describe('Sales Journey E2E', () => {
  test('complete sales cycle', async ({ page }) => {
    // 1. Login as sales user
    await loginAs(page, 'sales@company.com');
    
    // 2. Create new customer
    await page.goto('/customers');
    await page.click('[data-testid="add-customer"]');
    await fillCustomerForm(page, testCustomer);
    await page.click('[data-testid="save-customer"]');
    
    // 3. Create quotation
    await page.goto('/quotations');
    await page.click('[data-testid="add-quotation"]');
    await selectCustomer(page, testCustomer.name);
    await addProducts(page, testProducts);
    await page.click('[data-testid="save-quotation"]');
    
    // 4. Convert to sales order
    await page.click('[data-testid="convert-to-order"]');
    await expect(page).toHaveURL(/sales-orders/);
    
    // 5. Create invoice
    await page.click('[data-testid="create-invoice"]');
    await expect(page).toHaveURL(/invoices/);
    
    // 6. Record payment
    await page.click('[data-testid="add-payment"]');
    await fillPaymentForm(page, { amount: 1000, method: 'cash' });
    await page.click('[data-testid="save-payment"]');
    
    // 7. Verify customer balance updated
    await page.goto('/customers');
    const balance = await page.textContent('[data-testid="customer-balance"]');
    expect(balance).toBe('0');
  });
});
```

---

## 📋 المرحلة 6: اختبارات UX/UI

### 6.1 اختبارات الاستجابة (Responsive)

| نقطة الكسر | العرض | الاختبارات |
|------------|-------|------------|
| Mobile S | 320px | Layout, Navigation, Forms |
| Mobile M | 375px | Layout, Navigation, Forms |
| Mobile L | 425px | Layout, Navigation, Forms |
| Tablet | 768px | Sidebar, Grid, Tables |
| Laptop | 1024px | Full features |
| Desktop | 1440px | Full features |

### 6.2 اختبارات RTL

```typescript
describe('RTL Layout Tests', () => {
  it('should display text right-to-left');
  it('should mirror icons correctly');
  it('should align form labels to the right');
  it('should position sidebar on the right');
  it('should handle bidirectional text (numbers in Arabic)');
  it('should maintain correct scroll direction');
});
```

### 6.3 اختبارات إمكانية الوصول (A11y)

| المعيار | المستوى | الحالة |
|---------|---------|--------|
| WCAG 2.1 Level A | Required | ✅ موجود |
| WCAG 2.1 Level AA | Recommended | ⏳ جزئي |
| Keyboard Navigation | Required | ✅ موجود |
| Screen Reader | Required | ⏳ مطلوب |
| Color Contrast | Required | ⏳ للفحص |

### 6.4 مشاكل UX مكتشفة

| المشكلة | الموقع | الحل |
|---------|--------|------|
| forwardRef warning | SettingsPageSkeleton | إضافة React.forwardRef |
| forwardRef warning | MobileSettingsList | إضافة React.forwardRef |

---

## 📋 المرحلة 7: اختبارات الوظائف المالية

### 7.1 اختبارات الحسابات

| العملية | الحالة | الملاحظات |
|---------|--------|-----------|
| حساب المجموع الفرعي | ✅ موجود | في business-logic.test.ts |
| حساب الخصم | ✅ موجود | في business-logic.test.ts |
| حساب الضريبة | ✅ موجود | في business-logic.test.ts |
| حساب الإجمالي | ✅ موجود | في business-logic.test.ts |
| حساب الرصيد المتبقي | ✅ موجود | في business-logic.test.ts |
| تحديث رصيد العميل | ⏳ مطلوب | اختبار تكامل |
| تحديث رصيد المورد | ⏳ مطلوب | اختبار تكامل |
| تقارب الأرقام العشرية | ⏳ مطلوب | دقة الحسابات |

### 7.2 اختبارات الدقة المالية

```typescript
describe('Financial Precision Tests', () => {
  it('should handle decimal precision correctly', () => {
    // 0.1 + 0.2 should equal 0.3 exactly
    const result = calculateTotal([
      { price: 0.1, quantity: 1 },
      { price: 0.2, quantity: 1 }
    ]);
    expect(result).toBe(0.3);
  });
  
  it('should round to 2 decimal places for currency');
  it('should handle very large amounts correctly');
  it('should prevent negative totals');
  it('should validate discount cannot exceed subtotal');
});
```

### 7.3 اختبارات حدود الأدوار

```typescript
describe('Role Limits Tests', () => {
  it('should prevent sales from exceeding max discount');
  it('should prevent exceeding customer credit limit');
  it('should prevent invoice amount over role limit');
  it('should allow admin to bypass all limits');
});
```

---

## 📋 المرحلة 8: اختبارات التصدير والطباعة

### 8.1 اختبارات تصدير PDF

| السيناريو | الحالة | الملاحظات |
|-----------|--------|-----------|
| تصدير فاتورة كـ PDF | ⏳ مطلوب | مع النص العربي |
| تصدير تقرير كـ PDF | ⏳ مطلوب | مع الجداول |
| تصدير عرض أسعار كـ PDF | ⏳ مطلوب | مع الشعار |
| تصدير أمر بيع كـ PDF | ⏳ مطلوب | مع التفاصيل |

### 8.2 اختبارات تصدير Excel

```typescript
describe('Excel Export Tests', () => {
  it('should export customers to Excel with all columns');
  it('should export with Arabic headers correctly');
  it('should respect column selection');
  it('should format dates correctly');
  it('should format numbers correctly');
  it('should handle empty data gracefully');
});
```

### 8.3 اختبارات الطباعة

```typescript
describe('Print Tests', () => {
  it('should render print template correctly');
  it('should include company header');
  it('should format invoice items in table');
  it('should show totals correctly');
  it('should hide screen-only elements');
  it('should respect page breaks');
});
```

---

## 📋 المرحلة 9: اختبارات PWA والعمل دون اتصال

### 9.1 اختبارات Service Worker

| السيناريو | الحالة | الملاحظات |
|-----------|--------|-----------|
| تسجيل SW | ⏳ مطلوب | عند بدء التشغيل |
| تخزين الأصول | ⏳ مطلوب | CSS, JS, Images |
| اعتراض الطلبات | ⏳ مطلوب | API Caching |
| تحديث SW | ⏳ مطلوب | Prompt User |

### 9.2 اختبارات التخزين المحلي

```typescript
describe('Offline Storage Tests', () => {
  it('should store customers in IndexedDB');
  it('should store products in IndexedDB');
  it('should store invoices in IndexedDB');
  it('should retrieve cached data when offline');
  it('should queue mutations when offline');
  it('should handle storage quota exceeded');
});
```

### 9.3 اختبارات المزامنة

```typescript
describe('Sync Tests', () => {
  it('should sync pending operations when online');
  it('should handle sync conflicts (server wins)');
  it('should notify user of sync status');
  it('should retry failed syncs');
  it('should maintain data integrity');
});
```

---

## 📋 المرحلة 10: اختبارات الروابط والتنقل

### 10.1 جميع مسارات التطبيق

| المسار | النوع | الحالة |
|--------|-------|--------|
| `/` | Dashboard | ⏳ للاختبار |
| `/auth` | Public | ✅ موجود |
| `/customers` | List | ⏳ للاختبار |
| `/customers/:id` | Detail | ⏳ للاختبار |
| `/products` | List | ⏳ للاختبار |
| `/products/:id` | Detail | ⏳ للاختبار |
| `/invoices` | List | ⏳ للاختبار |
| `/invoices/:id` | Detail | ⏳ للاختبار |
| `/quotations` | List | ⏳ للاختبار |
| `/quotations/:id` | Detail | ⏳ للاختبار |
| `/sales-orders` | List | ⏳ للاختبار |
| `/sales-orders/:id` | Detail | ⏳ للاختبار |
| `/purchase-orders` | List | ⏳ للاختبار |
| `/purchase-orders/:id` | Detail | ⏳ للاختبار |
| `/suppliers` | List | ⏳ للاختبار |
| `/suppliers/:id` | Detail | ⏳ للاختبار |
| `/inventory` | List | ⏳ للاختبار |
| `/treasury` | List | ⏳ للاختبار |
| `/treasury/:id` | Detail | ⏳ للاختبار |
| `/expenses` | List | ⏳ للاختبار |
| `/employees` | List | ⏳ للاختبار |
| `/employees/:id` | Detail | ⏳ للاختبار |
| `/reports` | Reports | ⏳ للاختبار |
| `/settings` | Settings | ⏳ للاختبار |
| `/admin/*` | Admin | ⏳ للاختبار |
| `/search` | Search | ⏳ للاختبار |
| `/notifications` | Notifications | ⏳ للاختبار |
| `/tasks` | Tasks | ⏳ للاختبار |
| `/*` (404) | Not Found | ✅ موجود |

### 10.2 اختبارات الروابط الداخلية

```typescript
describe('Internal Links Tests', () => {
  it('should navigate from customer to their invoices');
  it('should navigate from invoice to customer details');
  it('should navigate from product to stock movements');
  it('should navigate from order to related quotation');
  it('should handle back navigation correctly');
  it('should preserve filters on navigation');
  it('should handle deep links correctly');
});
```

### 10.3 اختبارات الـ Breadcrumbs

```typescript
describe('Breadcrumbs Tests', () => {
  it('should show correct path for nested pages');
  it('should be clickable for navigation');
  it('should update on route change');
  it('should truncate long paths on mobile');
});
```

---

## 🛠️ التنفيذ التقني

### الملفات الجديدة المطلوبة

```text
src/__tests__/
├── unit/
│   ├── hooks/
│   │   ├── useOfflineData.test.ts        // جديد
│   │   ├── useOfflineSync.test.ts        // جديد
│   │   ├── useInfiniteScroll.test.ts     // جديد
│   │   ├── useVirtualList.test.ts        // جديد
│   │   ├── useSidebarCounts.test.ts      // جديد
│   │   └── useKeyboardShortcuts.test.ts  // جديد
│   └── lib/
│       ├── pdfGenerator.test.ts          // جديد
│       ├── offlineStorage.test.ts        // جديد
│       └── syncManager.test.ts           // جديد
├── integration/
│   ├── customer-workflow.test.tsx        // جديد
│   ├── sales-workflow.test.tsx           // جديد
│   ├── inventory-workflow.test.tsx       // جديد
│   └── payment-workflow.test.tsx         // جديد
└── security/
    ├── rls-policies.test.ts              // جديد
    └── data-exposure.test.ts             // جديد

e2e/
├── customer-journey.spec.ts              // جديد
├── sales-journey.spec.ts                 // جديد
├── inventory-journey.spec.ts             // جديد
├── reports-journey.spec.ts               // جديد
└── mobile-journey.spec.ts                // جديد
```

### إصلاحات مطلوبة

1. **إصلاح RLS لـ bank_accounts**:
```sql
DROP POLICY "Authenticated can view bank accounts" ON public.bank_accounts;

CREATE POLICY "Financial staff can view bank accounts"
ON public.bank_accounts FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'accountant'::app_role)
);
```

2. **إصلاح forwardRef warnings**:
   - إضافة `React.forwardRef` لمكون `SettingsPageSkeleton`
   - إضافة `React.forwardRef` لمكون `MobileSettingsList`

---

## 📊 ملخص التغطية المستهدفة

| نوع الاختبار | الحالي | المستهدف |
|--------------|--------|----------|
| Unit Tests | 65% | 90% |
| Integration Tests | 40% | 80% |
| E2E Tests | 30% | 70% |
| Security Tests | 100% | 100% |
| Performance Tests | 20% | 60% |
| A11y Tests | 50% | 80% |

### عدد الاختبارات المتوقع

| النوع | الحالي | الإضافات | الإجمالي |
|-------|--------|----------|----------|
| Unit | 80 | +45 | 125 |
| Integration | 15 | +35 | 50 |
| E2E | 15 | +25 | 40 |
| Security | 8 | +20 | 28 |
| **الإجمالي** | **118** | **+125** | **243** |

---

## 🗓️ جدول التنفيذ المقترح

| المرحلة | المدة | الأولوية |
|---------|-------|----------|
| إصلاح مشاكل الأمان | 1 يوم | P0 |
| اختبارات Hooks المفقودة | 2 يوم | P1 |
| اختبارات lib المفقودة | 1 يوم | P1 |
| اختبارات التكامل | 3 أيام | P1 |
| اختبارات E2E | 3 أيام | P2 |
| اختبارات الأداء | 1 يوم | P2 |
| اختبارات PWA | 2 يوم | P2 |
| اختبارات UX/UI | 2 يوم | P3 |

**إجمالي الوقت المقدر**: 15 يوم عمل
