

# خطة التحسين الشاملة لقسم العملاء

## نظرة عامة

بعد فحص 96+ ملف (10,900+ سطر)، تم تحديد 28 نقطة تحسين مقسمة على 8 مراحل تنفيذية.

---

## المرحلة 1: جودة الكود والأنواع (P0 — أساسية)

### 1.1 إزالة `any` من `useCustomerAlerts.ts`
يوجد 5 استخدامات لـ `(inv as any).customers` في الأسطر 109, 110, 153, 190.
**الحل**: إنشاء type للـ joined query يتضمن `customers: { name: string; phone: string | null }`.

### 1.2 إزالة `any` من `AlertItemActions.tsx`
السطر 70: `(e as any)` في `onKeyDown`.
**الحل**: استخدام `React.KeyboardEvent` بشكل صحيح.

### 1.3 إزالة `any` من `customerRepository.ts`
السطر 86: دالة `applyFilters` تستخدم `any` في generic constraint.
**الحل**: استخدام `PostgrestFilterBuilder` type من Supabase SDK.

---

## المرحلة 2: حفظ الملاحظات في قاعدة البيانات (P0 — وظيفية)

### 2.1 ملاحظات التنبيهات تُحفظ حالياً في `localStorage` فقط
`AlertItemActions.tsx` السطر 36-38 يحفظ في `customer-alert-notes`.
**الحل**: حفظ الملاحظات في جدول `customer_notes` الموجود فعلاً، مع tag نوعه `alert_note` لتمييزها.

### 2.2 إعدادات التنبيهات في `localStorage`
`useAlertSettings.ts` يحفظ كل الإعدادات محلياً.
**الحل**: (مرحلة لاحقة) نقل الإعدادات لجدول `user_preferences` لمزامنتها بين الأجهزة.

---

## المرحلة 3: أداء الاستعلامات (P1 — أداء)

### 3.1 `useCustomerAlerts` يجلب جميع العملاء النشطين
السطر 47-51: يجلب كل الأعمدة لكل العملاء النشطين في كل مرة.
**الحل**: إنشاء RPC `get_customer_alerts_data` يُرجع فقط العملاء الذين لديهم تنبيهات فعلية (تجاوز ائتمان، خمول، VIP بدون تواصل) بدلاً من تحميل الجميع وفلترتهم في الواجهة.

### 3.2 ثلاث queries منفصلة للفواتير
`useCustomerAlerts` يُجري 3 queries (overdue + upcoming + monthly sales) + query العملاء = 4 queries.
**الحل**: دمجها في RPC واحد `get_alert_summary` يُرجع كل البيانات دفعة واحدة.

### 3.3 البحث يستخدم `ilike` بدون index
`customerRepository.ts` السطر 94: يبحث بـ `ilike` على 4 أعمدة.
**الحل**: إضافة GIN index مع `pg_trgm` للبحث السريع، أو استخدام full-text search.

### 3.4 `CustomersPage.tsx` كبير (503 سطر)
يحتوي على منطق التصدير (السطور 195-308) مدمج في المكون.
**الحل**: استخراج `useCustomerExport` hook منفصل.

---

## المرحلة 4: تحسين تجربة البانر (P1 — UX)

### 4.1 الصوت يُشغّل مرتين
`CustomerAlertsBanner.tsx` (سطر 30-44) و `useAlertNotifier.ts` (سطر 53-61) كلاهما يشغل صوت.
**الحل**: إزالة الصو