# Wave 4 — Event Sourcing Alignment (Locked Scope)

تنفيذ التحول البنيوي لـ `Invoice` من mutable-status إلى **event-sourced aggregate** كما يفرض ADR-0011 §3, §5, §6 (R-1108b, R-1110a–c). كل التعديلات محصورة داخل `src/domain/finance/**` + إضافة طفيفة في `src/shared-kernel/events/`.

---

## ١) القرارات المعتمدة (من حوار المراجعة)

| البند | القرار |
|---|---|
| توقيت Event Sourcing | **الآن** — قبل Payments/Void، لتثبيت البنية قبل إضافة السلوك |
| حقن الزمن/الهوية | **parameters صريحة** على كل transition — لا `ClockPort`/`IdPort` داخل الـ aggregate |
| تسلسل الأحداث | `DomainEvent` → `InvoiceEvent` → الأحداث المتخصصة (قابل لإعادة الاستخدام عبر BCs) |
| `#status` | **يُحذف بالكامل** — `status()` reducer-only؛ لا cached field على السطح |
| Rehydration | `Invoice.fromHistory(events)` فقط — **لا snapshots** في هذه المرحلة |
| `pullEvents()` | **drain semantics** — يُرجع الأحداث الجديدة غير المنشورة ثم يفرغها |

---

## ٢) ما يُبنى في هذه الموجة

### أ) Shared Kernel — DomainEvent base (إن لم يكن موجوداً بالشكل المطلوب)

تحت `src/shared-kernel/events/`:

```text
DomainEvent.ts        // base envelope: eventId, occurredAt, sequence
DomainEventId.ts      // Id<"DomainEvent"> alias
Instant.ts            // (موجود مسبقاً في time/ — يُعاد استخدامه)
```

`DomainEvent` interface:
- `readonly eventId: DomainEventId`
- `readonly occurredAt: Instant`
- `readonly sequence: number` (≥1, monotonic, gap-free — التحقق مسؤولية الـ aggregate)
- `readonly metadata?: Readonly<{ correlationId?: string; causationId?: string }>`

سأفحص `src/shared-kernel/events/` أولاً قبل الإنشاء وأعيد استخدام الموجود إن أمكن.

### ب) Finance Invoice Events

تحت `src/domain/finance/invoice/events/`:

```text
InvoiceEvent.ts                // extends DomainEvent; adds invoiceId
InvoiceIssued.ts               // + number, currency, lines snapshot, totalGross
InvoicePaymentApplied.ts       // + amount: Money            (payload فقط — السلوك في Wave 5)
InvoiceVoided.ts               // + reasonCode: VoidReasonCode (payload فقط — السلوك في Wave 5)
index.ts                       // discriminated union AnyInvoiceEvent
```

كل event:
- `Readonly<…>` بالكامل، بدون methods، بدون behavior.
- `type` discriminant: `"InvoiceIssued" | "InvoicePaymentApplied" | "InvoiceVoided"`.
- في Wave 4 نُعرّف الأنواع الثلاثة كاملة، لكن نُصدر فقط `InvoiceIssued` فعلياً عبر `issue()`. الباقي يصبح فاعلاً في Wave 5.

### ج) Reducer + Status

تحت `src/domain/finance/invoice/`:

```text
InvoiceStatus.ts      // type "Draft" | "Issued" | "PartiallyPaid" | "Paid" | "Void"
                      // (PartiallyPaid مُعرَّف الآن لكن غير قابل للوصول قبل Wave 5)
statusOf.ts           // pure reducer: (events: readonly AnyInvoiceEvent[]) => InvoiceStatus
```

`statusOf` يطبّق transition table ADR §5 بحرفيتها. أي تسلسل غير قانوني يُعتبر مستحيلاً هنا لأن `record()` يرفضه عند الإصدار، و`fromHistory()` يرفضه عند الإعادة.

### د) إعادة هيكلة `Invoice.ts`

التغييرات المحورية:

