

# تقرير شامل: التطويرات المتبقية لقسم العملاء

---

## ملخص الوضع الحالي

قسم العملاء يحتوي حالياً على **912 سطر** في صفحة القائمة و**817 سطر** في صفحة التفاصيل، مع منظومة متكاملة تشمل: Server Pagination, Lazy Loading Tabs, Optimistic Updates, Search Preview, Grid/Table Toggle, Bulk Actions, Prefetch on Hover, SwipeableRow, Timeline Communication Log, Aging Report, DSO/CLV KPIs, Reminders, وغيرها.

---

## التطويرات المتبقية مقسمة حسب الفئة

### أ. جودة الكود والبنية (Code Quality)

#### 1. تقسيم CustomersPage.tsx (912 سطر → ~300 سطر رئيسي)
**المشكلة:** الملف تجاوز 900 سطر مما يصعّب الصيانة ويخالف نمط المشروع (max 500 سطر).
**الحل:**
- استخراج `useCustomerQueries(filters, pagination)` → hook مستقل يحتوي كل استعلامات React Query (count, data, stats, mutations)
- استخراج `useCustomerFilters()` → hook للفلاتر وحالاتها (type, vip, governorate, status, search, temp states)
- استخراج `useBulkSelection(data)` → hook للتحديد الجماعي (selectedIds, toggle, selectAll)
- استخراج `CustomerTableView`, `CustomerMobileView`, `CustomerGridView` → مكونات عرض منفصلة
- استخراج `CustomerStatsBar` → مكون الإحصاءات
- استخراج `CustomerFiltersBar` → مكون الفلاتر

#### 2. تقسيم CustomerDetailsPage.tsx (817 سطر)
**المشكلة:** نفس المشكلة - ملف ضخم.
**الحل:**
- استخراج `useCustomerDetail(id)` → hook يحتوي كل الاستعلامات والحسابات (DSO, CLV, paymentRatio)
- استخراج `CustomerHeroHeader` → مكون الهيدر مع الصورة وأزرار الاتصال
- استخراج `CustomerStatsGrid` → بطاقات الإحصاءات الثمانية
- استخراج `CustomerTabContent` → مكون يغلف كل TabsContent بمنطق موحد

#### 3. إزالة التكرار (DRY)
**المشكلة:** `vipColors`, `vipLabels`, `typeLabels` مكررة في 4 ملفات (CustomersPage, CustomerDetailsPage, CustomerGridCard, أخرى).
**الحل:** إنشاء `src/lib/customerConstants.ts` يحتوي كل الثوابت المشتركة.

#### 4. حساب DSO غير دقيق
**المشكلة:** DSO الحالي يحسب الفرق بين `created_at` و `due_date` - وهذا تاريخ الاستحقاق وليس تاريخ السداد الفعلي. الصحيح هو الفرق بين إنشاء الفاتورة وتاريخ آخر دفعة عليها.
**الحل:** ربط الفواتير بالمدفوعات لحساب DSO الحقيقي، أو إنشاء RPC مخصص.

---

### ب. الأداء والتحسينات التقنية

#### 5. Server-Side Sorting
**المشكلة:** الفرز حالياً client-side على الصفحة الحالية فقط (25 عنصر) - الفرز لا يشمل كل البيانات.
**الحل:** نقل الفرز إلى استعلام Supabase `.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' })` وإضافة `sortConfig` إلى `queryKey`.

#### 6. Infinite Scroll بديل للـ Pagination على الموبايل
**المشكلة:** Pagination تقليدي على الموبايل ليس مثالياً - المستخدم يفضل التمرير المستمر.
**الحل:** استخدام `useInfiniteQuery` من React Query مع `IntersectionObserver` لتحميل الصفحة التالية تلقائياً عند الوصول لنهاية القائمة. الحفاظ على Pagination للديسكتوب.

#### 7. تخزين مؤقت للفلاتر (Filter Persistence)
**المشكلة:** الفلاتر تُفقد عند العودة من صفحة التفاصيل.
**الحل:** حفظ الفلاتر في `searchParams` (URL) بدلاً من `useState` المحلي. هذا يحافظ على الفلاتر عند التنقل ويسمح بمشاركة الروابط مع الفلاتر.

#### 8. React.memo للمكونات المتكررة
**المشكلة:** `renderCustomerCard` يُعاد رسمه لكل العناصر عند أي تغيير في الحالة.
**الحل:** تحويل `CustomerMobileCard` و `CustomerGridCard` إلى مكونات `React.memo` مع `areEqual` مخصص يقارن فقط الحقول المعروضة.

---

### ج. تحسينات واجهة المستخدم

#### 9. Keyboard Navigation في الجدول
**المشكلة:** لا يمكن التنقل بين الصفوف باستخدام لوحة المفاتيح.
**الحل:** إضافة `focusedRowIndex` مع Arrow Up/Down للتنقل، Enter لفتح التفاصيل، Space للتحديد، Delete للحذف. تكامل مع `useKeyboardShortcuts` الموجود.

#### 10. Skeleton محسّن للـ Grid View
**المشكلة:** عند التحميل في وضع Grid يظهر `TableSkeleton` وهو غير مناسب بصرياً.
**الحل:** إنشاء `GridSkeleton` يعرض بطاقات وهمية بنفس شكل `CustomerGridCard`.

