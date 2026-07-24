# UX-3A Wave 2 — Sprint 3.1 · Batch A (v3 — Governance Hardened)
## Critical Layer Violations Remediation — Presentation/UI Only

الهدف: تقليل المخالفات الحرجة بنسبة ≥15% (167 → ≤142) عبر خطوة تأسيسية تخدم Waves 2.5 / 3 / 4 / 6.5 / 9A، بلا أي تغيير سلوكي أو مساس بـ Kernel/Platform/Domain/Application/Infrastructure/DB/MCP/Runtime/Tokens.

---

## Phase 0 — Discovery (Read-only)

قراءة:
- `docs/architecture/UI_HEALTH_REPORT.md`
- `docs/architecture/WAVE2_BATCH_2B_LEDGER.md`
- `scripts/audits/output/dependency-report.json`
- `scripts/audits/output/wave2-discovery/ui-dep-graph.json`
- `scripts/audits/output/wave2-discovery/ui-architecture-health.json`
- `scripts/audits/output/architecture-fingerprint.json` (baseline قبل التعديل)

المخرج: جرد أولي للـ167 حرجة (ملف/سطر/استيراد محظور/FanIn/FanOut).

---

## Phase 0.5 — Architecture Decision Gate (NEW — أولوية عالية)

قبل أي إصلاح، لكل مخالفة يتم تصنيفها إلى نوع وقرار مُعتمد:

**Violation Type:** `ImportLeak | WrongDirection | MissingFacade | MissingPublicAPI | BarrelIssue | OwnershipIssue`

**Decision:** `MOVE | EXTRACT | FACADE | DELETE | KEEP-DEFER`

يُوثَّق في `docs/architecture/WAVE2_SPRINT3_BATCHA_DECISIONS.md`. لا يبدأ أي تعديل قبل اعتماد القرار — يضمن ذلك إصلاحات موحّدة لنفس النوع من المشاكل.

---

## Phase 1 — اختيار Batch A (25 مخالفة)

ترتيب حسب: **Impact × BlastRadius × (FanIn+FanOut)** مع أولوية للاستدعاءات المباشرة من UI إلى `src/lib/repositories/**` و`src/integrations/supabase/**`.

### Architectural Debt Classification (NEW)

كل مخالفة تُصنَّف أيضًا إلى:
- `StructuralDebt` — حدود طبقات مكسورة
- `DependencyDebt` — استيراد مباشر لطبقة أعمق
- `OwnershipDebt` — الملف في المجلد الخطأ
- `TemporaryDebt` — Workaround قصير الأجل

يُنتج جدول Before/After لكل تصنيف.

---

## Phase 2 — Remediation Loop

```text
Decision (Phase 0.5) → Apply Fix → Verify Gate → Commit slot | ROLLBACK
```

**Verify Gate:** `tsgo` + `vitest` + `build` + `ui-dep-graph`. أي Regression ⇒ Rollback فوري وانتقال.

### Architectural Facade Rule (من v2)

Public Facade في الطبقة المالكة (`src/application/**` أو `src/platform/**`) — **لا** في `src/hooks/**`. يُمنع Hooks كأغلفة (Wrappers) لـ Repository/Supabase دون مسؤولية معمارية.

### Facade Creation Rule (NEW)

Facade جديد يُنشأ **فقط إذا**:
- يُعاد استخدامه من ≥2 UI modules، **أو**
- يمثل عقد تطبيقي عام مستقر (Public Application Contract)، **أو**
- مخطط له مسبقًا في **Wave 6.5** (Ports Taxonomy)

خلاف ذلك: **لا يُنشأ** — يُعاد استخدام facade قائم أو يُؤجَّل الإصلاح.

### Wave 2.5 Handoff (NEW)

أي Facade جديد يُسجَّل فورًا في `docs/architecture/UI_API_V1.md` تحت علامة **`Pending Standardization`** حتى لا يُفقد عند فتح Wave 2.5.

**ممنوع:** تعديل Business Logic / Domain / SQL / Schema / Runtime / Tokens / Edge Functions.

---

## Phase 3 — Re-audit & Graph Diff

تشغيل: `ui-dep-graph.mjs`, `dep-graph.mjs`, `ui-architecture-health.mjs`, `build-baseline-tag.mjs`.

### Graph Diff (NEW — بدل Snapshot فقط)

مقارنة بين `architecture-fingerprint.json` (baseline) و snapshot جديد:
- Added edges / Removed edges
- Changed ownership
- New barrels / Deleted barrels
- Cycle diff

يُكتب في `docs/architecture/WAVE2_SPRINT3_BATCHA_GRAPH_DIFF.md`.

### جدول Before/After

