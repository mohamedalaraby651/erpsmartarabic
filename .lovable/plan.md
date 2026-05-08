# خطة المرحلة القادمة — ERP Stabilization & Hardening

> **القرار الاستراتيجي:** إيقاف توسعة الميزات مؤقتاً والتركيز على تقليل التعقيد، حماية التكامل المالي، ورفع جاهزية الإنتاج. هذه الخطة تنفّذ المرحلة 1 (Hardening) من خارطة طريقك مع تمهيد للمرحلة 2.

---

## مبادئ التنفيذ
- **لا تغيير في السلوك التجاري** — كل ما هنا إعادة هيكلة وحماية.
- **تنفيذ تدريجي قابل للتراجع** — كل بند مستقل، يُختبر منفرداً.
- **الأرقام والحسابات لا تُمسّ** — فقط الطبقات والحوكمة.
- **لا أعمال جديدة كبيرة قبل اكتمال P0**.

---

## المرحلة 1 — Hardening (P0، أولوية حرجة)

### 1. حماية القيود المحاسبية (Immutable Ledger)
**الهدف:** منع تعديل أو حذف القيود المرحَّلة نهائياً على مستوى DB.

- إضافة عمود `is_posted` + `posted_at` + `posted_hash` على `journal_entries` و `journal_lines` (موجود جزئياً — تحقق وتوحيد).
- Trigger `BEFORE UPDATE/DELETE` على `journal_entries` يمنع أي تغيير عند `is_posted = true` ما عدا حقل `reversed_by`.
- Trigger `BEFORE UPDATE/DELETE` على `journal_lines` يمنع أي تعديل بعد الترحيل.
- إنشاء جدول `journal_reversals` لتسجيل reversals كقيود جديدة (append-only).
- اختبار: محاولة UPDATE على قيد مرحَّل ترجع خطأ واضح بالعربية.

### 2. Financial Invariants Tests
**الهدف:** ضمان أن `SUM(debit) = SUM(credit)` لكل قيد، ولا توجد journal_lines يتيمة.

- إنشاء `src/__tests__/integration/financial-invariants.test.ts` يفحص:
  - `debit == credit` لكل journal entry (عبر RPC `assert_journal_balanced`).
  - عدم وجود `journal_lines` بدون `journal_entry`.
  - posting atomicity: إنشاء فاتورة → القيد المنشأ متوازن.
  - rollback safety: حذف فاتورة draft لا يترك قيوداً.
- إضافة DB function `public.validate_ledger_integrity()` تستدعى من الاختبار وتعيد تقريراً.

### 3. Sync Conflict Resolution (Offline + Accounting)
**الهدف:** حماية مزامنة الفواتير/المخزون/الدفعات من التكرار والتعارض.

- إضافة عمود `client_request_id UUID UNIQUE` على: `invoices`, `payments`, `stock_movements`, `quotes`.
- تعديل `useOfflineMutation` ليرسل `client_request_id` ثابت من IndexedDB.
- إضافة UNIQUE constraint جزئي يمنع التكرار.
- إضافة عمود `version INT` (optimistic locking) على الجداول الحساسة، ورفض `UPDATE` إذا اختلف.
- جدول `sync_conflicts` لتسجيل أي تعارض لمراجعة لاحقة.

### 4. فرض الصلاحيات في الـ Backend (Authorization Hardening)
**الهدف:** إزالة أي اعتماد على إخفاء UI كآلية أمان.

- مراجعة كل العمليات الحساسة (إنشاء فاتورة، اعتماد، حذف، خصم، credit note، تعديل سعر) والتأكد أنها تمر عبر:
  - Edge Function تتحقق من `has_role` و `has_limit`، أو
  - RLS policy + RPC مع `SECURITY DEFINER` يفحص الدور.
- مسح `rg "permission|isAdmin|hasRole" src/components` — أي check لا يُكرَّر في DB يُعتبر زينة فقط.
- توثيق كل عملية حساسة في `docs/AUTHORIZATION_MATRIX.md` (من → ماذا → أين يُفحص).

### 5. Observability Stack
**الهدف:** معرفة ما يحدث في الإنتاج.

- تركيب **Sentry** للـ frontend (مع `import.meta.env.PROD` فقط) — error + performance.
- ربط Sentry بـ React Query لرصد الـ failed queries.
- إضافة `lib/observability.ts` (موجود — توسيعه) ليرسل breadcrumbs مع userId/tenantId.
- Edge Functions: structured logging موحَّد `{level, ts, fn, tenantId, userId, msg}`.
- Dashboard في Cloud لمتابعة `function_edge_logs` بفلاتر جاهزة.

### 6. تقسيم الملفات الضخمة (>400 سطر)
**الهدف:** إعادة maintainability بدون كسر سلوك.

