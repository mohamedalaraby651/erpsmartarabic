# خطة التحليل الناقد الشاملة للنظام (ERP Smart Arabic)

تحليل ناقد كامل بناءً على فحص قاعدة البيانات (Supabase Linter)، حجم الملفات (~114K سطر)، الكود (39 ملف بـ`any`، 12 ملف بـ`console.log`، 16 ملف بـ`error.message` مكشوف)، والبنية العامة.

---

## 1) المشاكل المكتشفة (مُرتّبة حسب الخطورة)

### P0 — أمان قاعدة البيانات (81 تنبيه من Supabase Linter)
- **6 مشاكل RLS حرجة** (employees, suppliers, customers, profiles, user_2fa_settings, bank_accounts) — بيانات حساسة (national_id, IBAN, مفاتيح 2FA) متاحة على نطاق واسع.
- **~70 دالة SECURITY DEFINER** قابلة للتنفيذ من المستخدم المجهول (anon) — يجب `REVOKE EXECUTE FROM anon, public`.
- **Function Search Path Mutable** — دوال بدون `SET search_path = public` (خطر SQL injection بتغيير المسار).
- **7 تنبيهات RLS تحذيرية** (invoices, payments, expenses, activity_logs, suspicious_activities, security_dashboard, user_login_history).

### P0 — تسرّب أخطاء حساسة
- 16 ملف يستخدم `error.message` مباشرةً في الـ UI (مثل `Auth.tsx`, `TwoFactorSetup.tsx`, `JournalFormDialog.tsx`) — يكشف تفاصيل بنية الـ DB للمستخدم.

### P1 — جودة الكود وقابلية الصيانة
- **39 ملف** يستخدم `: any` بدلاً من أنواع TypeScript محددة (تعطيل فعلي للـ type safety).
- **12 ملف** بها `console.log` في كود الإنتاج (بعضها مقبول داخل `import.meta.env.DEV`، لكن ليس كلها).
- **ملفات عملاقة** يصعب صيانتها:
  - `RestoreBackupDialog.tsx` (1213 سطر) — يجب تقسيمه فوراً.
  - `CustomerListCard.tsx` (538), `CustomerDetailsPage.tsx` (558), `MobileDrawer.tsx` (489), `CreditNoteFormDialog.tsx` (473), `QuotationsPage.tsx` (484).

### P1 — الأداء والاستجابة
- لا يوجد **Virtual Scrolling** فعّال على القوائم الطويلة (Customers, Invoices, Products) — رغم وجود `@tanstack/react-virtual` مثبت.
- `recharts` (~300KB) محمّل في صفحات صغيرة — فرصة للـ lazy load أعمق.
- `staleTime: 5min` موحّد — بعض الاستعلامات (التذكيرات، الإشعارات) تحتاج `staleTime` أقل والبعض الآخر (المنتجات، التصنيفات) أكبر.
- لا يوجد **prefetch** للصفحة التالية في pagination.

### P1 — الموبايل و UX
- Bottom Nav + FAB + Mobile Drawer = ازدحام بصري في بعض الصفحات.
- بعض الـ Dialogs لا تتحول إلى Drawer/Sheet على الموبايل (تجربة سيئة).
- لا توجد **Pull-to-refresh** على القوائم الرئيسية.
- بعض الأزرار < 44px (مخالف لمعيار accessibility).

### P2 — البنية التحتية والتشغيل
- `vite.config.ts` يحتاج مراجعة `manualChunks` (بعض الـ chunks > 500KB).
- لا يوجد **Sentry / error tracking خارجي** (فقط `runtimeTelemetry` داخلي).
- ملف `types.ts` (6064 سطر) — مُولّد، لكن يستحق مراجعة الجداول غير المستخدمة.
- لا يوجد **CI workflow** ظاهر لتشغيل الاختبارات تلقائياً.

### P2 — تجربة الواجهة (Polish)
- بعض الـ Empty States غير موحّدة عبر النظام.
- لا توجد **dark mode contrast audit** (بعض الـ tokens قد تفشل WCAG AA).
- التحميل الأوّلي (`AppInitSkeleton`) يستغرق وقتاً قبل أن تظهر بيانات حقيقية — لا يوجد **Optimistic UI** كافٍ.

---

## 2) خطة التنفيذ (5 مراحل)

