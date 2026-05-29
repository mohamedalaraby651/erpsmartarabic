## تشخيص مشاكل العرض والتحميل

### المشاكل المكتشفة

**1. خطأ ترتيب CSS (السبب الجذري المرجّح للشاشة البيضاء)**

- في `src/index.css`: `@import './styles/motion.css'` موضوع **بعد** `@tailwind` directives.
- خطأ Vite صريح في سجل dev-server:
  ```
  [vite:css] @import must precede all other statements (besides @charset or empty @layer)
  ```
- النتيجة: قد يفشل بناء stylesheet → في بعض الحالات يمنع HMR ويُبطئ الإقلاع، وعند الإنتاج قد يُسقط القاعدة كاملةً.

**2. الشاشة البيضاء + رمز التشخيص WS-... (Shield في** `index.html`**)**

- session_replay يُظهر تفعيل shield بعد ~24.5 ثانية = React لم يُركَّب إطلاقاً.
- shield في `index.html` يُطلق عند 25s إذا بقي `#root` فارغاً.
- الأسباب المحتملة (مرتّبة احتمالاً):
  - أ) فشل وحدة مبكرة في `main.tsx` (assertSupabaseEnv, themeManager, runtimeTelemetry, أو الـ`installPdfTelemetryAutoFlush` الديناميكي) يرمي قبل `createRoot`.
  - ب) خطأ في تحميل chunk بسبب CSS التالف أعلاه.
  - ج) شبكة المعاينة تستغرق > 25s لجلب vendor chunk على الأجهزة البطيئة.

**3. ضوضاء auth.unauthorized كل 60 ثانية**

- `event-dispatcher` edge function يُستدعى بشكل دوري دون توكن صالح، يُسجّل `warn` متكرر يلوّث السجلات.

**4. غياب أي طبقة تشخيص حقيقية للمستخدم**

- شاشة "تعذّر التحميل" تعرض `WS-<timestamp>` فقط بدون سبب → المستخدم/الدعم لا يعرفان ما العطل.

---

### الحلول المقترحة

**خطوة 1 — إصلاح ترتيب** `@import` **في CSS** (إصلاح فوري)

- نقل `@import './styles/motion.css';` ليكون **أول** سطر في `src/index.css` قبل أي `@tailwind`.

**خطوة 2 — تحصين بدء** `main.tsx` **ضد فشل الوحدات المبكرة**

- إحاطة `initializeTheme()`, `measureWebVitals()`, و `installGlobalErrorHandlers()` بـ `try/catch` فردية حتى لا يمنع أيٌّ منها استدعاء `createRoot`.
- نقل `import('./lib/pdf/diagnostics/telemetryScheduler')` و `prefetchCommonRoutes()` إلى **بعد** `markPhase('react_mounted')` (موجودة بالفعل، لكن نضمن أنها داخل `requestIdleCallback`).

**خطوة 3 — رفع جودة شاشة الـ shield التشخيصية**

- في `index.html` shield: إضافة سطر يعرض آخر خطأ تم التقاطه من `installGlobalErrorHandlers` (مخزّن في `localStorage` تحت `lvbl:runtime-events:v1`) بدلاً من رمز توقيت غامض.
- تقصير زمن shield من 25s → 15s + إضافة عدّاد عكسي مرئي خلال الـ5 ثوانٍ الأخيرة (UX أفضل، نفس أمان "لا تخفي تطبيقاً يعمل" عبر فحص `__LVBL_REACT_MOUNTED__`).

**خطوة 4 — كتم سجلّ** `event-dispatcher` **غير المصرّح**

- في hook الفرونت اند الذي يُحدِث الاستدعاء كل 60s: تخطّي الاستدعاء عندما `!session?.access_token` بدلاً من إرسال طلب يفشل بـ 401. (تتبّع المصدر أولاً ثم تطبيق الحارس.)

**خطوة 5 — تحقق نهائي**

- إعادة تحميل المعاينة والتأكد من اختفاء تحذير Vite الخاص بـ `@import`.
- لقطة شاشة تأكيدية من المتصفح بعد الإصلاح.
- تشغيل `bunx vitest run` للحفاظ على 1187/1187 ✅.

---

### الملفات المتأثرة

- `src/index.css` (نقل سطر @import واحد).
- `src/main.tsx` (إضافة try/catch حول 3 استدعاءات تهيئة).
- `index.html` (تحسين شاشة shield + قراءة آخر خطأ من localStorage).
- ملف الـ hook المسؤول عن استدعاء `event-dispatcher` الدوري (سيُحدَّد أثناء التنفيذ).

### خارج النطاق

- بدون تعديلات قاعدة بيانات، RLS، أو edge functions.
- بدون تغيير UI/تصميم خارج شاشة shield.

Act as a Principal Frontend DevSecOps Architect and Vite Bundling Expert. We are executing a critical production boot-hardening sweep to resolve the intermittent white screen issues, CSS import order compilation errors, and periodic unauthorized auth logging noise, while keeping our 1187/1187 test suite perfectly green.

&nbsp;

Please systematically implement the following 4 engineering steps precisely:

&nbsp;

1. Step 1 — Instant CSS @import Order Correction:

- Open `src/index.css`. Move the line `@import './styles/motion.css';` to the absolute top of the file, BEFORE any `@tailwind base;`, `@tailwind components;`, or `@tailwind utilities;` directives.

- Verify that the Vite development server compilation warning "[vite:css] @import must precede all other statements" is completely eliminated.

&nbsp;

2. Step 2 — Hardening `src/main.tsx` Startup Lifecycle:

- Wrap the early initialization function calls (including `initializeTheme()`, `measureWebVitals()`, and `installGlobalErrorHandlers()`) in individual, isolated `try/catch` blocks. If any of these early infrastructure setups fail or throw an exception, catch it safely, log it to our secure telemetry, and ensure it does NOT block or prevent the crucial `createRoot` execution.

- Locate dynamic imports like `import('./lib/pdf/diagnostics/telemetryScheduler')` and `prefetchCommonRoutes()`. Ensure they are moved entirely below the `markPhase('react_mounted')` checkpoint, wrapped inside a safe browser `requestIdleCallback` wrapper.

&nbsp;

3. Step 3 — Upgrading the `index.html` Diagnostic Shield UI:

- Refactor the fallback shield timer script directly inside `index.html`.

- Reduce the activation threshold timeout from 25 seconds down to 15 seconds. If `__LVBL_REACT_MOUNTED__` is not true by the 15s mark, trigger the shield display.

- Add an elegant, localized visual countdown timer that displays for the final 5 seconds before the shield appears, boosting production UX.

- Upgrade the diagnostic text: Instead of rendering a cryptic `WS-<timestamp>` string, write code to read the last runtime exception from `localStorage` under the key `lvbl:runtime-events:v1` (saved by our error handlers) and display a user-friendly, localized summary of the error to assist support teams.

&nbsp;

4. Step 4 — Suppressing the `auth.unauthorized` Periodic 60s Edge Logging Noise:

- Locate the recurring frontend telemetry loop/hook responsible for dispatching events to the `event-dispatcher` edge function every 60 seconds.

- Inject a strict auth token guard inside this hook: If `!session?.access_token` is true, gracefully skip the network fetch request entirely instead of sending an unauthenticated payload that pollutes the server logs with recurring 401 Unauthorized exceptions.

&nbsp;

5. Step 5 — Verification:

- Ensure that `bunx tsc --noEmit` and our full unit testing framework baseline `bunx vitest run` register exactly 1187/1187 green, stable, and co

mpletely uncompromised!