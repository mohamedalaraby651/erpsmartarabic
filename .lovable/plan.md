# تدقيق 360° + خارطة طريق

## ملاحظة جوهرية قبل الـ Gap Report

المشروع **ناضج جداً**: ~100 جدول، 14 Edge Function، 148 migration، 41 وحدة صفحات، RLS مفعّل على كل جدول، 44 ملف اختبار، تقسيم Bundle احترافي، Telemetry شامل. لا يوجد "ثقب" معماري كبير. الفجوات المرصودة محدّدة وقابلة للإصلاح.

---

## 1. Gap Report (ما هو مفقود أو يحتاج إصلاح)

### 1.1 ازدواج وحدات (دَين معماري)
- **`pages/quotes/` و `pages/quotations/`** يحتويان على نفس المفهوم (عرض أسعار) بأسماء وجداول مختلفة (`quotes`/`quote_items` vs `quotations`/`quotation_items`). يجب توحيدهما واختيار واحد كمصدر حقيقي مع migration بيانات + redirect routes.
- نفس الازدواج محتمل في Sales Cycle (`sales-orders` + `quotes/SalesPipelinePage`).

### 1.2 تدفقات مستخدم ناقصة
- **استرجاع كلمة المرور (Forgot Password)**: غير موجود في `Auth.tsx` — فقط Login/Signup.
- **تأكيد البريد بعد التسجيل (Email confirmation)**: لا توجد صفحة `/auth/confirm` لاستقبال الـ callback.
- **Google Sign-In**: مفقود من `Auth.tsx` رغم أنه افتراضي في Lovable Cloud.
- **صفحة Onboarding** للمستخدم الجديد: لا يوجد wizard لاختيار اللغة/إعداد الشركة/إنشاء أول عميل.
- **صفحة Profile مستقلة**: حالياً `/profile` يعيد توجيه إلى `UnifiedSettingsPage`.
- **شاشة "غير مصرّح" (403)**: `RouteErrorPage` موجودة لكن لا يوجد فحص دور قبل الدخول لصفحات admin/platform → المستخدم يرى صفحة فارغة بدل 403 واضح.

### 1.3 جداول/سياسات RLS تستحق المراجعة
| الجدول | الحالة | التوصية |
|---|---|---|
| `event_metrics` | SELECT فقط | ✓ مقصود (للأدمن فقط) |
| `journal_reversals` | SELECT فقط | ✓ مقصود (تُكتب عبر trigger) |
| الباقي بسياسة واحدة | `cmd=ALL` يغطي CRUD | ✓ صحيح، لكن استبدلها بـ 4 سياسات منفصلة لوضوح الـ audit |
| `slow_queries_log` | موجود لكن لا يبدو مرتبطاً بـ trigger Postgres | تحقّق أنه يُملأ فعلياً |
| `customers_safe`, `employees_safe`, `suppliers_safe` | views للـ PII masking | تأكد أنها مستخدمة في كل مكان بدل الجدول الأصلي |

### 1.4 Edge Functions
- **مفقود**: webhook handler عام (لاستقبال webhooks خارجية، مثلاً payment gateway).
- **مفقود**: Cron job منفصل لـ `refresh_dashboard_mv` (موجود pg_cron لكن بدون مراقبة).
- `log-event` يحتاج Rate Limiting لمنع إغراق الـ logs.
- لا توجد ملفات `*_test.ts` داخل `supabase/functions/*` رغم وجود `test_edge_functions` tool.

### 1.5 UI/UX
- **Dark Mode**: متغيرات HSL موجودة لكن يحتاج جولة QA على كل صفحة (المتغيرات مدعومة، التطبيق ليس مضموناً).
- **Empty States**: مذكورة في الذاكرة كمعيار، لكن لم أتأكد من تطبيقها على كل القوائم (تحتاج جولة).
- **Tooltips على الأزرار الأيقونية**: محتمل ناقص في صفحات admin الكثيفة.
- **Toast feedback** بعد كل mutation: يحتاج فحص (سياسة "لا mutation بدون toast نجاح/خطأ").
- **Skeleton جزئي** في صفحات غير الـ Dashboard: مفقود — معظم الصفحات تستخدم spinner بسيط.
- **Mobile responsive**: 29 صفحة فقط تستخدم `useIsMobile` من أصل 41 — البقية قد تكون مكسورة على الجوال.
- **i18n**: التطبيق عربي فقط. الذاكرة تذكر RTL لكن لا يوجد إعداد لإضافة اللغة الإنجليزية مستقبلاً.

### 1.6 Auth & Security
- **2FA** مذكور في الذاكرة (`user_2fa_settings` + `verify-totp`) لكن غير مفروض على Admin/Platform.
- **Password HIBP Check** غير مُفعّل (موصى به لـ Lovable Cloud).
- لا توجد سياسة **Session Timeout** للمستخدمين غير النشطين.
- لا توجد **Audit log viewer** يقرأ من Edge logs مباشرة (موجود `activity_logs` فقط — DB-side).

### 1.7 Performance & Code Quality
- **44 ملف اختبار**: تغطية معقولة لكن معظمها في `__tests__/` — لا توجد E2E (Playwright/Cypress).
- **TODO/FIXME**: صفر — جيد لكن مشبوه (قد يعني عدم توثيق الديون).
- **Documentation**: لا يوجد `README.md` فني للمطوّرين الجدد، لا `CONTRIBUTING.md`، لا `docs/architecture.md`.
- **Storybook**: غير موجود — مع 200+ مكوّن، يستحق التفكير.
- **Bundle analyzer**: غير مُعدّ — لا يمكن قياس حجم كل chunk بدون بناء يدوي.

