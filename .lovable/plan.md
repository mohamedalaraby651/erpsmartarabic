

# خطة شاملة لتطوير صفحة تفاصيل العميل

بناءً على إجاباتك الـ 20، هذه خطة مفصلة ومقسمة لتحويل صفحة العميل إلى واجهة CRM مؤسسية متكاملة.

---

## الخطوة 1: التنبيهات الذكية (Smart Alerts)

إنشاء مكون `CustomerSmartAlerts.tsx` يعرض تنبيهات سياقية أعلى الصفحة (بعد البروفايل مباشرة):

- **تجاوز حد الائتمان**: banner أحمر مع زر "تعديل حد الائتمان" (يظهر عندما `currentBalance >= creditLimit`)
- **ديون متأخرة**: banner برتقالي مع زر "إرسال تذكير" (يظهر عندما توجد فواتير متأخرة 60+ يوم)
- **عميل خامل**: banner أزرق مع زر "تواصل" أو "فاتورة جديدة" (يظهر عندما آخر فاتورة/تواصل > 30 يوم)
- **عميل جديد بدون فواتير**: banner أخضر مع زر "إنشاء أول فاتورة"

يعرض على Desktop وMobile، ويمكن إخفاؤه بزر X.

**الملفات:** `src/components/customers/CustomerSmartAlerts.tsx` (جديد)، `CustomerDetailsPage.tsx` (تعديل)

---

## الخطوة 2: دمج الإحصائيات في البروفايل

**Desktop — HeroHeader:**
- إضافة صف إحصائيات مدمج أسفل بيانات التواصل داخل `CustomerHeroHeader` (الرصيد، المستحق، نسبة السداد، المشتريات، عدد الفواتير) — كل رقم بأيقونة صغيرة ولون
- إزالة `CustomerStatsGrid` المنفصل (دمجه في البروفايل حسب اختيارك)

**Mobile — MobileProfile:**
- إضافة 4 أرقام إحصائية مصغرة (الرصيد، المستحق، نسبة السداد، المشتريات) داخل بطاقة البروفايل كصف أفقي مضغوط
- إزالة بطاقات `CustomerMobileStatCard` المنفصلة وزر "عرض الكل" (كانت تأخذ مساحة كبيرة)

**الملفات:** `CustomerHeroHeader.tsx`، `CustomerMobileProfile.tsx`، `CustomerDetailsPage.tsx`

---

## الخطوة 3: تغيير التبويب الافتراضي إلى "الملخص المالي"

- تغيير `useState('addresses')` إلى `useState('financial')` في `useCustomerDetail`
- تغيير `useState('financials')` إلى `useState('financial')` في `mobileTab`

**الملفات:** `useCustomerDetail.ts`، `CustomerDetailsPage.tsx`

---

## الخطوة 4: إجراءات سريعة شاملة (Quick Actions)

توسيع أزرار الإجراءات في HeroHeader وMobileProfile لتشمل:
- فاتورة جديدة (موجود)
- كشف حساب (موجود)
- تسجيل دفعة (جديد — ينتقل لصفحة المدفوعات مع prefill)
- إشعار دائن (جديد)
- عرض سعر (جديد)
- أمر بيع (جديد)
- واتساب/اتصال (موجود)
- تعديل البيانات (موجود)
- تجميد/تنشيط الحساب (جديد — تغيير `is_active`)
- تغيير تصنيف VIP (جديد — inline dropdown)

على Desktop: أزرار في عمود جانبي + dropdown "المزيد"
على Mobile: أزرار رئيسية (فاتورة + كشف) + زر "..." يفتح sheet بباقي الإجراءات

**الملفات:** `CustomerHeroHeader.tsx`، `CustomerMobileProfile.tsx`، `CustomerDetailsPage.tsx`

---

## الخطوة 5: التعديل المختلط (Inline + Dialog)

