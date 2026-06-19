# Master Engineering Execution Plan — UX-0 (LOCKED FOR EXECUTION)

> **القرار:** ✅ LOCKED FOR EXECUTION مع التعديلات الأربعة + بوابة Baseline Sign-off.
> **المبدأ الثابت:** *No Production Code Changes. No Architectural Decisions. Only Evidence Collection.*
> **المدة:** 1–2 أيام. **التأثير على `src/**`:** صفر. **التأثير على Repos/Queries/Migrations/Edge Functions:** صفر.

## خارطة الطريق (مرجعية فقط — لا تُنفَّذ هذه الجولة)

```text
UX-0 Baseline Freeze ← هذه الجولة فقط
UX-1 Foundation → UX-2 Contracts → UX-3 Workspace → UX-4 Workflow
UX-4.5 DevEx (Storybook) → UX-5 SmartTable → [Monorepo Gate]
UX-6 Command → UX-7 Feature Refactor + Permissions → UX-8 Perf + Intelligence
UX-9 Governance → [Plugin / Extension / Configuration — شرطية]
```

## القرارات المعمارية المؤكَّدة (مرجع Q1–Q6)

- **Q1**: Evolutionary Modernization (لا Rewrite).
- **Q2**: ثلاث طبقات — ERP UI Operating System → Workspace Architecture → Business Screens.
- **Q3**: البنية الأساسية أولاً (Tokens → Layout → Navigation → Grid → Forms → Dialogs → Command → Shell).
- **Q4**: أول Workspace = **Finance** (يغطي معظم الأنماط).
- **Q5**: DoD = استخدام كل المكونات القياسية + tests + a11y + docs + 0 legacy.
- **Q6**: منع التدهور عبر ERP UI OS مع Contracts + Rules + Governance مفروضة.

> هذه الإجابات تُحفَظ في `docs/architecture/ARCHITECTURE_DECISIONS_Q1_Q6.md` كمرجع ثابت.

---

## Phase UX-0 — Deliverables

### A. Evidence Outputs (Markdown + JSON متوازيان)

كل تقرير له **JSON كمصدر حقيقة** + **Markdown بشري**. الـ JSON هو ما يُقارَن آلياً.

```text
docs/architecture/baseline/
  01-snapshot.md   02-dependencies.md   03-components.md
  04-routes.md     05-data-layer.md     06-performance.md
  07-bundle.md     08-tests.md          09-lint-types.md

scripts/audits/output/
  snapshot-report.json     dependency-report.json
  component-report.json    route-report.json
  data-access-report.json  performance-report.json
  bundle-report.json       lint-types-report.json

docs/architecture/MANIFEST.json
docs/architecture/ARCHITECTURE_DECISIONS_Q1_Q6.md
```

### B. MANIFEST.json — Environment Provenance + Baseline Version

```json
{
  "baselineVersion": "UX-0",
  "generatedAt": "<ISO>",
  "gitCommit": "<sha>",
  "gitBranch": "<branch>",
  "gitTag": "architecture-baseline-ux0",
  "nodeVersion": "<x.y.z>",
  "packageManager": "<bun@x.y.z>",
  "lockfileHash": "<sha256 of bun.lockb>",
  "toolVersions": { "madge": "", "rollup-plugin-visualizer": "", "ts-complex": "", "depcheck": "" },
  "reports": { /* paths to 8 JSON reports */ },
  "health": { /* current numbers */ },
  "targets": { /* aspirational numbers */ },
  "determinism": { "verified": true, "runs": 2, "diff": "none" }
}
```

> أي مقارنة لاحقة تتحقق أولاً من تطابق `nodeVersion` و`lockfileHash` و`gitTag`. الاختلاف = مقارنة غير صالحة.

### C. حقول التقارير الإلزامية

