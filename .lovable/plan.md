# UX-2B Wave 1 — Application Layer (Invoice Command Handlers) — v2

تُحدِّث هذه النسخة نقطتين بناءً على ملاحظاتك، وتُبقي بقية النطاق كما اعتُمد.

---

## التعديل 1 — `committedVersion()` بدلالة مجال موثَّقة

تُضاف على `Invoice` (داخل سطح UX-2A، Contract Gap **D5**) مع توثيق صريح:

```ts
/**
 * Committed version = number of events already persisted for this aggregate.
 *  - brand-new aggregate (never persisted) ⇒ 0
 *  - rehydrated from N events             ⇒ N
 * Uncommitted events do NOT advance this number; they advance it only after
 * `appendEvents` succeeds and the aggregate is reloaded.
 * This is the value to pass as `expectedVersion` to InvoiceRepository.
 */
committedVersion(): number
```

تحديثات مرافقة:
- ADR-0011 §A4 — توسعة محدودة للسطح، ليست كسراً للقفل.
- `ux2a-wave8-defects.json` — إدراج D5 (Contract Gap موثَّق).
- `ux2a-wave8-surface.json` — تحديث snapshot السطح.
- اختبار وحدة على `Invoice` يثبت: `create` ⇒ 0، `fromHistory(N)` ⇒ N، بعد `issue/applyPayment/void` يبقى الرقم على آخر قيمة ملتزمة حتى يُسحب الـ events ويُعاد التحميل.

> طبقة Application لا تحسب أي رقم بنفسها؛ تستدعي `invoice.committedVersion()` فقط.

---

## التعديل 2 — توحيد عقد الأخطاء (لا تسرّب لـ `RepositoryFailure`)

سيكون توقيع كل Handler بدقة:

```ts
execute(
  ctx: Readonly<RequestContext>,
  cmd: <CommandDTO>,
): Promise<Result<HandlerOk, ApplicationError>>
```

**`ApplicationError` يصبح الحدّ الوحيد بين طبقة Application وما فوقها** (UI/Edge/Adapters). لا `DomainError` ولا `RepositoryFailure` يظهران في التوقيع. الـ Handler يلفّ كل شيء:

```ts
export type ApplicationError =
  | { readonly kind: "ValidationFailed"; readonly field: string; readonly reason: string }
  | { readonly kind: "DomainRejected"; readonly cause: InvoiceDomainError }   // مغلَّف
  | { readonly kind: "NotFound"; readonly id: string }
  | { readonly kind: "ConcurrencyConflict"; readonly expectedVersion: number; readonly actualVersion: number }
  | { readonly kind: "InfrastructureUnavailable"; readonly retryable: boolean; readonly category: RepositoryFailure["kind"] };
```

ملاحظات على التغليف:
- `InvoiceDomainError` يبقى **بنية معروفة** داخل `DomainRejected.cause` لأن طبقة UI/i18n تحتاج تمييز الـ `kind` لعرض الرسائل المناسبة، لكنه يصل دائماً مغلَّفاً داخل `ApplicationError` ولا يظهر مستقلاً في التوقيع.
- `RepositoryFailure` **لا يُمرَّر أبداً** للخارج. يُختزل إلى: `NotFound` / `ConcurrencyConflict` / `InfrastructureUnavailable`. حقل `retryable` يُحسب داخل الـ Handler عبر `isRetryable()` (المصدر الوحيد، ADR-0010) و`category` يحفظ التصنيف الأصلي للـ telemetry دون كشف الـ `cause` أو الـ `message` الخام.
- أخطاء التحقق الشكلي للـ DTO (currency code غير معروف، quantity سالب على مستوى الـ DTO، إلخ) تُرجَع كـ `ValidationFailed` قبل لمس الـ aggregate.

`assertNever` exhaustiveness helper مرفق ليُجبر الـ UI لاحقاً على التعامل مع كل `kind`.

---

## ما سيُبنى (لم يتغيّر هيكلياً)

