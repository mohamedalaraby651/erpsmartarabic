
# UX-3A — الخارطة المرجعية v3 (بعد ملاحظاتك الـ 10)

**القرار:** التركيز الكامل على UX-3A. توسّع MCP مؤجَّل بعد Wave 12.
**الأساس:** Wave 1 مختومة (`BASELINE-UX3A-001`, 28/28 fitness).
**الأفق:** 3–5 سنوات، منصة واجهة أمامية طويلة العمر.

---

## الترتيب النهائي (13 موجة)

| # | الموجة | ملاحظة |
|---|---|---|
| 1 | Platform Foundation | ✅ مختومة |
| 2 | **Design System Consolidation** | تنفيذ الآن |
| 2.5 | **UI API Standardization** *(موسَّعة)* | Primitives + Composites + Layout + Contracts |
| 3 | Interaction Framework | + بدء استبدال `ui-kit` |
| 4 | UX State System | + حذف `ui-kit` نهائياً |
| 5 | Data Presentation Framework | |
| 6 | Dashboard Framework | |
| 6.5 | UI Contracts (View Models) | |
| 6.75 | **Developer Experience** *(جديدة)* | Component Catalog, Playground, Token Viewer, Icon Gallery |
| 7 | Demo & Showcase | |
| 8 | **Performance & Quality** *(موسَّعة)* | Perf + A11y + Bundle + Lazy + Virtualization + Memory + Lighthouse + Keyboard + High Contrast QA |
| 9A | Read Model Wiring | ربط View Models بـ Read Models |
| 9B | Real-time & Offline | Subscriptions, Optimistic, Offline |
| 10 | MCP Foundation ثم أدوات القراءة/المحاكاة/الكتابة | |

---

## الحوكمة المُعتمَدة قبل Wave 2