- **حذف**: `#status`, `#lines` كحالة قابلة للتعديل، `markPaid()`, `cancel()` (تنتقل لـ Wave 5 بأسماء ADR: `applyPayment` / `void`).
- **يُحتفظ به** (يُعاد توصيله عبر الـ reducer):
  - `addLine` / `removeLine` — يبقيان structural-only في `Draft` (لا يولدان events؛ تعديلات pre-issue على draft؛ يصبحان جزءاً من snapshot `InvoiceIssued`).
  - `totalNet/totalTax/totalGross` — تبقى projections من الـ lines الحالية.
- **يُضاف**:
  - `#history: AnyInvoiceEvent[]` — كل الأحداث المعتمدة (تاريخ + جديدة).
  - `#uncommitted: AnyInvoiceEvent[]` — الأحداث الجديدة منذ آخر `pullEvents()`.
  - `#nextSequence: number` — يبدأ من 1.
  - `record(event)` (من `AggregateRoot` أو خاص) — يلحق بـ history + uncommitted، يزيد sequence.
  - `pullEvents(): readonly AnyInvoiceEvent[]` — **drain**: يُرجع نسخة مجمّدة من `#uncommitted` ثم يفرغها. الاستدعاء التالي يُرجع `[]` حتى يحدث `record` جديد.
  - `getHistory(): readonly AnyInvoiceEvent[]` — للقراءة فقط (للاختبارات/التشخيص).
  - `status(): InvoiceStatus` — يُحسب دائماً بـ `statusOf(this.#history)`.
  - `issue(now: Instant, eventId: DomainEventId): Result<void, InvoiceError>`:
    1. guard: status === Draft، lines.length ≥ 1، R-1101..R-1105 (دلتا تحقق إضافية إن لزم).
    2. يبني `InvoiceIssued` بـ `sequence = #nextSequence`.
    3. `record(event)`.
  - `static fromHistory(events: readonly AnyInvoiceEvent[]): Result<Invoice, InvoiceError>`:
    - يتحقق R-1110c: `sequence` متصلة `1..n` بدون فجوات/تكرار/ترتيب خاطئ → وإلا `CorruptEventStream`.
    - يبني invoice فارغ ثم يطبّق كل حدث عبر apply داخلي.
    - بعد البناء: `#uncommitted = []` (لأن كل الأحداث "تاريخية"، ليست جديدة).
- **يبقى Pure**: لا `Date.now()`, لا UUID generation, لا I/O.

### هـ) تصنيف الأخطاء (إضافات)

```ts
type InvoiceEventStreamError =
  | { kind: "CorruptEventStream"; reason: "GapInSequence" | "Duplicate" | "OutOfOrder" | "EmptyHistory" }
  | { kind: "IllegalReplayTransition"; from: InvoiceStatus; eventType: string };

type InvoiceError = InvoiceDomainError | InvoiceLineError | MoneyDomainError | InvoiceEventStreamError;
```

### و) الاختبارات

تحت `src/domain/finance/invoice/__tests__/`:

- `events/InvoiceIssued.test.ts` — payload immutability، الـ discriminant.
- `statusOf.test.ts` — كل خلية في transition table + الحالات الفارغة (`[]` → `Draft`).
- `Invoice.eventsourcing.test.ts`:
  - `issue()` يولّد حدثاً واحداً بـ `sequence=1`.
  - `pullEvents()` يُرجع الحدث الجديد ثم يصبح فارغاً.
  - الاستدعاء الثاني لـ `pullEvents()` بدون `record` جديد → `[]`.
  - `status()` ينتقل من `Draft` إلى `Issued` بعد `issue()`.
  - بعد `issue()`، `addLine` يرجع `StructuralEditLocked`.
- `Invoice.rehydration.test.ts`:
  - round-trip: `issue → pullEvents → fromHistory(events) → status()==='Issued'` و projections تطابق.
  - رفض: gap (`[seq=1, seq=3]`)، duplicate (`[seq=1, seq=1]`)، تنازلي، تاريخ فارغ، حدث غير قانوني بعد terminal.
