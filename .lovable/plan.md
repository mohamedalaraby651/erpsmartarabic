# خطة الإصلاح الآمنة — بدون كسر للمشروع

## ⚠️ تصحيحات مهمة قبل البدء

التحليل المُقدَّم يحتوي على **تشخيصات غير دقيقة** يجب توضيحها لتجنّب "إصلاحات" تكسر المشروع:

| الادعاء | الواقع |
|---------|--------|
| `SUPABASE_ANON_KEY` في `index.html` تسرّب أمني | ❌ خطأ — هذا مفتاح **publishable** بالتصميم. كل تطبيق Supabase يضعه في الواجهة. الحماية عبر **RLS** (مُفعَّلة). |
| `Project ID` و رابط Edge Function أسرار | ❌ خطأ — عناوين عامة كأي URL. |
| تفعيل `strict: true` فوراً | ⚠️ سيُولِّد آلاف الأخطاء ويُعطّل البناء — نهج تدريجي مطلوب. |
| إزالة كل `as any` | ⚠️ بعضها ضروري لأن جداول جديدة (quotes, purchase_invoices) قد تسبق تحديث `types.ts`. |
| إعادة تسمية package | ⚠️ قد تكسر سكريبتات داخلية في Lovable — متروك. |

سنُنفّذ فقط ما له **أثر حقيقي إيجابي** بدون مخاطرة.

---

## المرحلة 1 — إصلاحات آمنة عالية الأثر

### 1.1 توحيد معالجة الأخطاء (منع تسرّب رسائل DB للمستخدم)
استبدال `e?.message` المباشر بـ `getSafeErrorMessage(e)` في:
- `src/hooks/logistics/useGoodsReceipts.ts`
- `src/hooks/logistics/usePurchaseInvoices.ts`
- `src/hooks/logistics/useDeliveryNotes.ts`
- `src/hooks/sales-cycle/useQuotes.ts`

**الأمان**: تغيير سطحي على `onError` فقط — لا يمسّ المنطق.

### 1.2 حماية `console.log` في الإنتاج
لفّ `console.log` (وليس `console.error`) بـ `if (import.meta.env.DEV)` في:
- `src/lib/performanceMonitor.ts`
- `src/hooks/useAppBadge.ts`
- `src/lib/arabicFont.ts`

**الإبقاء على `console.error`** لأنها مفيدة لـ telemetry و Sentry-like flows.

**الأمان**: لا يُغيّر سلوك تشغيلي — فقط يُسكت اللوغ في الإنتاج.

### 1.3 فحص الاتصال قبل المزامنة
في `src/lib/syncManager.ts` → `syncToServer()`: إضافة early return عند `!navigator.onLine` مع رسالة واضحة في النتيجة.

**الأمان**: يمنع طلبات فاشلة فقط — لا يحذف بيانات.

---

## المرحلة 2 — تشديد TypeScript تدريجي (آمن)

### 2.1 الخطوة الأولى فقط: `noImplicitAny`
- تفعيل `noImplicitAny: true` في `tsconfig.app.json` (وليس `tsconfig.json` الجذر).
- إصلاح الأخطاء الناتجة بإضافة types صريحة (لن تكون كثيرة لأن معظم الكود مُنوَّع بالفعل).
- **عدم تفعيل** `strictNullChecks` أو `strict` في هذه الجلسة — يحتاج جلسة منفصلة مخصصة.

**الأمان**: لو ظهرت أخطاء بناء كثيرة، نتراجع فوراً ونؤجّل لجلسة لاحقة.

### 2.2 إزالة `as any` فقط حيث types موجودة
- فحص `src/integrations/supabase/types.ts` للتأكد من وجود types لجداول `quotes`, `purchase_invoices`, `goods_receipts`.
- **إن وُجدت**: استبدال `as any` بـ types مستوردة من `Database['public']['Tables']`.
- **إن لم تُوجد**: ترك `as any` مع تعليق `// TODO: types pending` بدلاً من كسر الكود.

---

## المرحلة 3 — تحسينات أمان حقيقية

### 3.1 إضافة Content Security Policy (CSP) — اختبار حذِر
- إضافة `<meta http-equiv="Content-Security-Policy">` في `index.html` يسمح بـ:
  - `script-src 'self' 'unsafe-inline'` (مطلوب لـ Vite/React inline scripts).
  - `connect-src 'self' https://*.supabase.co https://fonts.googleapis.com`.
  - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`.
  - `font-src 'self' https://fonts.gstatic.com data:`.
  - `img-src 'self' data: blob: https:`.
  - `frame-ancestors 'none'`.
- **اختبار** في المعاينة بعد الإضافة للتحقق من عدم كسر تحميل الخطوط/Supabase.
- في حال ظهور أي مورد محظور: تخفيف السياسة بدلاً من حذفها.

### 3.2 تشغيل Security Scanner و DB Linter
- تشغيل `security--run_security_scan` و `supabase--linter`.
- معالجة findings الجديدة الحقيقية فقط (تجاهل false positives الـ 58 المعروفة).

---

## المرحلة 4 — توثيق وتنظيف

### 4.1 تحديث `README.md`
- استبدال placeholder بمعلومات حقيقية: اسم نظام نظرة، التشغيل المحلي، بنية المجلدات، روابط التوثيق.

### 4.2 تحديث `docs/SYSTEM_AUDIT_2026_05.md`
- إضافة قسم "تصحيح المفاهيم الأمنية" يوضّح:
  - لماذا `anon key` ليس سرّاً.
  - كيف تحمي RLS البيانات.
  - شرح الـ 58 تحذير المتبقية كـ false positives.
  - استراتيجية CSP الجديدة.

---

## ما لن يُنفَّذ (مع التبرير)

| الطلب | السبب |
|------|-------|
| إخفاء `anon key` من `index.html` | مفتاح publishable بالتصميم — حذفه يكسر التطبيق |
| `strict: true` كاملاً | يُعطّل البناء — يحتاج جلسة مخصصة |
| إزالة كل `console.error` | مفيدة للتشخيص في الإنتاج |
| تغيير `package.json` name | قد يكسر سكريبتات Lovable الداخلية |
| تقسيم الملفات الكبيرة (>500 سطر) | تم تأجيله سابقاً — يحتاج جلسة منفصلة |
| تعطيل `allowJs` | قد يكسر استيرادات موجودة |

---

## آلية التراجع (Rollback Safety)

- كل مرحلة مستقلة — لو فشلت مرحلة 2.1 (TypeScript) نتراجع عنها فقط.
- بعد كل مرحلة: التحقق من نجاح البناء قبل الانتقال للتالية.
- لو أي تغيير CSP كسر مورداً: التراجع الفوري وتخفيف السياسة.

## معايير النجاح
- ✅ البناء يمر بدون أخطاء.
- ✅ المعاينة تعمل (auth, dashboard, customers).
- ✅ لا تسرّب رسائل خام للمستخدم.
- ✅ CSP فعّال دون كسر موارد.
- ✅ توثيق محدَّث ودقيق.

## الملفات المتأثرة (تقدير)
- **تعديل آمن**: `tsconfig.app.json`, `index.html`, `README.md`, `src/lib/syncManager.ts`, `src/lib/performanceMonitor.ts`, `src/hooks/useAppBadge.ts`, `src/lib/arabicFont.ts`, `src/hooks/logistics/*.ts`, `src/hooks/sales-cycle/useQuotes.ts`, `docs/SYSTEM_AUDIT_2026_05.md`
- **بدون مساس**: `.env`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `package.json`