| الملف | الأسطر | استراتيجية التقسيم |
|---|---|---|
| `RestoreBackupDialog.tsx` | 1216 | container + 4-5 sections + `useRestoreFlow` hook + سحب logic للـ backupRestoreParser |
| `CustomerDetailsPage.tsx` | 558 | tabs مستقلة (overview/invoices/payments/timeline) + sub-routes |
| `CustomerListCard.tsx` | 538 | بطاقة + drawer منفصل + actions hook |
| `arabicFont.ts` | 512 | تحميل الخط في chunk منفصل (lazy) — هو فعلاً فيه bytes كبيرة |
| `pdfGenerator.ts` | 509 | فصل templates لكل نوع وثيقة |
| `MobileDrawer.tsx` | 489 | sections + items config منفصل |
| `ReturnsReportPage.tsx` | 487 | filters + table + KPIs |
| `QuotationsPage.tsx` | 484 | list + filters + bulk actions |
| `CreditNoteFormDialog.tsx` | 477 | header + items + totals (موجود في invoices — كرّر النمط) |
| `BackupTab.tsx` | 466 | export section + restore section |

**القاعدة:** كل ملف بعد التقسيم ≤ 300 سطر، نفس السلوك تماماً، نفس الاختبارات تمر.

### 7. Background Job Infrastructure
**الهدف:** تحويل العمليات الثقيلة إلى async.

- استخدام **`pg_cron` + `pg_net`** (متوفّر في Supabase) لجدولة:
  - تحديث materialized views (يومياً 2 صباحاً).
  - فحص تذكيرات العملاء (كل ساعة).
  - تنبيهات عمر الديون (يومياً).
  - تنظيف `sync_conflicts` المحلولة (أسبوعياً).
- جدول `job_runs (id, name, started_at, finished_at, status, error)` لتتبع التنفيذ.
- Edge Function `job-runner` يستقبل HTTP من pg_cron وينفّذ المهمة.

---

## المرحلة 2 — Maintainability (P1، بعد اكتمال P0)

### 8. Domain Layer منفصل
- إنشاء `src/lib/domain/{accounting,inventory,sales,treasury,customers}/`
- نقل قواعد الأعمال (validations, calculations, workflows) من components/hooks إلى `domain/*/rules.ts`.
- hooks تستدعي `domain` فقط، components تستدعي hooks فقط.

### 9. Architecture Governance
- ESLint rules: حد أقصى 300 سطر، منع `as any`، منع import من `pages` داخل `components`.
- إضافة `dependency-cruiser` config لمنع تداخل الطبقات.
- Pre-commit hook (Husky) لتشغيل lint + tsc.

### 10. Design System Tokens
- توثيق tokens الموجودة في `index.css` في `docs/DESIGN_SYSTEM.md`.
- إضافة Storybook خفيف (أو MDX) لـ shadcn variants المخصّصة.
- linter rule يمنع ألوان hex/rgb مباشرة في components.

---

## المرحلة 3 — Scalability (P2، تمهيد فقط الآن)

- Materialized views موجودة — توسيعها للتقارير الثقيلة (Top Customers، Aging، Sales by Period).
- إضافة CDN headers للـ PWA assets.
- Lazy-load PDF/Excel/Arabic font chunks (موجود جزئياً).

---

## التسليمات لكل مرحلة

| المرحلة | المخرَج |
|---|---|
| 1.1 | Migration: triggers + جدول reversals + اختبار يفشل عند محاولة تعديل |
| 1.2 | ملف اختبار + RPC + 0 invariant violations |
| 1.3 | Migration: client_request_id + version columns + تعديل useOfflineMutation |
| 1.4 | docs/AUTHORIZATION_MATRIX.md + Edge Functions موحَّدة |
| 1.5 | Sentry يعمل في الإنتاج + Dashboard logs |
| 1.6 | 10 ملفات ≤ 300 سطر + نفس الاختبارات تمر |
| 1.7 | pg_cron جدول مفعّل + job-runner deployed + جدول job_runs |

---

## ما لن نفعله الآن
- ❌ ميزات جديدة (موديولات/تقارير/شاشات).
- ❌ تغيير حسابات مالية أو منطق ضرائب.
- ❌ تبنّي queue خارجي (BullMQ/Temporal) — pg_cron يكفي حالياً.
- ❌ CQRS كامل — فقط materialized views.
- ❌ SSO/SAML — تأجيل للمرحلة 4.

---

## خطة تنفيذ مقترحة (Sprints)

```
Sprint 1 (P0-أعلى): 1.1 Immutable Ledger + 1.2 Invariants Tests
Sprint 2 (P0):       1.4 Authorization Matrix + 1.5 Sentry
Sprint 3 (P0):       1.3 Sync Conflict Resolution
Sprint 4 (P0):       1.6 تقسيم 5 ملفات (الأكبر أولاً)
Sprint 5 (P0):       1.6 تقسيم 5 ملفات + 1.7 pg_cron
Sprint 6 (P1):       2.8 Domain Layer (accounting + sales)
Sprint 7 (P1):       2.9 Architecture Governance + 2.10 Design tokens
```

كل Sprint = جلسة مستقلة، تنتهي بـ: tsc نظيف + الاختبارات الموجودة تمر + لقطة سلوك في المعاينة مطابقة لما قبلها.

---

## نقطة البداية المقترحة
ابدأ بـ **Sprint 1** (Immutable Ledger + Invariants) لأنه:
- أعلى مخاطرة مالية إن تأخّر.
- مستقل تماماً عن باقي العمل.
- يكشف فوراً أي قيود غير متوازنة موجودة في DB حالياً.

وافق على الخطة لأبدأ بـ Sprint 1 — أو حدّد Sprint مختلف لو أردت ترتيباً آخر.