1. **Snapshot** — شجرة `src/` بعمق 3، LOC لكل مجلد جذري، الفجوة مقابل (`ui/ contracts/ workspaces/ workflows/`).
2. **Dependencies** (madge) — circular cycles، أعمق مسار، Top 20 importers/imported، **Import Layer Violations** (قياس فقط): `components→repositories`, `pages→repositories`, `hooks→supabase/client`, `components→services`, `domain→ui`.
3. **Components** — تصنيف: `{render, container, feature, layout, table, dialog, chart, form, primitive}` + ملفات > 300 سطر + جرد primitives المتنافسة (`ui-kit/*` vs `ui/*`) + جرد الجداول.
4. **Routes** — `{route, workspace, requiresAuth, permission, dataSources[], mainRepository, workflowCandidate}`.
5. **Data Layer** — تصنيف الـ 161 hit: `{read, readComposite, write, realtime, storage, auth, rpc}` + جرد `lib/repositories/*` و`lib/queries/*` + استمرار سكربت `scripts/audits/check-data-access.sh` كمرجع.
6. **Performance** — يدوي على 5 مسارات: Web Vitals (LCP/CLS/INP/TTI) + Snapshot (JS Heap, DOM Nodes, Network Requests, أكبر/أبطأ API). Evidence فقط، **لا KPIs**.
7. **Bundle** — gzipped/chunk، Top 10 deps، **Duplicate packages**، **Unused** (depcheck)، **Tree-shaking opportunities**.
8. **Tests** — Vitest 1187/1187، Playwright e2e خضراء، coverage إن توفّر.
9. **Lint & Types** — `tsc --noEmit` نظيف (Hard Stop إن فشل)، ESLint warnings مصنَّفة، **`as any` (111) مصنَّفة**: `{infrastructure, ui, tests, legacy, generated}`، **console (44) مصنَّفة**: `{debug, error-handler, telemetry, leftover}`.

### D. Governance Documents

**`docs/architecture/PRINCIPLES.md`** — 13 مبدأ:

1. UI لا يعرف قاعدة البيانات
2. Workflow = مصدر الحقيقة للحالة
3. Workspace يحدد السياق فقط
4. Repository = الحد الوحيد للوصول إلى البيانات
5. Contracts تفصل UI عن Domain
6. كل Pattern يُثبت نجاحه على POC قبل التعميم
7. لا تُبنى طبقة قبل وجود حاجة فعلية مُقاسة
8. القرارات المعمارية تُسجَّل كـ ADR قبل التنفيذ
9. State belongs to the lowest responsible owner
10. Composition before inheritance
11. Feature boundaries are stronger than folder boundaries
12. Everything measurable before refactor
13. **Backward compatibility before optimization** — *No optimization may break existing business behavior.*

**`docs/architecture/KPIs.md`** — مقسوم صراحةً:

#### Section 1 — Current Health (Baseline UX-0، ليست مشكلة)

Direct DB access: 161 · `as any`: 111 · `console.*`: 44 · Files > 500 LOC: 4 · Circular deps: TBM · Bundle gzipped: TBM · Vitest: 1187 · TS strict errors: TBM · Maintainability Index: TBM · Cyclomatic p95: TBM · Avg Component LOC: TBM · Avg Hook LOC: TBM · Repository Reuse: TBM · Query Reuse: TBM · Avg Props: TBM · Import Layer Violations: TBM.

#### Section 2 — Targets

Direct DB in UI → 0 (UX-2→UX-7) · `as any` (Infra+UI) → 0 (UX-1→UX-2) · `console.*` leftover → 0 (UX-1) · Files > 500 → 0 (UX-5→UX-7) · Circular → 0 (UX-1) · Bundle delta ±5%/Phase · Vitest ≥ 1187 (لا يهبط أبداً) · TS strict errors → 0 (UX-1) · Import Layer Violations → 0 (UX-2).

**`docs/adr/0000-architecture-frozen-before-frontend-rewrite.md`** — قرار تأسيسي.
**`docs/risk-log/RISK-001-shadow-repository-regression.md`** — مأهول (Source: SupplierRatingTab; Mitigation: audit قبل UX-2).
**هياكل مفتوحة:** `docs/adr/README.md`, `docs/decision-log/README.md`, `docs/risk-log/README.md`, `docs/lessons-learned/README.md`.

