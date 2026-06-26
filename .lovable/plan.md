# UX-2A Wave 8 — Exit Gate (Revised v2)

التعديلات المعتمدة من المراجعة: إضافة **G0 Readiness**, تقديم **G2 قبل G1**, إثراء snapshot في G4, ربط ثلاثي Rule→Impl→Test في G5, وقاعدة "أي تعديل إنتاج = Defect".

الترتيب النهائي: **G0 → G2 → G1 → G3 → G4 → G5 → G6**.

---

## القاعدة الذهبية لـ Wave 8

> أي تعديل في production code (`src/domain/finance/**` خارج اختبارات) أثناء Wave 8 **يوقف التنفيذ فورًا** ويُسجَّل كـ Defect في `scripts/audits/output/ux2a-wave8-defects.json` مع: `{ gate, file, rule, rootCause, fixPlan }`. لا يُدمج كجزء طبيعي من البوابة.

استثناء وحيد: إصلاح خطأ نوع كشفه G2 — يُسجَّل أيضًا كـ Defect حتى لو كان السطر الواحد.

---

## G0 — Readiness Gate (دقائق)

- التحقق من Git Working Tree نظيف (لا ملفات مُعدَّلة/غير مُتعقَّبة خارج ما ستنتجه Wave 8).
- مسح `src/domain/finance/**` بحثًا عن `TODO`, `FIXME`, `XXX`, `HACK` → يجب أن يكون صفرًا.
- تشغيل الحزمة الكاملة (1471 اختبار) + `node scripts/fitness/run-all.mjs` كـ baseline.
- حفظ `scripts/audits/output/ux2a-wave8-baseline.json`:
  ```json
  {
    "timestamp": "...",
    "git": { "head": "...", "clean": true },
    "tests": { "total": 1471, "passed": 1471 },
    "fitness": { "active": 16, "violations": 0 },
    "financeFileCount": N,
    "todoCount": 0
  }
  ```
- **بوابة:** أي إخفاق يوقف Wave 8 قبل أن يبدأ.

## G2 — TS Strictness (قبل التغطية)

- إنشاء `tsconfig.finance.json` يمتد من `tsconfig.app.json`:
  - `noUncheckedIndexedAccess: true`
  - `exactOptionalPropertyTypes: true`
  - `noImplicitOverride: true`
  - `noPropertyAccessFromIndexSignature: true`
  - `include`: `src/domain/finance/**`, `src/shared-kernel/**`