| Metric | Before | After | Δ |
|---|---:|---:|---:|
| Critical Violations | 167 | ? | ? |
| — Structural | ? | ? | ? |
| — Dependency | ? | ? | ? |
| — Ownership | ? | ? | ? |
| — Temporary | ? | ? | ? |
| Major | 31 | ? | ? |
| Minor | 5 | ? | ? |
| Cycles (all / UI) | 6 / 0 | ? / 0 | ? |
| Max FanOut / FanIn | 59 / 93 | ? / ? | ? |
| `src/ui` public exports | 121 | ? | ? |
| Architecture Score | 8.0 | ? | ? |
| **Debt Burn Rate (NEW)** | — | ? % | — |

---

## Phase 3.5 — Ledger Update (from v2, تعزيز)

تحديث `WAVE2_BATCH_2B_LEDGER.md`. **لكل عنصر متبقٍ يجب وجود:**
- `Owner Wave`
- `Owner ADR`
- `Priority` (High/Med/Low)
- `Reason Deferred`
- `Target Sprint`

**بدون Owner كامل لا يُغلق Batch A.**

---

## Phase 4 — Fingerprint Re-seal (NEW)

توليد `architecture-fingerprint.json` الجديد يشمل:
- Public APIs hash
- Dependency graph hash
- Layer graph hash
- Cycles / FanOut / FanIn / Violations counts

يصبح المرجع لكل Sprint لاحق (Graph Diff).

---

## Phase 5 — Deliverables

1. `docs/architecture/WAVE2_SPRINT3_BATCHA.md` — سجل الـ25 (before/decision/fix/after/debt-class).
2. `docs/architecture/WAVE2_SPRINT3_BATCHA_DECISIONS.md` — قرارات Phase 0.5.
3. `docs/architecture/WAVE2_SPRINT3_BATCHA_COMPARISON.md` — Before/After + Debt Burn-down.
4. `docs/architecture/WAVE2_SPRINT3_BATCHA_GRAPH_DIFF.md` — Graph Diff.
5. `scripts/audits/output/wave2-sprint3-batchA.json` — بيانات آلية.
6. `scripts/audits/output/architecture-fingerprint.json` — مُعاد ختمها.
7. `docs/architecture/WAVE2_BATCH_2B_LEDGER.md` — محدَّث بـ Owner لكل عنصر.
8. `docs/architecture/UI_API_V1.md` — Facades الجديدة موسومة `Pending Standardization`.
9. `scripts/fitness/check-public-surface-budget.mjs` — Report-only (لا Enforcement).

---

## Success Criteria

- ✅ Zero Regression (tsgo / vitest / build خضراء).
- ✅ UI Cycles = 0 يبقى 0؛ لا cycles جديدة في أي مكان.
- ✅ FanOut لا يرتفع لأي ملف.
- ✅ Critical ↓ ≥ **15%** (167 → ≤142).
- ✅ Architecture Score > 8.0.
- ✅ **Debt Burn Rate موثَّق** لكل تصنيف من الأربعة.
- ✅ لا Fitness جديدة Enforcing (فقط `check-public-surface-budget` كـ Report-only).
- ✅ لا تعديل خارج طبقة UI/Presentation.
- ✅ لا ملف جديد في `src/hooks/**` إلا وفق قاعدة Facade + توثيق صريح.
- ✅ **لا Facade جديد** إلا وفق Facade Creation Rule + مسجَّل في `UI_API_V1.md`.
- ✅ **كل عنصر متبقٍ في Ledger له Owner Wave/ADR/Priority/Reason/Target**.
- ✅ **Graph Diff مُنتج ومُراجَع**.
- ✅ **Fingerprint مُعاد ختمه**.

---

## Public API Budget (NEW — تُلتزم بها ولا تُنفَّذ الآن)

| Budget | Max | Target | Ideal |
|---|---:|---:|---:|
| `src/ui/index.ts` exports | 100 | ≤90 | ≤75 |

قياس فقط في هذا الـ Sprint. تقليم فعلي في Batch 2D/Wave 2.5.

---

## Technical Notes

- Discovery: `rg "from ['\"]@/lib/repositories" src/pages src/components src/ui src/hooks` و `rg "from ['\"]@/integrations/supabase/client" src/pages src/components src/ui`.
- كل إصلاح إما: (أ) استبدال باستيراد Public Facade قائم في `src/application/**` أو `src/platform/**`، (ب) استخراج Facade جديد وفق Facade Creation Rule، (ج) نقل الملف لموقعه الصحيح، (د) تأجيل مع Owner كامل في Ledger.
- لا مساس: `src/integrations/supabase/client.ts`, `types.ts`, `.env`, `supabase/config.toml`, أي شيء تحت `src/kernel/**` / `src/platform/**` / `src/domain/**` / `src/infrastructure/**`.
