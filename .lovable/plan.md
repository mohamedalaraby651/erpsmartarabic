## 🔍 التشخيص

بعد فحص شامل للمشروع، إليك ما اكتشفته:

| الفحص | النتيجة |
|---|---|
| `tsc --noEmit` | ✅ بدون أخطاء |
| `dev-server.log` | ✅ Vite يعمل بنجاح (HTTP 200 على `/`, `/src/main.tsx`, `/src/App.tsx`, `bulkInvoicePdfGenerator.ts`) |
| Console logs المتصفح | ⚠️ **فارغة تماماً** — التطبيق لا يصل لمرحلة التنفيذ في متصفح المستخدم |
| Network logs المتصفح | ⚠️ **فارغة تماماً** |
| Runtime errors | ✅ لا يوجد |

### السبب الجذري المُحتمل (ثلاث مشاكل متراكبة):

1. **Service Worker شبح (السبب الأكبر)**
   - `main.tsx` يقول: *"vite-plugin-pwa handles service worker registration automatically"*
   - **لكن في الحقيقة `vite.config.ts` لا يحتوي على `vite-plugin-pwa` إطلاقاً** ولا أي plugin PWA.
   - النشرات السابقة (`erpsmartarabic.lovable.app`) من المرجح أنها كانت تسجّل service worker، وهذا الـ SW القديم لا يزال نشطاً في متصفح المستخدم ويخدم **نسخة كاش معطوبة** لا تعرف عن الملفات الجديدة (`bulkInvoicePdfGenerator.ts`, `BulkPrintConfirmDialog.tsx`).
   - النتيجة: يتم تحميل HTML قديم يحاول استيراد ملفات JS غير موجودة → فشل صامت → شاشة بيضاء.

2. **`ReloadPrompt` فارغ**
   - الملف `src/components/offline/ReloadPrompt.tsx` يعيد `null` فقط — لا يوجد منطق لاكتشاف SW جديد ولا زر "إعادة تحميل" للمستخدم.

3. **80+ `lazy()` imports في `App.tsx`**
   - شبكة ضعيفة + موبايل (المستخدم على 393×699) قد تؤدي لفشل صامت في تحميل أحد chunks. لا يوجد آلية fallback.

---

## 🛠️ خطة الإصلاح

### المهمة 1 — إنشاء "درع تحميل" يكشف الفشل ويتعافى منه (أولوية قصوى)

**(أ) إلغاء تسجيل أي service worker شبح:**
في `src/main.tsx` قبل `createRoot`، أضيف منطق ينظّف SW القديم لمرة واحدة:
```ts
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
  // امسح أي كاش قديم أيضاً
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}
```
**ملاحظة:** سيُعلَّم بـ TODO ليُحذف بعد ~أسبوعين عندما يكون كل المستخدمين قد فتحوا التطبيق مرة واحدة.

**(ب) إصلاح التعليق المضلِّل في `main.tsx`:**
حذف تعليق "vite-plugin-pwa handles service worker registration automatically" لأنه غير صحيح.

**(ج) درع لاكتشاف فشل التحميل:**
داخل `index.html` أضيف سكريبت inline يضع timeout 8 ثوانٍ بعد التحميل، فإذا بقي `#root` فارغاً يعرض رسالة عربية:
> "تعذّر تحميل التطبيق — اضغط لإعادة المحاولة"
مع زر يقوم بـ `location.reload(true)` ومسح localStorage القديم.

### المهمة 2 — تفعيل `ReloadPrompt` بشكل حقيقي

استبدل `ReloadPrompt` الفارغ بمكوّن يلتقط حدث `vite:beforeUpdate` (في dev) وعرض toast "نسخة جديدة متاحة" مع زر تحديث (في prod). هذا يحمي ضد المشكلة في المستقبل.

### المهمة 3 — حماية كل `lazy()` imports من فشل التحميل

أضيف helper `lazyWithRetry` في `src/lib/lazyWithRetry.ts`:
- يحاول التحميل، وعند الفشل (مثلاً chunk قديم بعد deploy) ينتظر 500ms ويعيد المحاولة مرتين.
- إذا فشل تماماً، يفرض reload صفحة كاملة (مع منع حلقة لا نهائية عبر sessionStorage flag).

ثم استبدل `lazy(() => import(...))` في `App.tsx` بـ `lazyWithRetry(() => import(...))`. هذه التقنية معيارية لتطبيقات React مع code-splitting.

### المهمة 4 — تحسينات تشخيصية

- إضافة `console.log('[App] mounting')` في `main.tsx` و`console.log('[App] rendered')` في `App.tsx` (مع شرط `import.meta.env.DEV`) لمساعدتي على التشخيص في حال تكرار المشكلة.
- إضافة `<noscript>` رسالة عربية واضحة في `index.html` لمن عطّل JS.

### المهمة 5 — اختبار وتأكيد

- بناء المشروع: `bunx vite build` للتأكد من سلامة الـ chunks.
- فحص أن `bulkInvoicePdfGenerator` ضمن `vendor-pdf` chunk بشكل سليم.
- فحص حجم الـ entry chunk الأولي.

---

## 📦 الملفات التي ستتأثّر

| الملف | التغيير |
|---|---|
| `index.html` | إضافة سكريبت timeout-shield + noscript عربي |
| `src/main.tsx` | تنظيف SW شبح + console.log تشخيصي + حذف تعليق مضلِّل |
| `src/components/offline/ReloadPrompt.tsx` | تفعيل حقيقي بدل `return null` |
| `src/lib/lazyWithRetry.ts` | **جديد** — wrapper آمن لـ `lazy()` |
| `src/App.tsx` | استبدال `lazy` بـ `lazyWithRetry` (تغيير سطر import واحد + استبدال نصي) |

## ✅ النتيجة المتوقعة

- المستخدم يُحدّث الصفحة → SW القديم يُلغى تلقائياً → التطبيق يعمل.
- عند أي deploy مستقبلي، فشل تحميل chunk → reload تلقائي بدلاً من شاشة بيضاء.
- إذا حدث تأخّر >8 ثوانٍ → رسالة عربية واضحة بدل شاشة بيضاء صامتة.

هل توافق على البدء بالتنفيذ؟