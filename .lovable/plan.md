# UX-2A Phase B — Wave 6 (Final-Locked) → Wave 7 → Wave 8

تم دمج الملاحظات الثلاث الأخيرة كتوضيحات في ADR-0011 Amendment A2-bis. لا تغييرات تصميمية، فقط تثبيت دلالات.

---

## 0) التوضيحات الثلاث المُقفَلة في ADR

### C1 — تعريف `expectedVersion` في `appendEvents`
> `expectedVersion` = نسخة الـ Aggregate **قبل** إضافة الأحداث الجديدة (pre-append version) = طول `#history` المُستعاد من `load()`.
> - فاتورة جديدة (لم تُحفظ بعد) → `expectedVersion = 0`.
> - فاتورة مُحمَّلة بـ N أحداث ثم أُضيف M جديد → النداء: `appendEvents(id, N, [...M], ctx)`.
> - عدم التطابق مع التخزين ⇒ `RepositoryFailure.kind = "Conflict"` مع `{ expected, actual }`.

### C2 — دلالة "Frozen" في `pullEvents()`
> `Object.freeze(array)` على المصفوفة المُعادة **فقط** (shallow). لا deep-freeze لكل event، لأن الأحداث منشأة عبر factories تُجمِّد payloadها بالفعل عند الإنشاء (Wave 4). هذا يحافظ على O(1) للسحب.

### C3 — قاعدة عامة لـ BigInt على الحدود
> أي قيمة `bigint` تخرج من `src/domain/finance/**` إلى أي طبقة أخرى **يجب** أن تُحوَّل إلى `string` أولًا.
> - يُفعَّل عبر fitness check `domain-bigint-boundary` يفحص أن DTOs المُصدَّرة من `index.ts` لا تحتوي حقل `bigint` ظاهر.
> - Money view: `{ minor: string; currency: Currency }` — مرجعي للنمط.

---

## 1) Wave 6 — ترتيب التنفيذ المُلزَم (Risk-Minimizing Order)

### Step 1 — `errors/InvoiceDomainError.ts`
- إنشاء Discriminated Union الكامل (R-1101..R-1118b) بدون `message`.
- `Invoice.ts` يعيد التصدير `export { InvoiceDomainError } from "./errors/InvoiceDomainError"` للحفاظ على التوافق الخلفي.
- `assertNever(e)` helper.
- **بوابة:** كل 200 اختبار يبقى أخضر.

### Step 2 — عقود الـ Ports
- `ports/InvoiceRepository.ts`: `load` + `appendEvents(id, expectedVersion, events, ctx)`. **لا** `save()`.
- `ports/InvoiceReadModel.ts`: `byId` + `list(query, ctx): Page<InvoiceView>`.
- `ports/RepositoryFailure.ts`: union مغلق بـ `kind: "Conflict" | "NotFound" | "Transient" | "Unavailable"`.
- `ports/RequestContext.ts`: type alias = `Readonly<{ tenantId; userId; correlationId; now: Instant }>`.
- **بوابة:** `tsgo` أخضر (الـ ports مجرد types، لا تنفيذ).

### Step 3 — `pullEvents()` تثبيت السلوك
- تعديل `Invoice.ts:314-318` ليُرجع `Object.freeze([...this.#uncommitted])` ثم يُفرِّغ.
- اختبارات جديدة في `Invoice.pullEvents.contract.test.ts`:
  - frozen (TypeError on push).
  - النداء الثاني بدون أوامر جديدة = `[]`.
  - النداء بعد `fromHistory()` مباشرة = `[]`.
  - shallow-only: events داخل المصفوفة تبقى frozen (موروث من Wave 4)، لا re-freeze.
- **بوابة:** الاختبارات الجديدة + 200 سابقة خضراء.

### Step 4 — `src/domain/finance/index.ts` (Public Surface)
- يُصدِّر فقط القائمة المُحدَّدة في الخطة السابقة.
- يُحجَب: `statusOf`, helpers داخلية، `__tests__`.
- نقل أي استيراد خارج finance يستخدم مسارًا عميقًا → `@/domain/finance` (لا يوجد حاليًا، فالعملية وقائية).
- **بوابة:** `tsgo` + كل الاختبارات خضراء.

### Step 5 — ADR-0011 Amendment A2-bis
- توثيق C1, C2, C3 + Public Surface النهائي + جدول حالات `RepositoryFailure`.
- **بوابة:** مراجعة بصرية للملف.

---

## 2) Wave 7 — 9 Fitness Checks (تفعيل)

| # | Check | الحالة |
|---|---|---|
| 1 | `domain-purity` (+ `JSON.*` ban) | ACTIVE |
| 2 | `domain-service-purity` (+ `uuid`/`nanoid`/`randomUUID` ban) | ACTIVE |
| 3 | `error-mapping` | ACTIVE |
| 4 | `repository-failure-taxonomy` (يمنع `unknown`/`Error`/`string`/`any`) | ACTIVE |
| 5 | `handler-signature` (يفرض `Readonly<RequestContext>`) | ACTIVE |
| 6 | `ui-infrastructure-isolation` | ACTIVE |
| 7 | `composition-root-uniqueness` (+ `SupabaseClient`/`PrismaClient`) | ACTIVE |
| 8 | `transaction-finality` (يكتشف `commit→write` و `save→commit→save`) | ACTIVE |
| 9 | `domain-api-stability` (allow-list `@/domain/finance` only) | ACTIVE |
| 10 | **`domain-bigint-boundary`** (جديد من C3) | ACTIVE |

= **10 fitness checks جديدة + 6 سابقة = 16 ACTIVE**.

---

## 3) Wave 8 — Exit Gate

- **Coverage:** Statements/Branches/Functions/Lines كلها ≥ 95% على `src/domain/finance/**`.
- **TS Strict (نطاق finance):** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` عبر `tsconfig.finance.json`.
- **Import Audit:** allow-list صريح (`shared-kernel/*` + siblings فقط).
- **Zero-Change Audit:** بوابة CI رسمية — لا تعديلات خارج `src/domain/finance/**`, `scripts/fitness/**`, `docs/adr/**`, `CHANGELOG.md`.
- **ADR-0011 Amendment A3:** توثيق Public Surface النهائي + `appendEvents` contract + `domain-api-stability` + `domain-bigint-boundary`.

---

## 4) معايير القبول النهائية

- ✅ Wave 6: 5 خطوات بالترتيب، كل خطوة لا تكسر اختبارًا.
- ✅ 10 fitness checks ACTIVE بصفر انتهاكات (16 إجمالًا).
- ✅ Coverage finance ≥95% على المؤشرات الأربعة.
- ✅ Zero-Change Audit أخضر.
- ✅ ADR-0011 A2-bis + A3 معتمدان.
- ✅ لا `save()`, لا `message` في أخطاء الدومين, لا `bigint` يعبر حدود الدومين, لا استيراد عميق من خارج finance.

هل أبدأ Wave 6 Step 1 الآن؟
