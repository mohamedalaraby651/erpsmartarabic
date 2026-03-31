

# خطة تحسين واجهة العميل على الموبايل

## ملخص التغييرات

بناءً على ملاحظاتك، سنجري 3 تعديلات رئيسية:

1. **الهيدر**: يبقى كاملاً (Hero) دائماً ويتحول لهيدر مضغوط فقط عند التمرير لأسفل (sticky compressed header) — بدلاً من الانضغاط عند فتح قسم.

2. **شريط الأيقونات**: عرض كل الأقسام العشرة في شريط واحد قابل للتمرير أفقياً — بدون زر "المزيد" نهائياً.

3. **بطاقة العميل**: إرجاع `CustomerMobileProfile` الكاملة بكل بياناتها (صورة، اسم، VIP، حالة، موقع، KPIs، حد ائتمان، أزرار اتصال وإجراءات) مع إزالة أسهم التنقل بين العملاء فقط.

---

## التفاصيل التقنية

### 1. تعديل `CustomerIconStrip.tsx`
- إزالة عنصر "المزيد" (`more`) وإزالة `moreSheetGroups` والـ `Sheet` بالكامل.
- إضافة كل الأقسام العشرة مباشرة في مصفوفة `stripIcons`:
  - فواتير، مدفوعات، بيانات، ملاحظات، تحليلات، مبيعات، كشف حساب، أعمار ديون، تذكيرات، مرفقات
- جعل الشريط `overflow-x-auto` مع `flex-nowrap` ليكون قابلاً للتمرير الأفقي.
- تحديث `MobileSectionId` لتشمل كل الأقسام.

### 2. تعديل `CustomerDetailsPage.tsx` (القسم الموبايل)
- إزالة منطق التبديل بين `CustomerMobileProfile` و `CustomerCompressedHeader` بناءً على `mobileSection`.
- عرض `CustomerMobileProfile` دائماً (بدون `onPrev`/`onNext`).
- إضافة سلوك sticky: عند التمرير لأسفل بمقدار معين، يظهر `CustomerCompressedHeader` كعنصر ثابت في أعلى الشاشة.
- شريط الأيقونات يبقى تحت الهيدر مباشرة، والمحتوى يتوسع أسفله.

### 3. تعديل `CustomerMobileProfile.tsx`
- إزالة props التنقل (`onPrev`, `onNext`, `hasPrev`, `hasNext`) والأسهم من العرض.
- إبقاء كل شيء آخر كما هو (الصورة، VIP، KPIs، حد الائتمان، أزرار الاتصال والإجراءات).

### الملفات المتأثرة
- `src/components/customers/mobile/CustomerIconStrip.tsx` — إعادة كتابة بـ 10 أيقونات + تمرير أفقي
- `src/pages/customers/CustomerDetailsPage.tsx` — منطق الهيدر الثابت عند التمرير
- `src/components/customers/mobile/CustomerMobileProfile.tsx` — إزالة التنقل بين العملاء