#### 11. تحسين Dark Mode
**المشكلة:** بعض الألوان الثابتة لا تتكيف مع الوضع الداكن (مثل `text-emerald-600` بدون `dark:` variant في بعض الأماكن، و `bg-emerald-50` في `CustomerFinancialSummary`).
**الحل:** مراجعة شاملة واستبدال كل لون ثابت بنسخة تدعم `dark:`.

#### 12. Empty State محسّن
**المشكلة:** حالة "لا يوجد عملاء" الحالية بسيطة جداً.
**الحل:** إضافة illustration SVG، واقتراحات (استيراد من Excel، إضافة يدوي)، وروابط مباشرة.

---

### د. وظائف جديدة

#### 13. مقارنة العملاء (Customer Comparison)
**الوصف:** اختيار 2-4 عملاء من القائمة (عبر Bulk Selection الموجود) ثم الضغط على "مقارنة" لعرض جدول مقارنة يشمل: إجمالي المشتريات، عدد الفواتير، متوسط الفاتورة، نسبة السداد، DSO، مستوى VIP.
**المكون الجديد:** `CustomerComparisonDialog.tsx`

#### 14. كشف المكررين التلقائي (Duplicate Detection)
**الوصف:** زر "كشف المكررين" يبحث عن عملاء بأسماء متشابهة (Levenshtein distance) أو أرقام هواتف مطابقة، ويعرض قائمة بالمرشحين للدمج مع نسبة التشابه.
**التنفيذ:** RPC function في Postgres تستخدم `similarity()` من امتداد `pg_trgm`.

#### 15. تصدير الملف الشخصي كاملاً (Full Profile PDF)
**الوصف:** زر في صفحة التفاصيل يولّد PDF يتضمن: بيانات العميل، الصورة، الملخص المالي، أعمار الديون، آخر 10 فواتير، سجل التواصل.
**التنفيذ:** توسيع `pdfGenerator.ts` بقالب `customer-profile`.

#### 16. Bulk VIP Update
**المشكلة:** Bulk Actions الحالية تدعم الحذف فقط.
**الحل:** إضافة أزرار: تغيير مستوى VIP، تغيير الحالة (نشط/غير نشط)، تصدير المحدد فقط.

---

### هـ. بيانات وتقارير

#### 17. مؤشر النمو الشهري (Growth Trend)
**المشكلة:** بطاقة "إجمالي المشتريات" لا تعرض اتجاه النمو.
**الحل:** مقارنة مشتريات آخر 30 يوم بالـ 30 يوم السابقة وعرض سهم (أعلى/أسفل) مع النسبة المئوية.

#### 18. معدل الاحتفاظ (Retention Rate) في الإحصاءات العامة
**الوصف:** إضافة بطاقة في `CustomersPage` تعرض نسبة العملاء الذين اشتروا في آخر 90 يوم من إجمالي العملاء.
**التنفيذ:** إضافة حقل `retention_rate` في RPC `get_customer_stats`.

---

## ترتيب الأولويات

| المرحلة | التطويرات | الأثر |
|---------|-----------|-------|
| **عاجل (جودة الكود)** | #1 تقسيم CustomersPage, #2 تقسيم CustomerDetailsPage, #3 DRY constants | صيانة أسهل، منع أخطاء |
| **مهم (أداء)** | #5 Server-Side Sort, #7 Filter Persistence, #8 React.memo | تحسين الأداء والتجربة |
| **متوسط (UX)** | #6 Infinite Scroll Mobile, #9 Keyboard Nav, #16 Bulk VIP | تجربة استخدام أفضل |
| **تحسيني (وظائف)** | #13 مقارنة, #14 كشف مكررين, #15 PDF Profile | ميزات متقدمة |
| **مستقبلي** | #4 DSO دقيق, #17 Growth Trend, #18 Retention Rate | تحليلات أعمق |

---

## التفاصيل التقنية

**هيكل الملفات المقترح بعد التقسيم:**
```text
src/pages/customers/
├── CustomersPage.tsx          (~300 سطر - التجميع فقط)
├── CustomerDetailsPage.tsx    (~250 سطر - التجميع فقط)

src/hooks/customers/
├── useCustomerQueries.ts      (استعلامات القائمة + mutations)
├── useCustomerDetail.ts       (استعلامات التفاصيل + حسابات)
├── useCustomerFilters.ts      (حالة الفلاتر + URL sync)
├── useBulkSelection.ts        (التحديد الجماعي)

src/components/customers/
├── CustomerTableView.tsx      (عرض الجدول)
├── CustomerMobileView.tsx     (عرض الموبايل)
├── CustomerGridView.tsx       (عرض البطاقات)
├── CustomerStatsBar.tsx       (بطاقات الإحصاءات)
├── CustomerFiltersBar.tsx     (شريط الفلاتر)
├── CustomerHeroHeader.tsx     (هيدر التفاصيل)
├── CustomerStatsGrid.tsx      (إحصاءات التفاصيل)
├── CustomerComparisonDialog.tsx (مقارنة - جديد)

src/lib/
├── customerConstants.ts       (ثوابت مشتركة)
```

**أنماط الكود المستخدمة:**
- Custom Hooks لفصل المنطق عن العرض
- React.memo مع areEqual مخصص للمكونات المتكررة
- URL-based state للفلاتر (searchParams)
- Composition pattern للصفحات الرئيسية

