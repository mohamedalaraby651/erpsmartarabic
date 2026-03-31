

# خطة إصلاح أخطاء التحميل الديناميكي بعد إعادة الهيكلة

## المشكلة
خطأ `Failed to fetch dynamically imported module` يظهر عند محاولة تحميل `CustomerDetailsPage`. السبب الجذري هو أن Vite يحتفظ بـ module graph قديم بعد نقل عشرات الملفات دفعة واحدة. حتى بعد تحويل `CustomerDetailsPage` لاستيراد ثابت، الملف نفسه يحتوي على `lazy()` imports داخلية (tabs, charts, details) قد تفشل أيضاً.

## الحل

### الخطوة 1: تحويل `CustomersPage` لاستيراد ثابت أيضاً
`CustomersPage` لا يزال lazy في App.tsx ويستورد من المسارات الجديدة - نفس المشكلة المحتملة.

### الخطوة 2: تنظيف وإعادة بناء كاملة
- حذف `node_modules/.vite` و `dist` بالكامل
- إعادة تشغيل dev server لبناء module graph جديد

### الخطوة 3: إزالة `// rebuild-trigger` من `CustomerDetailsPage.tsx`
تنظيف التعليق المؤقت الذي أُضيف سابقاً.

---

## التفاصيل التقنية

**الملفات المتأثرة:**

| الملف | التغيير |
|-------|---------|
| `src/App.tsx` | تحويل `CustomersPage` من `lazy` لاستيراد ثابت (مثل `CustomerDetailsPage`) |
| `src/pages/customers/CustomerDetailsPage.tsx` | إزالة `// rebuild-trigger` |

**التحقق بعد الإصلاح:**
- فتح صفحة قائمة العملاء `/customers`
- فتح تفاصيل عميل `/customers/:id`
- التأكد من تحميل جميع التبويبات (الفواتير، المدفوعات، النشاط...)

> **ملاحظة:** جميع الاستيرادات الداخلية تم التحقق منها وهي صحيحة - لا توجد مسارات قديمة متبقية. المشكلة محصورة في cache الـ dev server.

