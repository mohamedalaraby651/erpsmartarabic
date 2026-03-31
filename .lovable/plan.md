

# خطة تحسين صفحة تفاصيل العميل — المرحلة 2

بناءً على إجاباتك، هذه التحسينات المطلوبة:

---

## 1. بطاقات KPI كبيرة ملونة

استبدال صف الإحصائيات المضغوط الحالي (`StatMini` grid) ببطاقات KPI كبيرة بألوان مختلفة:

- **الرصيد**: بطاقة خضراء/حمراء حسب الحالة — مع أيقونة + رقم كبير + سهم اتجاه
- **المستحق**: بطاقة برتقالية — إجمالي غير المدفوع
- **إجمالي المشتريات**: بطاقة زرقاء — إجمالي المشتريات التراكمي

كل بطاقة قابلة للضغط → تفتح Drawer بخط زمني مرئي للأحداث المرتبطة.

على Desktop: 3 بطاقات في صف أفقي بين البروفايل والتبويبات.
على Mobile: 3 بطاقات أصغر في صف أفقي داخل البروفايل (تستبدل `MiniStat` الحالي).

**ملفات:** `CustomerKPICards.tsx` (جديد)، `CustomerHeroHeader.tsx`، `CustomerMobileProfile.tsx`، `CustomerDetailsPage.tsx`

---

## 2. Drawer خط زمني تفاعلي (Timeline Drawer)

عند الضغط على بطاقة KPI، يفتح Sheet/Drawer يعرض خط زمني مرئي بأيقونات وألوان:

- **فواتير**: أيقونة ملف + مبلغ + حالة الدفع
- **مدفوعات**: أيقونة بطاقة + مبلغ + طريقة الدفع
- **تواصلات**: أيقونة رسالة + نوع التواصل

يفلتر تلقائياً حسب نوع البطاقة المضغوطة (مثلاً: الرصيد → يعرض الفواتير والمدفوعات).

**ملفات:** `CustomerTimelineDrawer.tsx` (جديد)

---

## 3. بطاقة الملاحظة المثبتة المنفصلة

إضافة بطاقة صغيرة بين البروفايل/KPI والتبويبات تعرض آخر ملاحظة مثبتة (`is_pinned = true`) مع أيقونة دبوس.

- تظهر فقط إذا توجد ملاحظة مثبتة
- زر "عرض الكل" ينتقل لتبويب الملاحظات
- قابلة للطي (collapsible)

**ملفات:** `CustomerPinnedNote.tsx` (جديد)، `CustomerDetailsPage.tsx`

---

## 4. شريط تنقل سفلي ثابت (Mobile Bottom Navigation)

استبدال شريط التبويبات الأفقي العلوي على الموبايل بشريط أيقونات ثابت أسفل الشاشة:

- **4 أيقونات ثابتة**: 💰 الملخص، 📄 الفواتير، 💳 المدفوعات، ⚙️ المزيد
- زر "المزيد" يفتح Sheet بباقي التبويبات مجمعة في 4 أقسام:
  - البيانات (بيانات أساسية + عناوين + تواصل)
  - التحليلات (رسوم بيانية)
  - الإداري (ملاحظات + مرفقات + تذكيرات)
  - التقارير (كشف حساب + أعمار ديون)
- أيقونة نشطة مميزة بلون + نقطة

**ملفات:** `CustomerBottomNav.tsx` (جديد)، `CustomerDetailsPage.tsx` (تعديل layout الموبايل)

---

## ملخص الملفات

```text
ملفات جديدة (4):
  src/components/customers/CustomerKPICards.tsx
  src/components/customers/CustomerTimelineDrawer.tsx
  src/components/customers/CustomerPinnedNote.tsx
  src/components/customers/mobile/CustomerBottomNav.tsx

ملفات معدلة (3):
  src/pages/customers/CustomerDetailsPage.tsx
  src/components/customers/CustomerHeroHeader.tsx
  src/components/customers/mobile/CustomerMobileProfile.tsx
```

---

## ترتيب التنفيذ

1. بطاقات KPI + Timeline Drawer (مرتبطان)
2. بطاقة الملاحظة المثبتة
3. شريط التنقل السفلي للموبايل