- **Inline**: تصنيف VIP (dropdown مباشر في البروفايل)، حالة العميل (toggle نشط/غير نشط)
- **Dialog**: باقي البيانات (الاسم، الهاتف، العنوان، إلخ) تبقى في `CustomerFormDialog` الحالي

إضافة زر تعديل صغير بجوار VIP badge وحالة العميل في HeroHeader.

**الملفات:** `CustomerHeroHeader.tsx`، `CustomerMobileProfile.tsx`

---

## الخطوة 6: التنقل بين العملاء (تالي/سابق)

إنشاء hook `useCustomerNavigation` يحفظ قائمة IDs من آخر بحث/فلتر في `sessionStorage`، ويوفر `nextId` و `prevId`.

إضافة أزرار سهم (→ ←) بجوار اسم العميل في MobileDetailHeader وفي HeroHeader.

**الملفات:** `src/hooks/customers/useCustomerNavigation.ts` (جديد)، `CustomerDetailsPage.tsx`، `MobileDetailHeader` (تعديل)

---

## الخطوة 7: تبويب البيانات الأساسية — إثراء

تحويل تبويب "العناوين" الحالي إلى تبويب "البيانات الأساسية" يضم:
1. **بطاقة تواصل سريعة**: الهاتف + البريد + واتساب بأزرار مباشرة
2. **سجل آخر 5 تواصلات**: timeline مصغر من `communication_logs`
3. **العناوين المتعددة**: العنوان الرئيسي + عنوان الشحن + عنوان الفواتير — مع إمكانية إضافة عناوين جديدة

يتطلب تعديل `tabGroups` في `customerConstants.ts` لتغيير اسم التبويب الأول.

**الملفات:** `src/components/customers/tabs/CustomerTabBasicInfo.tsx` (جديد)، `customerConstants.ts`، `CustomerDetailsPage.tsx`

---

## الخطوة 8: تبويب الفواتير — ميزات متقدمة

إضافة إلى التبويب الحالي:
1. **فلاتر متقدمة**: حسب الحالة (مدفوع/معلق/متأخر) + حسب التاريخ + بحث برقم الفاتورة
2. **معاينة سريعة (Quick Preview)**: الضغط على فاتورة يفتح Sheet/Drawer يعرض تفاصيلها (العناصر، الإجمالي، حالة الدفع) بدون مغادرة الصفحة
3. **دفع سريع**: زر "تسجيل دفعة" بجوار كل فاتورة غير مدفوعة يفتح dialog مصغر
4. **Swipe Actions** (موبايل): سحب يسار يظهر خيارات (طباعة، إرسال، حذف)

**الملفات:** `CustomerTabInvoices.tsx` (تعديل كبير)، `src/components/customers/InvoiceQuickPreview.tsx` (جديد)، `src/components/customers/QuickPaymentDialog.tsx` (جديد)

---

## الخطوة 9: تبويب الملاحظات الداخلية (جديد)

إنشاء جدول `customer_notes` في قاعدة البيانات:
```
id, customer_id, user_id, content, is_pinned, created_at
```
مع RLS policy للمستخدمين المسجلين فقط.

إنشاء تبويب يعرض الملاحظات كـ timeline (أحدث أولاً) مع:
- حقل إضافة ملاحظة جديدة (textarea + زر إرسال)
- إمكانية تثبيت ملاحظة مهمة (pin)
- عرض اسم الموظف الذي كتب الملاحظة

إضافته لـ `tabGroups` في مجموعة "الأساسي".

**الملفات:** migration SQL (جديد)، `src/components/customers/tabs/CustomerTabNotes.tsx` (جديد)، `customerConstants.ts`، `CustomerDetailsPage.tsx`

---

## الخطوة 10: الرسوم البيانية — 4 أنواع في تبويب التحليلات