### المرحلة 1 — الأمان الحرج (P0) — يوم واحد
1. **migration**: إضافة field-level RLS لـ `employees`, `suppliers`, `customers`, `bank_accounts` (تقييد الحقول الحساسة لأدوار محددة عبر VIEWS بـ`security_invoker`).
2. **migration**: تشفير `user_2fa_settings.secret` باستخدام `pgsodium` أو `pgcrypto`.
3. **migration**: `REVOKE EXECUTE ... FROM anon, public` لجميع دوال SECURITY DEFINER الـ70 (بقاء `authenticated` فقط حيث لزم).
4. **migration**: إضافة `SET search_path = public` لكل الدوال المتأثرة.
5. **migration**: إضافة RLS لـ `suspicious_activities`, `security_dashboard`, `activity_logs` (INSERT-only من triggers).

### المرحلة 2 — جودة الكود (P0/P1) — يومان
1. استبدال `error.message` بـ `getSafeErrorMessage()` في الـ16 ملف (دفعة واحدة، تغيير ميكانيكي).
2. تقسيم `RestoreBackupDialog.tsx` (1213 سطر) إلى:
   - `RestoreBackupDialog.tsx` (orchestrator)
   - `RestoreFileUploader.tsx`
   - `RestoreValidationStep.tsx`
   - `RestoreProgressView.tsx`
   - `RestoreReportView.tsx`
3. استبدال `: any` في أعلى 10 ملفات استخداماً بأنواع محددة من `types.ts`.
4. تنظيف `console.log` غير المحاط بـ `import.meta.env.DEV`.

### المرحلة 3 — الأداء (P1) — يوم ونصف
1. تفعيل **Virtual Scrolling** عبر `useVirtualList` على:
   - `CustomerMobileView`, `InvoicesPage`, `ProductsPage` (للقوائم > 50 عنصر).
2. تخصيص `staleTime` لكل query حسب طبيعة البيانات (إضافة جدول مرجعي في `lib/queryConfig.ts`).
3. **Prefetch** الصفحة التالية في pagination عبر `queryClient.prefetchQuery` عند hover/idle.
4. مراجعة `vite.config.ts` manualChunks وتقسيم أعمق (`vendor-radix`, `vendor-supabase`).
5. إضافة `<link rel="preconnect">` لـ Supabase URL في `index.html`.

### المرحلة 4 — الموبايل و UX (P1) — يومان
1. إضافة **Pull-to-refresh** على CustomersPage, InvoicesPage, ProductsPage (عبر hook موحد `usePullToRefresh`).
2. تحويل الـ Dialogs الكبيرة إلى **Drawer (vaul)** على الموبايل (CreditNoteFormDialog, InvoiceFormDialog, QuotationFormDialog).
3. توحيد **Empty States** عبر `<UnifiedEmptyState>` — illustration + CTA + filter chips.
4. فحص جميع الأزرار للتأكد من `min-h-11` (44px) على الموبايل.
5. **Optimistic UI** للإجراءات السريعة (تحديد فاتورة كمدفوعة، حذف تذكير).

### المرحلة 5 — البنية التحتية و Polish (P2) — يوم
1. مراجعة dark mode contrast وإصلاح tokens غير المتوافقة مع WCAG AA.
2. تحسين `AppInitSkeleton` بإظهار navigation فوراً مع skeleton للمحتوى فقط.
3. تنظيف الجداول غير المستخدمة (إن وُجدت) من DB.
4. توثيق محدّث في `docs/SYSTEM_AUDIT_2026_05.md` يلخص ما تم.

---

## 3) المخرجات المتوقعة

| المحور | قبل | بعد |
|---|---|---|
| Supabase Linter Warnings | 81 | < 5 |
| RLS Critical Issues | 6 | 0 |
| ملفات `error.message` مكشوفة | 16 | 0 |
| ملفات > 500 سطر | 7 | ≤ 2 |
| استخدام `: any` | 39 ملف | < 10 |
| TTI الموبايل (تقديري) | ~3s | ~1.8s |
| WCAG AA contrast | جزئي | كامل |

---

## 4) الترتيب المقترح للتنفيذ

أقترح البدء **بالمرحلة 1 (الأمان)** فوراً لأنها الأخطر، ثم الانتقال للمرحلة 2 بالتوازي مع الإجابة على الأسئلة التالية:

**أحتاج تأكيدك على:**
1. هل أبدأ بالمرحلة 1 كاملة (5 migrations دفعة واحدة) أم migration واحد لكل مشكلة (للمراجعة الدقيقة)؟
2. هل توافق على تقسيم `RestoreBackupDialog` (1213 سطر) إلى 5 مكونات الآن؟
3. هل تفضّل تنفيذ الـ5 مراحل تباعاً (~أسبوع) أم التركيز على P0+P1 فقط (3 أيام) ثم تقييم؟
