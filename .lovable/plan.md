

# خطة التنفيذ - المرحلة التالية لقسم العملاء

## ما تم إنجازه بالفعل
Lazy Loading, Optimistic Updates, Server-side Stats RPC, Search Preview, Tab Grouping, Timeline, Reminders, CustomerAvatar, SwipeableRow, Enhanced Mobile Cards

## المرحلة التالية - 6 تطويرات

### 1. Quick Actions من قائمة العملاء (#2)
**الملف:** `src/pages/customers/CustomersPage.tsx`
- إضافة أزرار سريعة في `DataTableActions`: فاتورة جديدة، واتساب
- إضافة نفس الأزرار في `SwipeableRow` للموبايل (swipe left → فاتورة جديدة)
- Navigation مع `state: { prefillCustomerId }` لتعبئة العميل تلقائياً

### 2. Prefetch عند Hover (#11)
**الملف:** `src/pages/customers/CustomersPage.tsx`
- إضافة `onMouseEnter` على كل `TableRow` مع `setTimeout(200ms)`
- استدعاء `queryClient.prefetchQuery` لبيانات العميل الأساسية + العناوين
- تحميل فوري عند فتح صفحة التفاصيل

### 3. Card Grid View على الديسكتوب (#3)
**الملفات:** `src/pages/customers/CustomersPage.tsx` + مكون جديد `src/components/customers/CustomerGridCard.tsx`
- زر تبديل (Table/Grid) بجوار عنوان القائمة
- عرض بطاقات بـ 3-4 أعمدة مع الصورة والاسم والرصيد و VIP
- استخدام `useResponsiveView` الموجود مع إضافة `grid` mode
- حفظ التفضيل في localStorage

### 4. Bulk Actions (#4)
**الملف:** `src/pages/customers/CustomersPage.tsx`
- إضافة `useState<Set<string>>` لتتبع التحديدات
- Checkbox في رأس الجدول (تحديد الكل) وفي كل صف
- شريط إجراءات جماعي يظهر عند التحديد: حذف، تغيير VIP، تغيير الحالة، تصدير المحدد
- Batch mutations مع confirmation dialog

### 5. تقرير أعمار الديون للعميل (#19)
**الملف:** `src/pages/customers/CustomerDetailsPage.tsx`
- إضافة تبويب "أعمار الديون" ضمن مجموعة "المالي"
- حساب من الفواتير غير المدفوعة: 0-30، 31-60، 61-90، 90+ يوم
- عرض كأشرطة أفقية ملونة (أخضر → أحمر) مع المبالغ
- بدون استعلامات إضافية - يستخدم بيانات الفواتير الموجودة (lazy loaded)

### 6. مؤشرات أداء متقدمة في الهيدر (#21)
**الملف:** `src/pages/customers/CustomerDetailsPage.tsx`
- إضافة بطاقة **أيام متوسط السداد (DSO)**: حساب من الفواتير والمدفوعات
- إضافة **مؤشر اتجاه** (سهم أعلى/أسفل) مقارنة بالشهر السابق في بطاقة المشتريات
- إضافة بطاقة **قيمة العميل مدى الحياة (CLV)**: إجمالي المشتريات منذ أول فاتورة
- كل الحسابات client-side من البيانات المتاحة

---

## الملفات المتأثرة

| # | الملف | التغيير |
|---|-------|---------|
| 1 | `src/pages/customers/CustomersPage.tsx` | Quick Actions + Prefetch + Grid toggle + Bulk Actions |
| 2 | `src/components/customers/CustomerGridCard.tsx` | **جديد** - بطاقة عرض Grid |
| 3 | `src/pages/customers/CustomerDetailsPage.tsx` | Aging tab + KPIs محسنة |

## ترتيب التنفيذ
1. Quick Actions + Prefetch (تحسين سرعة العمل اليومي)
2. Card Grid View (مرونة العرض)
3. Bulk Actions (إدارة جماعية)
4. Aging Report + KPIs (تحليلات مالية)