- `Invoice.test.ts` (القديمة): تحديث/إزالة اختبارات `markPaid`/`cancel` (يعاد إدخالها في Wave 5 بأسماء ADR).

**هدف العداد:** الإبقاء على الأخضر بالكامل، مع زيادة العدد بـ ~25–35 اختباراً جديداً.

---

## ٣) الـ API السطحي بعد Wave 4

```ts
class Invoice extends AggregateRoot<"InvoiceId"> {
  static create(props): Result<Invoice, InvoiceDomainError>;
  static fromHistory(events): Result<Invoice, InvoiceError>;

  // identity & basics
  getNumber(): InvoiceNumber;
  getCurrency(): Currency;
  getCustomerId(): CustomerId | undefined;

  // derived state
  status(): InvoiceStatus;                 // ← reducer-only، لا حقل مخزّن
  getLines(): readonly InvoiceLine[];      // snapshot دفاعي

  // structural (Draft only)
  addLine(line): Result<void, InvoiceDomainError>;
  removeLine(index): Result<void, InvoiceDomainError>;

  // lifecycle (event-sourced)
  issue(now: Instant, eventId: DomainEventId): Result<void, InvoiceError>;
  // applyPayment + void → Wave 5

  // aggregation (لا تغيير)
  totalNet(): Result<Money, InvoiceError>;
  totalTax(): Result<Money, InvoiceError>;
  totalGross(): Result<Money, InvoiceError>;

  // event sourcing surface
  pullEvents(): readonly AnyInvoiceEvent[]; // drain semantics
  getHistory(): readonly AnyInvoiceEvent[]; // read-only
}
```

---

## ٤) خارج النطاق (يُؤجَّل صراحة)

- `applyPayment` و `void(reason)` + `VoidReasonCode` → **Wave 5**.
- Ports (`InvoiceRepository`, `InvoiceReadModel`, `InvoiceNumberPort`) → **Wave 6**.
- Domain Services (`InvoiceNumberService`, `TaxPolicy`) → **Wave 7**.
- Application use cases و UoW → **Wave 8** (UX-2B).
- Snapshots للأداء → مؤجَّل بلا تاريخ.

---

## ٥) ضمانات النقاء (Halt conditions)

- صفر `Math.round`, `toFixed`, `parseFloat`, decimal literals داخل `src/domain/finance/**` (باستثناء `Money.mulScalar` المسموح به).
- صفر استيراد لـ `react`, `@supabase/*`, `Date`, `window`, `document`.
- صفر حقن `ClockPort`/`IdPort` داخل الـ aggregate — الـ caller يمرر `Instant` و `DomainEventId` صراحة.
- صفر mutation خارج `record()` (بعد إعادة الهيكلة)؛ `addLine`/`removeLine` على draft pre-issue يُعاملان كـ structural setup لا event-emitting (مُسوَّى في snapshot `InvoiceIssued`).
- لا snapshots، لا cached status، لا derived state مخزَّن.

---

## ٦) معايير القبول

1. كل اختبارات Wave 1–3 الحالية تبقى خضراء (مع تكييف اختبارات `markPaid`/`cancel`).
2. `Invoice.fromHistory(invoice.pullEvents())` بعد `create + addLine + issue` يُنتج aggregate مكافئاً تماماً (status, lines, totals).
3. `pullEvents()` ثانيةً بدون `record` جديد = `[]`.
4. الـ reducer `statusOf` يطبّق ADR §5 بحرفيتها — مغطّى باختبار لكل خلية.
5. أي تسلسل أحداث غير قانوني يُرفض في `fromHistory` بـ `CorruptEventStream` أو `IllegalReplayTransition` — بدون throw.

---

عند الموافقة، أبدأ بفحص `src/shared-kernel/events/` و `AggregateRoot` لتحديد ما هو موجود فعلاً، ثم أنفذ التغييرات في دفعة واحدة محصورة داخل `src/domain/finance/**` + الإضافة الدنيا في `src/shared-kernel/events/`.