```text
src/application/finance/invoice/
├── commands/
│   ├── IssueInvoiceCommand.ts
│   ├── ApplyPaymentCommand.ts
│   └── VoidInvoiceCommand.ts
├── handlers/
│   ├── IssueInvoiceHandler.ts        # load? → create → issue → appendEvents(committedVersion)
│   ├── ApplyPaymentHandler.ts        # load → applyPayment → appendEvents(committedVersion)
│   └── VoidInvoiceHandler.ts         # load → void → appendEvents(committedVersion)
├── errors/ApplicationError.ts        # union أعلاه + assertNever + mapRepositoryFailure (private)
├── __tests__/
│   ├── IssueInvoiceHandler.test.ts
│   ├── ApplyPaymentHandler.test.ts
│   ├── VoidInvoiceHandler.test.ts
│   ├── determinism.test.ts
│   ├── concurrency.test.ts
│   └── fakes/
│       ├── InMemoryInvoiceRepository.ts   # يحاكي expectedVersion بدقّة
│       ├── FixedClock.ts
│       └── DeterministicIdPort.ts
└── index.ts                          # السطح العام لـ UX-2B Wave 1
```

## بروتوكول الـ Handler (موحّد)

1. تحقّق شكلي من الـ DTO → عند الفشل: `err(ValidationFailed)`.
2. بناء VOs (Money/TaxRate/InvoiceId/…) → الفشل ⇒ `ValidationFailed`.
3. `repo.load(id, ctx)` (أو إنشاء جديد في Issue) → `NotFound` / `InfrastructureUnavailable`.
4. استدعاء أمر الـ aggregate (`issue`/`applyPayment`/`void`) مع `clock.now()` و`id.next()` → الفشل ⇒ `DomainRejected`.
5. `const version = invoice.committedVersion();` ثم `repo.appendEvents(id, version, invoice.pullEvents(), ctx)`.
6. تصنيف فشل الـ append: `Conflict` ⇒ `ConcurrencyConflict`، البقية ⇒ `InfrastructureUnavailable { retryable: isRetryable(f) }`.
7. إرجاع `ok({ id, version: version + appended.length })`.

لا قراءة بعد كتابة. لا `throw`. لا `console.*`.

## Fitness — `check-application-purity.mjs` (جديد، يُضاف إلى ACTIVE)

يمنع في `src/application/**` (ما عدا `__tests__/`):
- استيراد `@/integrations/**`, `@/lib/repositories/**`, أو أي شيء فيه `supabase`.
- `new Date(`, `Date.now(`, `Math.random(`, `crypto.randomUUID(`.
- استيراد عميق من `src/domain/finance/**` (السطح فقط: `@/domain/finance`).
- `throw new` في أي ملف `*Handler.ts`.
- وجود `RepositoryFailure` في توقيع أي export من ملف `*Handler.ts` (regex على نص الـ return type) — يضمن عدم تسرّب نوع البنية التحتية.

`check-handler-signature` القائم سيلتقط الـ handlers تلقائياً بمجرد ظهورها (وقد رأينا أنه vacuous-pass حالياً).

## بوّابة الخروج المصغّرة (Wave 1)

| فحص | الحد |
|---|---|
| `tsgo` على `src/application/finance/**` بصرامة `tsconfig.finance.json` الموسَّعة | 0 |
| `vitest run src/application/finance` | ≥ 95% S/F/L، ≥ 90% B |
| `scripts/fitness/run-all.mjs` | 18/18 (يشمل `check-application-purity`) |
| `src/domain/finance/**` diff | فقط `committedVersion()` + اختباره، موثَّق كـ D5 |
| تحقّق عقد الأخطاء | grep يثبت أن لا `RepositoryFailure` يظهر في أي توقيع تحت `src/application/finance/**` |

## تسلسل التنفيذ

1. توسيع `tsconfig.finance.json` (أو إنشاء `tsconfig.application.json` يرث منه) ليشمل `src/application/finance/**`.
2. إضافة `committedVersion()` + اختباره؛ تحديث ADR + D5 + surface snapshot.
3. كتابة `ApplicationError` + `mapRepositoryFailure` (داخلي، غير مُصدَّر).
4. كتابة الـ commands + fakes.
5. كتابة الـ handlers الثلاثة + اختباراتها (Happy / Domain rejections / NotFound / Conflict / Unavailable / Determinism / Concurrency).
6. كتابة `check-application-purity.mjs` وتفعيله في `run-all.mjs`.
7. تشغيل البوّابة وتسجيل النتيجة تحت `downstream.ux2b_wave1` في `ux2a-wave8-lock.json` دون المساس بقفل UX-2A.

## خارج النطاق (مؤكَّد)

- Supabase repository adapter — Wave 2.
- Outbox/Event publishing — Wave 3.
- UI wiring واستبدال `invoiceRepository` القديم — Wave 4.
- Read-side (`InvoiceReadModel` adapter + Query handlers) — موجة منفصلة.

هل أبدأ التنفيذ بهذا النطاق المُحدَّث؟