### E. Scripts (dev-only) + Determinism

```text
scripts/audits/dep-graph.mjs
scripts/audits/component-inventory.mjs
scripts/audits/route-inventory.mjs
scripts/audits/data-access-classify.mjs
scripts/audits/bundle-report.sh
scripts/audits/complexity-report.mjs
scripts/audits/depcheck-report.mjs
scripts/audits/build-manifest.mjs        ← يجمع كل JSON + env → MANIFEST.json
scripts/audits/verify-determinism.sh     ← يشغّل كل audit مرتين ويقارن JSON بايت-ببايت
```

**Determinism:** ترتيب مفاتيح ثابت، فرز نتائج، استبعاد timestamps من ملفات الـ reports (تُحفظ فقط في MANIFEST.json).

**devDependencies المضافة فقط:** `madge`, `rollup-plugin-visualizer`, `ts-complex`, `depcheck`. **0 runtime deps جديدة.**

---

## Hard Stop Conditions

- أي حاجة لتعديل `src/**` لإكمال القياس → halt (تشخيص خاطئ).
- أي حاجة لـ migration / edge function → halt.
- `tsc --noEmit` فاشل → halt (يُصلَح أولاً).
- Vitest يهبط تحت 1187 → halt.
- ظهور Repository bypass جديد بعد A2.5 → halt + Architecture Regression.
- **أي audit script ينتج non-deterministic output → halt** (يُصلَح السكربت قبل اعتماد الـ Baseline).

---

## Baseline Sign-off Gate (إغلاق رسمي)

UX-0 لا يُعتبر مغلقاً إلا إذا تحققت **جميع** الشروط الأربعة:

1. ✅ جميع Audit Scripts نجحت بدون أخطاء.
2. ✅ `verify-determinism.sh` يمر بنسبة 100% (تشغيلان متتاليان → diff فارغ).
3. ✅ ملفات Markdown + JSON متطابقة بالكامل مع `MANIFEST.json` (نفس الأرقام، نفس الـ paths).
4. ✅ Git Tag رسمي: **`architecture-baseline-ux0`** يُنشأ كمرجع ثابت تُقارن به كل المراحل اللاحقة.

> هذا إجراء حوكمة فقط — يمنع فقدان مرجع الـ Baseline مستقبلاً.

---

## Completion Gate — قرار UX-1

تقرير الإغلاق يُجيب صراحة:

- **Q1**: هل أرقام الـ baseline تكشف مفاجأة (circular عالية، bundle منتفخ، complexity عالٍ) تستدعي تعديل أولوية UX-1؟
- **Q2**: POC table في UX-1 = `SuppliersTable` أم `CustomersTable`؟
- **Q3**: هل canonical decisions لـ Buttons/Inputs/Modals (`ui-kit` vs `ui`) واضحة من الجرد بحيث تُوثَّق في UX-1 بدون reimplementation؟
- **Q4**: ESLint rule على `src/ui/**` تبدأ warn في UX-1 وترتقي error في UX-2 — تثبيت؟
- **Q5**: هل يوجد Metric يُعيد ترتيب الـ roadmap؟ (`circular ≥ 40` أو `bundle ≥ 9MB` أو `components ≥ 700` → الأولوية تصبح Foundation → Architecture Cleanup Phase → UX-2.)
- **Q6**: هل أدوات القياس نفسها موثوقة وقابلة لإعادة التشغيل (`verify-determinism.sh` يمر 100%)، أم تحتاج تحسيناً قبل اعتمادها كأساس للمراحل التالية؟

---

> **الحالة: ✅ LOCKED FOR EXECUTION.** بعد الموافقة، تبدأ Phase UX-0 بـ 0 تغييرات في `src/**`، 0 migrations، 0 runtime deps، وتنتهي بـ Git Tag `architecture-baseline-ux0` كمرجع رسمي.
