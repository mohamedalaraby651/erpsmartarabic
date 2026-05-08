# خطة التثبيت والتقوية المعمارية الشاملة — ERP Smart Arabic / Nazra

## الهدف
ليس إضافة ميزات. المهمة هي **تدقيق + تقوية + إعادة هيكلة** على 9 مراحل، مع الحفاظ الكامل على:
RTL العربي، التعدد المستأجر (multi-tenant)، صحة المحاسبة، تدفقات الأعمال القائمة، وسلوك الموبايل.

## مبادئ تنفيذية
- **عمل تراكمي بدفعات صغيرة** (PR-style) لتجنب كسر التدفقات.
- بعد كل دفعة: `tsc --noEmit` + قراءة console/network + اختبارات موجودة.
- **لا** تكرار، **لا** placeholders، **لا** wrappers زائدة.
- إعادة استخدام المخازن الموجودة: `repositories/`, `financial-engine/`, `services/`.

---

## المرحلة 1 — تدقيق شامل (Audit)

ينتج عنها مستند واحد: `docs/architecture-hardening-audit.md`

سيتضمن جداول لكل بند مع: الموقع، الخطورة (Critical/High/Med/Low)، التوصية، المرحلة المعالِجة.

نطاق المسح:
1. الملفات > 400 سطر (مرشحة للتقسيم).
2. مكونات React بمنطق أعمال داخلها.
3. استخدامات `supabase.from(...)` المباشرة من المكونات (يجب أن تمر عبر repositories).
4. سياسات RLS الناقصة `tenant_id`، الدوال `SECURITY DEFINER` بدون `set search_path`.
5. Edge Functions: التحقق من JWT، CORS، Zod validation، idempotency.
6. منطق محاسبي خارج `financial-engine/`.
7. طابور المزامنة offline: مفاتيح idempotency، إصدارات (versioning).
8. `invalidateQueries` المتفرقة (سنوحدها في `queryKeys` factory).
9. أنماط `any` / `as never` / DTOs ضعيفة.
10. مشاكل أداء: `useMemo`/`useCallback` ناقصة في قوائم كبيرة، عدم استخدام virtualization.

أدوات: `rg` على الأنماط، `supabase--linter`, `security--run_security_scan`, قراءة logs.

---

## المرحلة 2 — إعادة هيكلة الفرونت

البنية المستهدفة (تكميلية وليست بديلة):
```text
src/
  components/   ← UI فقط (presentational)
  features/     ← تركيب feature-level (يجمع UI + hooks)
  domain/       ← أنواع وقواعد عمل خالصة (pure)
  services/     ← orchestration (يستدعي repositories + edge functions)
  repositories/ ← وصول DB فقط
  hooks/        ← React hooks (state + queries)
  lib/          ← أدوات عامة
```

أهداف ملموسة (دفعات):
- **Batch A**: إكمال تقسيم ملفات `admin/` المتبقية > 500 سطر بنفس النمط الذي طُبّق على `RestoreBackupDialog` (constants → views → hook → presentational shell).
- **Batch B**: استخراج منطق فواتير/عروض من المكونات إلى `services/invoiceService` و `services/quoteService`. المكون يبقى عرضًا فقط.
- **Batch C**: نقل كل `supabase.from(...)` من `src/components/**` و `src/pages/**` إلى repositories.
- **Batch D**: lazy boundaries لمسارات التقارير والمحاسبة الثقيلة + Suspense fallback موحّد.
- **Batch E**: `queryKeys` factory مركزي + إزالة سلاسل المفاتيح المتكررة.

---

## المرحلة 3 — تقوية الأمان

- مراجعة كل سياسة RLS للتأكد من شرط `tenant_id = current_tenant_id()` (دالة موجودة) — أي جدول ناقص → migration.
- كل `SECURITY DEFINER` يجب أن يحوي `SET search_path = public` ويمرر `_user_id` بدل الاعتماد على `auth.uid()` فقط حيث يلزم تدقيق.
- Edge Functions: إضافة Zod للـ body، CORS من SDK، فحص JWT عند الحاجة، **idempotency key** للعمليات المالية (`process-payment`, `restore-backup`, `approve-invoice`).
- جدول `operation_idempotency(key, tenant_id, request_hash, response, created_at)` مع unique على (tenant_id, key) — حماية من replay.
- إزالة أي تحقق صلاحيات client-only للعمليات الحساسة → استبداله بـ RPC `check_section_permission` / `check_financial_limit` (موجودة).
- مستند: `docs/security-hardening-report.md`.

---

## المرحلة 4 — سلامة المحاسبة