1. **رسم المشتريات الشهرية** (موجود — Bar Chart)
2. **رسم أعمار الديون** (جديد — Donut Chart): توزيع الديون حسب العمر (0-30, 30-60, 60-90, 90+)
3. **رسم التدفق المالي** (جديد — Line Chart): مقارنة المشتريات vs المدفوعات عبر الزمن
4. **تحليل المنتجات** (جديد — Horizontal Bar): أكثر 10 منتجات شراءً حسب الكمية أو المبلغ

**الملفات:** `src/components/customers/charts/AgingDonutChart.tsx` (جديد)، `src/components/customers/charts/CashFlowLineChart.tsx` (جديد)، `src/components/customers/charts/TopProductsChart.tsx` (جديد)، تعديل تبويب analytics

---

## الخطوة 11: التذكيرات المتقدمة مع إشعارات

تحديث نظام التذكيرات الحالي ليدعم:
- تكرار (يومي، أسبوعي، شهري)
- ربط التذكير بفاتورة محددة (اختياري)
- إرسال push notification عند حلول الموعد (ربط مع `push_subscriptions` الموجود)
- عرض التذكيرات القادمة كـ badges في التبويب

**الملفات:** migration SQL لإضافة أعمدة (recurrence, linked_invoice_id)، `CustomerReminderDialog` (تعديل)

---

## الخطوة 12: التصدير والطباعة

1. **PDF كشف حساب**: موجود جزئياً — التأكد من دعم RTL + لوجو الشركة
2. **Excel شامل**: تصدير كل بيانات العميل (بيانات أساسية + فواتير + مدفوعات + أعمار ديون) في ملف Excel واحد بعدة sheets
3. **طباعة مباشرة**: زر طباعة في كشف الحساب وتبويب الفواتير يستخدم `PrintTemplate` الموجود

إضافة أزرار التصدير في HeroHeader (dropdown) وفي كل تبويب ذي صلة.

**الملفات:** `CustomerHeroHeader.tsx`، `StatementOfAccount.tsx` (تعديل)، `src/lib/exports/customerExcelExport.ts` (جديد)

---

## ملخص الملفات

```text
ملفات جديدة (9):
  src/components/customers/CustomerSmartAlerts.tsx
  src/components/customers/tabs/CustomerTabBasicInfo.tsx
  src/components/customers/tabs/CustomerTabNotes.tsx
  src/components/customers/InvoiceQuickPreview.tsx
  src/components/customers/QuickPaymentDialog.tsx
  src/components/customers/charts/AgingDonutChart.tsx
  src/components/customers/charts/CashFlowLineChart.tsx
  src/components/customers/charts/TopProductsChart.tsx
  src/hooks/customers/useCustomerNavigation.ts

ملفات معدلة (8):
  src/pages/customers/CustomerDetailsPage.tsx
  src/components/customers/CustomerHeroHeader.tsx
  src/components/customers/mobile/CustomerMobileProfile.tsx
  src/hooks/customers/useCustomerDetail.ts
  src/lib/customerConstants.ts
  src/components/customers/tabs/CustomerTabInvoices.tsx
  src/components/customers/CustomerReminderDialog.tsx
  src/components/customers/StatementOfAccount.tsx

تعديلات قاعدة البيانات (2):
  migration: إنشاء جدول customer_notes + RLS
  migration: إضافة أعمدة recurrence + linked_invoice_id للتذكيرات
```

---

## ترتيب التنفيذ المقترح

نظراً لاختيارك "كل شيء متساوي"، سيتم التنفيذ حسب التبعيات:
1. الخطوات 1-3 (أساسيات: تنبيهات + دمج إحصائيات + تبويب افتراضي)
2. الخطوات 4-6 (إجراءات + تعديل مختلط + تنقل)
3. الخطوات 7-9 (تبويبات جديدة: بيانات أساسية + فواتير متقدمة + ملاحظات)
4. الخطوات 10-12 (رسوم بيانية + تذكيرات + تصدير)

