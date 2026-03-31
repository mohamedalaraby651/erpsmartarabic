

# مراجعة التنفيذ — المشاكل والنواقص المكتشفة

## مشاكل حرجة

### 1. `useLongPress` يمنع التمرير على الموبايل
في `src/hooks/useLongPress.ts` سطر 24، يتم استدعاء `e.preventDefault()` على `onTouchStart` مما يمنع التمرير (scroll) تماماً على البطاقات. هذا يجعل القائمة غير قابلة للتمرير على الموبايل.

**الحل:** إزالة `e.preventDefault()` واستخدام نهج مختلف — تتبع حركة اللمس وإلغاء الضغط المطول إذا تحرك الإصبع (touchmove threshold).

### 2. Quick Filter لا يعيد ضبط الفلاتر الأخرى
في `handleQuickFilter` عند الضغط على chip مثل "شركات"، يتم تعيين `typeFilter` لكن لا يتم إعادة ضبط `statusFilter` و `vipFilter`. فإذا ضغط المستخدم "نشط" ثم "شركات"، ستبقى فلترة "نشط" نشطة مع "شركات" معاً.

**الحل:** إعادة ضبط جميع الفلاتر قبل تطبيق الفلتر الجديد في كل حالة.

### 3. فلتر VIP يعرض فقط "gold"
عند الضغط على chip "VIP"، يتم `setVipFilter('gold')` مما يستبعد عملاء Silver و Platinum.

**الحل:** استخدام قيمة فلتر تشمل جميع مستويات VIP (غير regular)، أو إنشاء فلتر خاص.

## نواقص في التنفيذ (مقارنة بالخطة)

### 4. `CustomerGridCard` لم يُحسَّن
الخطة تطلب: تدرج خلفية، Avatar مربع مدور، إطار VIP ملون، `opacity-60` لغير النشط، `getBalanceColor`. لم يتم تطبيق أي من هذه التحسينات.

**الحل:** تحديث `CustomerGridCard` لاستخدام `shape="rounded-square"` و `vipBorder` و gradient background و opacity للغير نشط.

### 5. البحث لا يختفي عند التمرير
الخطة تطلب إخفاء شريط البحث عند التمرير لأسفل. لم يتم تنفيذه.

**الحل:** إضافة scroll listener أو IntersectionObserver على `CustomerFiltersBar` لإخفائه عند التمرير.

### 6. لا يوجد dropdown ترتيب على الموبايل
الخطة تطلب dropdown للترتيب على الموبايل (اسم، رصيد، تاريخ إضافة، آخر نشاط). لم يتم تنفيذه.

**الحل:** إضافة dropdown ترتيب بجانب زر تبديل العرض في `CustomerMobileView`.

### 7. عدد "مدين" في chips ثابت على 0
في `CustomerStatsBar` سطر 34: `count: 0` مع تعليق "Will be enhanced later".

**الحل:** حساب عدد العملاء المدينين من `stats` أو إضافة حقل `debtors` للإحصاءات.

## ملخص الإجراءات

| # | الملف | الإصلاح |
|---|---|---|
| 1 | `src/hooks/useLongPress.ts` | إزالة preventDefault + إضافة touchmove threshold |
| 2 | `src/pages/customers/CustomersPage.tsx` | إعادة ضبط كل الفلاتر عند تغيير quick filter |
| 3 | `src/pages/customers/CustomersPage.tsx` | فلتر VIP يشمل جميع المستويات |
| 4 | `src/components/customers/CustomerGridCard.tsx` | تدرج + مربع مدور + VIP + opacity + getBalanceColor |
| 5 | `src/pages/customers/CustomersPage.tsx` | إخفاء البحث عند التمرير (موبايل) |
| 6 | `src/components/customers/CustomerMobileView.tsx` | إضافة dropdown ترتيب |
| 7 | `src/components/customers/CustomerStatsBar.tsx` | حساب عدد المدينين |