- **ADR-0027** — UX-3A Roadmap Freeze (13 موجة، تجميد أي عمل خارج المسار حتى Wave 3).
- **ADR-0028** — Design System v2 & `ui-kit` Sunset Schedule (Freeze W2 → Replace W3 → Delete W4).
- **ADR-0029** — UI API Uniformity Charter (يغطي الطبقات الأربع).
- **ADR-0030** — Theme Registry Contract *(جديد بناءً على ملاحظتك #5)*.
- **`docs/architecture/UX3A-ROADMAP.md`** — خارطة رسمية Wave 1 → 10.
- **`docs/mcp/STATUS.md`** — يُثبِّت حالة MCP (3 أدوات، Foundation مؤجَّل).
- **`docs/architecture/design-decisions/`** *(جديد, ملاحظة #2)* — Design Decision Log منفصل عن ADRs:
  - `DS-001-tone-vs-color.md`
  - `DS-002-variant-vs-intent.md`
  - `DS-003-spacing-scale-rationale.md`
  - `README.md` يشرح متى نستخدم DS بدل ADR (قرارات صغيرة متكررة داخل نظام التصميم).

---

## مؤشرات النجاح الكمية (ملاحظتك #10)

قالب موحّد يُلحق بكل موجة في `docs/architecture/baseline/AUDIT-WAVE{N}.md`:

| Metric | Target |
|---|---|
| Fitness checks | 100% enforcing pass |
| TypeScript strict errors | 0 |
| Type coverage (exported symbols) | ≥ 95% |
| Vitest passing | ≥ baseline (never regress) |
| Test coverage (touched files) | ≥ 90% |
| Build time delta | ≤ +10% vs baseline |
| Bundle budget delta | ≤ ±5% vs baseline |
| Accessibility | WCAG AA (AAA في Wave 8) |
| Breaking changes | 0 |
| Circular deps delta | ≤ 0 |
| Import layer violations delta | ≤ 0 |

تقاس عبر `scripts/audits/build-manifest.mjs` (موجود) + سكربت جديد `scripts/audits/build-wave-scorecard.mjs`.

---

## Wave 2 — Design System Consolidation

**الهدف:** نظام تصميم موحّد فوق `src/ui/tokens` و`src/ui/primitives`. صفر تغيير سلوكي.

### 2.1 Discovery موسَّع (ملاحظات #3, #4)

سكربتات معلوماتية:

- `scripts/audits/design-system-inventory.mjs` — ألوان hardcoded، خطوط، ظلال، مسافات خارج tokens.
- `scripts/audits/ui-kit-usage.mjs` — allowlist للاستخدامات الحالية + خريطة إحلال.
- `scripts/audits/component-duplication.mjs` — يكتشف Button/Badge/Card/Modal/Dialog/Input المكرَّرة **مع Similarity Score** *(ملاحظة #3)*:
  - AST-based signature (props + variants + JSX shape).
  - نسبة تشابه %؛ يُرتَّب أعلى ← أسفل ليحدَّد المرشح للحذف أولاً.
- `scripts/audits/ui-complexity.mjs` — أكبر مكوّن، أكثر مكوّن يستورد، أكثر صفحة تحوي Hooks.
- `scripts/audits/rendering-cost.mjs` *(informational)* — غياب memo/lazy في مكوّنات ثقيلة.
- `scripts/audits/ui-dep-graph.mjs` *(جديد, ملاحظة #4)* — dep-graph مركّز على `src/ui/**` و`src/components/**`، يكشف Circular deps داخل UI و**Central components** (أعلى in-degree).

**المخرجات:** JSON + Markdown تحت `scripts/audits/output/wave2-discovery/`.

### 2.2 Design Tokens — تدقيق ومراجعة

- تدقيق `src/ui/tokens/**` (colors/spacing/typography/radius/elevation/motion).
- التأكد من توافق `--warning`/`--success`/`--info` بين `src/index.css` و`tailwind.config.ts`.
- تحديث `docs/architecture/TOKEN_CHANGELOG.md` + إنشاء `docs/architecture/DESIGN-TOKENS-V2.md`.

### 2.3 Theme Registry (ملاحظة #5)

بدلاً من hardcode `light|dark|high-contrast` داخل `ThemeProvider`:

- **`src/ui/providers/themeRegistry.ts`** — سجل قابل للتمديد:
  ```ts
  export interface ThemeDefinition {
    id: string;
    label: string;
    dataAttr: string;         // data-theme value
    prefersDark?: boolean;
    contrast?: "AA" | "AAA";
  }
  export const themeRegistry = new Map<string, ThemeDefinition>();
  export function registerTheme(def: ThemeDefinition): void;
  ```
- تسجيل `light`, `dark`, `high-contrast` كثيمات ابتدائية.
- `ThemeProvider.tsx` يقرأ من السجل، لا من enum ثابت.
- HSL variables لـ `high-contrast` تُعرَّف في `src/index.css` كـ **stub** (بدون QA فعلي — يُؤجَّل لـ Wave 8).
- ADR-0030 يوثّق العقد.

### 2.4 Freeze `ui-kit` (ملاحظة #1 من الجولة السابقة)

- `@deprecated` JSDoc + dev-only `console.warn` في `src/components/ui-kit/index.ts`.
- Fitness: `check-no-new-ui-kit-imports.mjs` + allowlist مسنودة بـ Discovery.

### 2.5 حذف الألوان المباشرة + Typography + Spacing/Elevation

warn → enforcing خلال الموجة:

- `check-no-raw-colors.mjs`
- `check-typography-tokens.mjs`
- `check-spacing-elevation.mjs`
- `check-design-system-inventory.mjs`

### 2.6 اختبارات بصرية Informational

- `scripts/audits/theme-smoke.mjs` — Playwright على Auth/Index بـ light+dark.

### 2.7 Scorecard وبوابة الخروج

- **5 fitness checks جديدة enforcing** (28 → **33**).
- Scorecard المؤشرات الـ 11 كلها ضمن الأهداف.
- ADR-0027 + ADR-0028 + ADR-0030 → Accepted.
- **`BASELINE-UX3A-002`** مختوم.

---

## Wave 2.5 — UI API Standardization *(موسَّعة، ملاحظة #1)*

**الهدف:** توحيد **واجهات** الطبقات الأربع في `src/ui/**` — Primitives + Composites + Layout + Contracts. صفر تغيير سلوكي، APIs additive فقط.

### 2.5.1 نطاق موسَّع

**Layer A — Primitives** (`src/ui/primitives/**`):
Button, IconButton, Input, Textarea, Select, Card, Dialog, Sheet, Badge, Alert, Tooltip, DropdownMenu, Table.

**Layer B — Composites** (`src/ui/composites/**`):
DataGrid, DataGridToolbar, Pagination, PageHeader, StatGrid, DescriptionList, Form, FormSection, FormRow, FormActions, FieldArray, FormDialog, EmptyState, ErrorState, LoadingState.

**Layer C — Layout** (`src/ui/layout/**`):
AppShell, Sidebar, Topbar, StatusBar, CommandPalette.

**Layer D — Contracts** (`src/ui/contracts/**`):
CompositeEvent, DataGridContract, FormContract, OverlaySpec.

### 2.5.2 معايير التوحيد لكل مكوّن (ملاحظة #6)

Fitness يتحقق من **كل** ما يلي، وليس فقط variants:

| Property | Requirement |
|---|---|
| `size` / `tone` / `variant` | من `src/ui/primitives/types.ts` الموحّدة |
| `disabled` | prop معياري في المكوّنات التفاعلية |
| `loading` | prop معياري في المكوّنات التي تدعم عمليات async |
| `className` | prop مقبولة ومضاف عبر `cn(...)` |
| `data-testid` | prop تُمرَّر إلى العنصر الجذر |
| `ref` forwarding | `React.forwardRef` مطلوبة للمكوّنات التي ترجع عنصر DOM |
| `displayName` | مطلوبة على كل forwardRef |
| `@canonicalState Canonical` | JSDoc tag على المكوّن |
| No `any` in exported types | مطلوب |
| Contract test | ملف اختبار موافقة لكل مكوّن |

### 2.5.3 الحوكمة

- ADR-0029 — UI API Uniformity Charter (يغطي الطبقات الأربع).
- **Fitness جديد:** `check-ui-api-uniformity.mjs` يفحص المعايير الـ 10 أعلاه على الطبقات الأربع.
- `docs/architecture/PRIMITIVE_API_V1.md` → **`docs/architecture/UI_API_V1.md`** يغطي 4 طبقات.
- Contract tests: `src/ui/{primitives,composites,layout}/__tests__/api-uniformity.test.ts`.

### 2.5.4 Scorecard وبوابة الخروج

- **34 fitness enforcing** (33 → +1).
- Scorecard المؤشرات الـ 11.
- ADR-0029 → Accepted.
- Contract tests خضراء عبر 4 طبقات.
- **`BASELINE-UX3A-002.5`** مختوم.

**قيد صارم:** التغييرات additive فقط. الحقول القديمة `@deprecated` ولا تُحذف حتى Wave 4.

---

## القسم التقني — ملفات Wave 2 + Wave 2.5

### جديدة (Wave 2)
```
docs/adr/0027-ux3a-roadmap-freeze.md
docs/adr/0028-design-system-v2-and-ui-kit-sunset.md
docs/adr/0030-theme-registry-contract.md
docs/architecture/UX3A-ROADMAP.md
docs/architecture/DESIGN-TOKENS-V2.md
docs/architecture/design-decisions/README.md
docs/architecture/design-decisions/DS-001-tone-vs-color.md
docs/architecture/design-decisions/DS-002-variant-vs-intent.md
docs/architecture/design-decisions/DS-003-spacing-scale-rationale.md
docs/architecture/baseline/AUDIT-WAVE2.md
docs/architecture/baseline/BASELINE-UX3A-002.md
docs/mcp/STATUS.md
scripts/audits/design-system-inventory.mjs
scripts/audits/ui-kit-usage.mjs
scripts/audits/component-duplication.mjs        # + Similarity Score
scripts/audits/ui-complexity.mjs
scripts/audits/rendering-cost.mjs
scripts/audits/ui-dep-graph.mjs                 # ملاحظة #4
scripts/audits/theme-smoke.mjs
scripts/audits/build-wave-scorecard.mjs         # ملاحظة #10
scripts/fitness/check-no-raw-colors.mjs
scripts/fitness/check-typography-tokens.mjs
scripts/fitness/check-spacing-elevation.mjs
scripts/fitness/check-design-system-inventory.mjs
scripts/fitness/check-no-new-ui-kit-imports.mjs
src/ui/providers/themeRegistry.ts               # ملاحظة #5
scripts/audits/output/wave2-discovery/*.json
scripts/audits/output/wave2-discovery/*.md
scripts/audits/output/baseline-ux3a-002.json
scripts/audits/output/ux3a-wave2-lock.json
```

### جديدة (Wave 2.5)
```
docs/adr/0029-ui-api-uniformity-charter.md
docs/architecture/UI_API_V1.md
docs/architecture/baseline/AUDIT-WAVE2_5.md
docs/architecture/baseline/BASELINE-UX3A-002_5.md
scripts/fitness/check-ui-api-uniformity.mjs
src/ui/primitives/__tests__/api-uniformity.test.ts
src/ui/composites/__tests__/api-uniformity.test.ts
src/ui/layout/__tests__/api-uniformity.test.ts
scripts/audits/output/baseline-ux3a-002_5.json
scripts/audits/output/ux3a-wave2_5-lock.json
```

### مُعدَّلة
```
src/index.css                              # high-contrast HSL stub
src/ui/tokens/**                           # تدقيق فقط
src/ui/providers/ThemeProvider.tsx         # يقرأ من themeRegistry
src/components/ui-kit/index.ts             # @deprecated + dev warn
scripts/fitness/run-all.mjs                # تسجيل 6 checks جديدة
.github/workflows/ux3a-wave1-gate.yml → ux3a-gate.yml (يدعم W2 + W2.5)
docs/architecture/MANIFEST.json
docs/architecture/UI_LAYER_MAP.md
docs/architecture/TOKEN_CHANGELOG.md
PROJECT_MAP.md
# Wave 2.5 فقط: توحيد API additive في:
src/ui/primitives/{Button,IconButton,Input,Textarea,Select,Card,Dialog,Sheet,Badge,Alert,Tooltip,DropdownMenu,Table}.tsx
src/ui/composites/{data/DataGrid,form/Form,form/FormDialog,page/PageHeader,state/EmptyState,...}.tsx
src/ui/layout/{AppShell,Sidebar,Topbar,StatusBar,CommandPalette}.tsx
```

### قيود صارمة (Wave 2 + 2.5)
- ❌ صفر تعديل على `src/kernel/**` و `src/platform/**`.
- ❌ صفر تعديل على `domain/`, `application/`, `infrastructure/`, feature hooks.
- ❌ صفر DB migrations.
- ❌ صفر تعديل على أدوات MCP الحالية.
- ❌ صفر حذف من `src/components/ui-kit/**` (Freeze فقط).
- ❌ صفر breaking changes في UI APIs — additive فقط.
- ✅ مسموح: `src/ui/**`, tokens, ThemeProvider + Registry, `src/index.css`, docs, fitness scripts.
- ✅ مسموح: استبدال className hardcoded بـ token classes داخل ملفات الميزات.

### التبعيات
- **صفر** تبعيات جديدة.

### النشر
- لا نشر Edge Functions.

---

## ما بعد Wave 2.5 (مرجعية موجزة، مع التعديلات)

| Wave | مخرج | ملاحظة |
|---|---|---|
| 3 Interaction Framework | Create/Edit/Delete/Wizard/Bulk/Search/Import/Export | + بدء استبدال `ui-kit` بـ `ui/primitives` |
| 4 UX State System | 11 حالة + `useUXState` | + حذف `ui-kit` نهائياً |
| 5 Data Presentation | Table/Cards/Kanban/Timeline/Calendar/Tree/Pivot/Charts | مصدر واحد |
| 6 Dashboard Framework | Widget Registry + DnD | Mock provider |
| 6.5 UI Contracts | View Models | |
| **6.75 Developer Experience** *(ملاحظة #7)* | Component Catalog + Playground + Token Viewer + Icon Gallery | داخلي، بدون تبعيات جديدة إن أمكن |
| 7 Demo & Showcase | صفحات اختبار داخلية | |
| **8 Performance & Quality** *(ملاحظة #8)* | Perf + A11y + Bundle + Lazy + Virtualization + Memory + Lighthouse + Keyboard + High Contrast QA (WCAG AAA) | |
| **9A Read Model Wiring** *(ملاحظة #9)* | ربط View Models بـ Read Models (UX-2C) | |
| **9B Real-time & Offline** *(ملاحظة #9)* | Subscriptions + Optimistic Updates + Offline | |
| 10 MCP Foundation → أدوات | حسب خطة MCP v2 السابقة | |

كل موجة تحصل على `plan--create` منفصل بـ ADR + Baseline + Fitness Gate + Scorecard.

---

## البدء بعد الموافقة

1. إنشاء ADR-0027/0028/0030 + `UX3A-ROADMAP.md` + `docs/mcp/STATUS.md` + `docs/architecture/design-decisions/` (README + DS-001..003).
2. تشغيل Discovery الستة (Design System + ui-kit + Duplication+Similarity + Complexity + Rendering + UI Dep Graph).
3. إضافة `themeRegistry.ts` وتحويل `ThemeProvider` للقراءة منه (سلوك مطابق للحالي).
4. إضافة 5 fitness checks بوضع warn.
5. إصلاح المخالفات على دفعات صغيرة.
6. تحويل الـ 5 checks إلى enforcing.
7. تشغيل `build-wave-scorecard.mjs` والتأكد من الأهداف.
8. ختم `BASELINE-UX3A-002`.
9. الانتقال إلى Wave 2.5 (UI API Standardization عبر 4 طبقات) بنفس الأسلوب.