- تشغيل `tsgo --noEmit -p tsconfig.finance.json` — صفر أخطاء.
- إنشاء fitness check `check-domain-strictness.mjs` يمسح `src/domain/finance/**` لـ: `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `as any`, `as unknown as`. أي تطابق = فشل.
- إضافته إلى `run-all.mjs` (**17 ACTIVE**).
- أي خطأ نوع يستلزم تعديل إنتاج → **Defect** قبل المتابعة.

## G1 — Coverage Gate (≥95%)

- إضافة سكوب finance في `vitest.config.ts` (أو `vitest.finance.config.ts` منفصل):
  - `include`: `src/domain/finance/**/*.test.ts`
  - `coverage.include`: `src/domain/finance/**`
  - `coverage.exclude`: `**/__tests__/**`, `**/events/index.ts`, barrels
  - `coverage.thresholds`: 95 على الأربعة (`statements/branches/functions/lines`) مع `perFile: false` (مستوى الـ scope).
- تشغيل وحفظ `scripts/audits/output/finance-coverage.json` (ملخص لا full HTML).
- سدّ الفجوات **باختبارات فقط**. الفروع الدفاعية المستحيلة → `/* c8 ignore next */` + سطر تعليقي يحيل إلى R-#### في ADR.

## G3 — CI Wiring

- مراجعة `.github/workflows/**` الموجود.
- إضافة (أو إنشاء) `.github/workflows/ux2a-exit-gate.yml` يحوي 3 خطوات فقط:
  1. `node scripts/fitness/run-all.mjs`
  2. `bunx vitest run --coverage` بسكوب finance مع enforcement العتبات
  3. `bunx tsgo --noEmit -p tsconfig.finance.json`
- لا يُعدَّل أي workflow آخر.

## G4 — Public Surface Snapshot (مُثرى)

- سكربت `scripts/audits/snapshot-finance-surface.mjs` يحلّل `src/domain/finance/index.ts` ويولّد `scripts/audits/output/finance-public-surface.json`:
  ```json
  [
    { "symbol": "InvoiceRepository", "kind": "interface", "visibility": "public", "category": "port" },
    { "symbol": "Money",             "kind": "value",     "visibility": "public", "category": "value-object" },
    { "symbol": "InvoiceIssued",     "kind": "type",      "visibility": "public", "category": "event" },
    { "symbol": "InvoiceDomainError","kind": "type",      "visibility": "public", "category": "error" }
  ]
  ```
- التصنيفات: `value-object | aggregate | event | port | error | id | enum`.
- مراجعة يدوية: لا helper داخلي مُسرَّب، لا `bigint`/`Money` خام يعبر port.

## G5 — ADR-0011 Reality Sync + Traceability Matrix

- مراجعة قواعد R-1101..R-1118b والتأكد أن النص = الكود.
- إضافة **§Traceability Matrix** بثلاث أعمدة:
  | Rule | Implementation | Test |
  |---|---|---|
  | R-1110 | `Invoice.ts` (pullEvents) | `Invoice.pullEvents.contract.test.ts` |
  | R-1106 | `Invoice.ts` (applyPayment) | `Invoice.payment.test.ts` |
  | ... | ... | ... |
- إضافة **Amendment A4 — Exit Gate Closure** يحوي: نتائج G0..G4 (أرقام فعلية + مسارات الـ JSON)، إعلان `Finance Domain v1 = Locked`، قواعد التغيير اللاحقة (3 فقط).

## G6 — Lock Declaration

- `mem://index.md` (Core) يضاف سطر:
  > Finance Domain v1.0 مغلق بعد UX-2A Wave 8. أي تغيير في `src/domain/finance/**` يتطلب: (1) Bug fix موثَّق، أو (2) Contract gap موثَّق، أو (3) ADR جديد معتمد.
- ملف ذاكرة جديد `mem://architecture/finance-domain-v1-lock` يحوي القواعد الثلاث + رابط ADR-0011 A4.
- `CHANGELOG.md`: إدخال `## [UX-2A Wave 8] - Finance Domain v1.0 Locked` يلخّص G0..G6.
- Tag منطقي داخلي: ذِكر `Finance Domain v1.0` في عنوان قسم CHANGELOG وفي A4 (لا git tag — Lovable لا يديره).

---

## النطاق المسموح لـ Wave 8 (لا تعديلات خارجه)

- `src/domain/finance/**` — **اختبارات فقط** (الإنتاج = Defect).
- `scripts/fitness/check-domain-strictness.mjs` + `run-all.mjs`.
- `scripts/audits/snapshot-finance-surface.mjs` + `output/ux2a-wave8-*.json`, `finance-coverage.json`, `finance-public-surface.json`.
- `tsconfig.finance.json`, `vitest.config.ts` (سكوب finance فقط).
- `.github/workflows/ux2a-exit-gate.yml`.
- `docs/adr/0011-finance-domain-and-invoice-aggregate.md` (A4 + Traceability).
- `CHANGELOG.md`, `mem://index.md`, `mem://architecture/finance-domain-v1-lock`.

## معايير القبول

| البوابة | الحد |
|---|---|
| G0 | baseline أخضر + صفر TODO/FIXME |
| G2 | tsgo نظيف على tsconfig.finance + check-domain-strictness ACTIVE/PASS (17/17) |
| G1 | Statements/Branches/Functions/Lines ≥ 95% (scope finance) |
| G3 | workflow `ux2a-exit-gate.yml` موجود وصالح syntactically |
| G4 | surface snapshot منشور بالتصنيف الموسَّع |
| G5 | A4 + Traceability Matrix كاملة (كل R-#### له صف) |
| G6 | memory + CHANGELOG محدَّثان |
| Defects | السجل صفر — أو موثَّق ومُغلق |

هل أنتقل لوضع البناء وأبدأ بـ **G0**؟