- التحقق من أن كل posting يمر عبر `financial-engine/journal.service` فقط.
- Triggers DB لمنع `UPDATE`/`DELETE` على journal_entries المرحّلة (posted) — التصحيح بقيد عكسي فقط.
- Invariant tests: `SUM(debit) = SUM(credit)` لكل journal، عدم وجود posting في فترة مغلقة.
- اختبارات: `src/__tests__/integration/accounting-workflow.test.ts` (موجود) — إضافة حالات: double-post، replay payment، rollback مع credit note.

---

## المرحلة 5 — تقوية المزامنة Offline

- إضافة `client_op_id` (UUID) لكل عملية في `syncQueue` → unique على السيرفر لمنع التكرار.
- `version` (updated_at أو int) على الجداول الحرجة (invoices, stock_movements) → optimistic concurrency: رفض الكتابة إذا اختلف الإصدار.
- استراتيجية تسوية واضحة: server-wins افتراضيًا، مع تسجيل التعارض في `sync_conflicts`.
- منع مزامنة عمليات مالية بدون مراجعة المستخدم بعد فترة طويلة offline.

---

## المرحلة 6 — الأداء

- توحيد `staleTime`/`gcTime` عبر `queryConfig` (موجود) لكل عائلة بيانات.
- Virtualization للجداول > 200 صف (TanStack Virtual أو الـ hook الموجود `useVirtualList`).
- Code-splitting لمسارات التقارير (`React.lazy` + `lazyWithRetry` الموجود).
- Materialized views موجودة → التحقق من جدولة `pg_cron` و fallback.
- إزالة re-renders: `React.memo` على عناصر القائمة، `useStableCallback` (موجود) في الأماكن الحرجة.

---

## المرحلة 7 — أمان الأنواع

- مسح `any`/`as never`/`as unknown as` → استبدال بأنواع `entities.ts` أو Zod schemas.
- توحيد DTOs في `domain/` لكل وحدة (Invoice, Payment, Journal...).
- `tsconfig` تشديد تدريجي: `noUncheckedIndexedAccess` (لو لم يكن مفعلًا).

---

## المرحلة 8 — Observability

- Logger مركزي موجود (`observability.ts`, `runtimeTelemetry.ts`) — توحيد الاستخدام، إزالة `console.log` المباشر.
- Correlation ID لكل طلب edge function (header `x-correlation-id`) ينتقل لـ `activity_logs`.
- نقاط دمج جاهزة (لا تفعيل) لـ Sentry / OTel عبر واجهة واحدة في `lib/observability.ts`.

---

## المرحلة 9 — حوكمة هندسية

مستند `docs/engineering-standards.md` يغطي:
- بنية المجلدات، تسمية الملفات، حجم الملف الأقصى (500 سطر)، قواعد الـ hooks، معايير الاختبارات، معايير migrations (مثال: لا triggers على schemas محجوزة).

---

## المخرجات النهائية
1. `docs/architecture-hardening-audit.md`
2. `docs/security-hardening-report.md`
3. `docs/engineering-standards.md`
4. كود مُعاد هيكلته على دفعات صغيرة قابلة للمراجعة.
5. Migrations للأمان/المحاسبة/idempotency.
6. اختبارات تكامل ومحاسبية إضافية.

## ترتيب التنفيذ المقترح
المرحلة 1 (تدقيق) → 3 + 4 (أمان/محاسبة أولًا) → 5 (offline) → 2 (refactor تراكمي) → 6 → 7 → 8 → 9.

---

## ما أحتاج تأكيده قبل البدء
- هل أبدأ فورًا من **Batch A للمرحلة 2** (إكمال تقسيم ملفات admin الكبيرة) بالتوازي مع كتابة مستند التدقيق المرحلة 1، أم تفضّل أن أُنجز التدقيق الكامل أولًا وأعرضه للموافقة قبل أي تعديل كود؟


## 2026-05-08 — Hardening progress (continuation)
- ✅ `operation_idempotency` table + RLS + `prune_expired_idempotency()` deployed.
- ✅ Repository extensions: `customerRepository.findActiveSafe()`, `productRepository.findActive()`, `invoiceRepository.bulkInsertItems()` / `deleteItemsByInvoice()`.
- ✅ New service: `invoiceService.saveInvoiceWithItems()` — sole entry for create/update from UI.
- ✅ Refactored `InvoiceFormDialog` to remove all direct `supabase.from(...)` calls, now uses repos + service + `queryKeys.invoices.all`.
- Next: edge-function hardening (`x-correlation-id` + idempotency check in `process-payment` / `create-journal`), then continue Batch C migration of remaining direct supabase calls in pages.