---

## 2. Strategic Roadmap

### المرحلة 1 — إصلاحات فورية (1–2 أسبوع)
أولوية: ما يضرّ المستخدم النهائي اليوم.

```text
[Auth & Security]
├── إضافة Forgot Password flow (صفحة /auth/forgot + email template)
├── إضافة Google Sign-In إلى Auth.tsx
├── إضافة صفحة /auth/confirm لاستقبال email verification callback
├── تفعيل Password HIBP Check عبر configure_auth
├── فرض 2FA على المستخدمين بدور admin/platform_owner
└── إضافة فحص دور قبل routes الإدارية → 403 صريح

[UX Critical]
├── Toast feedback موحّد بعد كل mutation (helper hook useMutationToast)
├── Empty States موحّدة على أعلى 10 قوائم استخداماً
├── Tooltips على كل أزرار الأيقونات في admin/
└── جولة QA على Dark Mode لكل الصفحات

[Data Hygiene]
└── توحيد quotes/quotations: اختيار واحد + migration + redirects
```

### المرحلة 2 — تحسينات أساسية (3–6 أسابيع)
أولوية: ما يرفع جودة المنتج لمستوى احترافي.

```text
[UX Polish]
├── Skeleton جزئي على كل الصفحات (نمط Dashboard)
├── جعل كل الـ 41 صفحة responsive (إضافة useIsMobile + MobileXxx variants)
├── Onboarding wizard للمستخدم الجديد (3 خطوات: لغة → شركة → أول عميل)
└── صفحة Profile مستقلة (تجنّب redirect)

[Backend Robustness]
├── تقسيم سياسات RLS من cmd=ALL إلى SELECT/INSERT/UPDATE/DELETE منفصلة (لـ audit أوضح)
├── إضافة Deno tests لكل Edge Function (process-payment, approve-*, validate-invoice)
├── Rate Limiting على log-event Edge Function
├── Cron monitoring + alert لو فشل refresh_dashboard_mv
└── إضافة webhook handler عام (Stripe-style signature verification)

[Developer Experience]
├── إضافة README.md + CONTRIBUTING.md + docs/architecture.md
├── إعداد bundle analyzer (rollup-plugin-visualizer)
├── إضافة GitHub Actions CI لتشغيل bunx vitest run + linter على كل PR
└── Storybook لمكوّنات shared/ و ui/

[Performance Validation]
├── قراءة slow_queries_log الفعلي بعد أسبوع تشغيل
├── إصلاح فهارس على tenant_id حيث ينقص
└── استبدال auth.uid() بـ (select auth.uid()) في كل سياسات RLS
```

### المرحلة 3 — توسعة مستقبلية (3–6 أشهر)
أولوية: ما يفتح أسواقاً/شرائح جديدة.

```text
[Internationalization]
├── إضافة i18n (react-i18next) مع EN كلغة ثانية
├── دعم LTR ديناميكي (الذاكرة الحالية RTL strict)
└── ترجمة كل النصوص عبر استخراج إلى ملفات locales/

[Mobile Native]
├── PWA install prompts محسّنة (موجود InstallPage)
├── Push notifications فعلية (Edge Function + VAPID keys)
└── Background Sync لإجراءات offline

[AI & Intelligence]
├── ربط Lovable AI Gateway للـ Decision Engine الموجود
├── ملخّصات AI للمحادثات مع العملاء
├── توقّع المبيعات بناءً على tabs الـ Reports
└── OCR لاستخراج بيانات الفواتير من صور (Edge Function + Vision model)

[Enterprise Features]
├── SAML SSO (مدعوم في Lovable Cloud لكن غير مفعّل)
├── Multi-currency + exchange rates table
├── Multi-warehouse advanced (currently single)
├── e-Invoicing integration (للأسواق التي تتطلبه: السعودية، مصر)
└── API publique مع API keys management

[Observability]
├── E2E tests بـ Playwright لأهم 5 user flows
├── Sentry-style external error tracking
├── Real-user monitoring (RUM) dashboard من Telemetry الموجود
└── Status page عام للـ uptime
```

---

## 3. ما لن نفعله الآن (شُحن مؤخراً، لا حاجة لإعادة عمله)
- Bundle splitting + lazyWithRetry ✓
- Dashboard RPC واحد + skeleton جزئي ✓
- QueryCache global error telemetry ✓
- Performance marks للإقلاع ✓
- Modulepreload للـ vendors ✓
- White-screen shield + SW cleanup ✓
- Materialized views + pg_cron refresh ✓

---

## 4. سؤال للمستخدم (قبل التنفيذ)

أي مرحلة نبدأ بها فعلياً، وهل لديك أولوية محددة داخل المرحلة 1؟ أقترح ترتيباً:
1. **Auth gaps** (Forgot Password + Google Sign-In + HIBP) — أعلى أثر مرئي.
2. **توحيد quotes/quotations** — أعلى أثر معماري طويل المدى.
3. **Toast/Empty States/Tooltips** — أعلى أثر جمالي ومتسق.

إن وافقت، أبدأ بالمسار 1 فوراً وأشحنه قبل الانتقال للتالي.
