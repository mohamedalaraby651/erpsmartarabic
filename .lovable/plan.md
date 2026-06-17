# خارطة الطريق - المرحلة القادمة

## المرحلة 1: إكمال حالات الخطأ/الفراغ (ListErrorState + EmptyState)

استمراراً للنمط المطبّق على الصفحات السابقة (Quotes, SalesOrders, CreditNotes, Expenses, Inventory, Products...):

**الجولة A — المخازن والمنتجات:**
- `WarehousesPage` - عرض/إنشاء/تعديل المستودعات
- `CategoriesPage` - تصنيفات المنتجات
- `ExpenseCategoriesPage` - تصنيفات المصروفات
- `StockMovementsPage` - حركات المخزون

**الجولة B — العمليات والموافقات:**
- `ApprovalsPage` - قائمة طلبات الموافقة
- `TasksPage` - المهام
- `RemindersPage` - التذكيرات
- `ActivityLogsPage` - سجل النشاط

**الجولة C — الموردين والعملاء:**
- `SuppliersPage` (إن لم تكتمل)
- `CustomersPage` (إن لم تكتمل)
- `CustomerStatementPage`
- `SupplierStatementPage`

**الجولة D — المحاسبة والتقارير:**
- `JournalEntriesPage`
- `ChartOfAccountsPage`
- `FiscalPeriodsPage`
- `ReportsOverviewPage`

لكل صفحة:
1. كشف `error`/`refetch` من الـ hooks.
2. إضافة `<ListErrorState onRetry={refetch} />` قبل فروع mobile/desktop.
3. تمييز "لا نتائج بحث" عن "لا بيانات" عبر `EmptyState` ذكي مع أزرار: مسح الفلاتر / إنشاء جديد.

## المرحلة 2: مراجعة وتدقيق الأمان

- تشغيل `security--run_security_scan` ومعالجة أي اكتشافات جديدة.
- مراجعة الـ RLS على الجداول المضافة حديثاً (logistics, accounting posting, credit notes reverse).
- التأكد من وجود `GRANT` لكل جدول عام جديد.
- التحقق من عدم تسرّب أعمدة حساسة في الـ views.

## المرحلة 3: جودة وأداء قاعدة البيانات

- `supabase--linter` ومعالجة التحذيرات.
- `supabase--slow_queries` وإضافة فهارس عند الحاجة.
- مراجعة الـ Materialized Views والتأكد من جدولة `pg_cron` للتحديث.
- التحقق من سلامة triggers الحذف المالي (reversal).

## المرحلة 4: اختبارات شاملة

- تشغيل `bunx vitest run` بعد كل جولة.
- إضافة اختبارات للحالات الجديدة: error state, empty-with-filter, empty-no-data.
- اختبار تفاعلي عبر `browser--view_preview` للصفحات الحرجة (RTL + Mobile 393px).

## المرحلة 5: تحسينات UX إضافية

- توحيد `ListErrorState`/`EmptyState` كنمط رسمي عبر توثيق قصير في `mem://`.
- مراجعة 44px touch targets على الصفحات المحدّثة.
- التأكد من سلوك RTL والـ bidi sanitization في حقول البحث الجديدة.

## التفاصيل التقنية

- النمط الموحد: `const { data, isLoading, error, refetch } = useQuery(...)`.
- شرط العرض: `if (error) return <ListErrorState onRetry={refetch} />;`
- `EmptyState` يفرّق عبر `searchQuery.trim().length > 0 ? "no-results" : "no-data"`.
- لا تغييرات على منطق الأعمال - فقط طبقة العرض.

## معايير الإنجاز

- ✅ جميع صفحات القوائم تعرض حالة خطأ قابلة لإعادة المحاولة.
- ✅ تمييز واضح بين فراغ البحث وفراغ البيانات.
- ✅ 1187/1187 اختبار يمر.
- ✅ صفر اكتشافات أمنية بمستوى error.
- ✅ صفر تحذيرات linter حرجة.

هل أبدأ بالجولة A (المخازن والمنتجات) فور الموافقة؟