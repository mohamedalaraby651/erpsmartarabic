# SmartERP — Master Project Reference & Technical Specification
# سمارت إي آر بي — المرجع الشامل والمواصفات الفنية

> **Document ID:** `SSOT-ERPSMARTARABIC1-V1`
> **Project Codename:** `erpsmartarabic1` (SmartERP / نظام سمارت لتخطيط موارد المؤسسات)
> **Document Class:** Single Source of Truth (SSOT) — PRD + Architecture Blueprint + Audit Brief
> **Audience:** Third-party software agency, external auditors, AI reasoning models
> **Language:** English body, Arabic section headings and key domain terms
> **Status:** Authoritative. Supersedes any partial specification.
> **Last regenerated:** 2026-08-13

---

## Table of Contents / فهرس المحتويات

1. [Executive Summary & Vision — الملخص التنفيذي ورؤية المشروع](#1-executive-summary--vision--الملخص-التنفيذي-ورؤية-المشروع)
2. [Technical Architecture & Layer Standardization — معمارية النظام وتوحيد الطبقات](#2-technical-architecture--layer-standardization--معمارية-النظام-وتوحيد-الطبقات)
3. [Core Business Modules & Invariants — الوحدات البرمجية وأحكام النطاق](#3-core-business-modules--invariants--الوحدات-البرمجية-وأحكام-النطاق)
4. [Current State, Achievements & Tech Stack — الوضع الحالي والإنجازات الفنية](#4-current-state-achievements--tech-stack--الوضع-الحالي-والإنجازات-الفنية)
5. [Scope for Agency Evaluation & Audit Criteria — نطاق التقييم والمراجعة الفنية](#5-scope-for-agency-evaluation--audit-criteria--نطاق-التقييم-والمراجعة-الفنية)
6. [Comprehensive Future Roadmap — خريطة الطريق والخطوات المستقبلية](#6-comprehensive-future-roadmap--خريطة-الطريق-والخطوات-المستقبلية)
7. [Strategic Questionnaire & Agency Review Form — استبيان التقييم والاستلام](#7-strategic-questionnaire--agency-review-form--استبيان-التقييم-والاستلام)
8. [Appendices — الملاحق](#8-appendices--الملاحق)

---

# 1. Executive Summary & Vision — الملخص التنفيذي ورؤية المشروع

## 1.1 What the system is

SmartERP is a **multi-tenant, Arabic-first (RTL) Enterprise Resource Planning platform** delivered as a single-page web application backed by a managed PostgreSQL cloud (Supabase-compatible). It covers the full commercial cycle — customers, suppliers, quotations, sales orders, invoices, deliveries, purchases, goods receipts, inventory, payments, treasury, expenses, payroll-adjacent HR records — and posts every financially significant event into a **double-entry general ledger** governed by fiscal-period locks and approval chains.

The system is not a template application. It carries:

- **~1,199 TypeScript/TSX source files** under `src/`
- **98 routed screens** across 13 functional workspaces
- **406 React components**, **99 page components**, **101 hooks**, **44 repositories**
- **~105 PostgreSQL tables**, **150+ database functions**, **181 applied migrations**
- **16 edge functions** (server-side finance, PDF, export, MCP, event dispatch)
- **1,187 passing automated tests** at the last recorded run
- A formal architecture-governance program with **30 ADRs**, **60+ automated fitness checks**, and sealed **baseline tags with SHA-256 fingerprints**

## 1.2 Strategic vision — الرؤية

To become the reference Arabic-language ERP for regional small and mid-size enterprises (trading, distribution, agriculture/farm operations, light manufacturing) by combining:

1. **Accounting correctness as a first-class invariant.** The ledger is not a report; it is the authority. Every document mutation that carries money produces balanced journal entries in the same transaction boundary.
2. **True multi-tenancy with database-enforced isolation.** Tenant separation is enforced by Row Level Security in PostgreSQL, not by frontend filtering.
3. **Arabic-native user experience.** Full RTL layout, Arabic PDF rendering engine (bidi-safe, Amiri/Cairo fonts), Arabic-first terminology, mobile-first interaction targets.
4. **Architecture that survives growth.** A governed migration from a conventional React/Supabase application to a 4-tier Clean Architecture / DDD core, executed by the **Strangler Fig** pattern with measurable, gated waves rather than a rewrite.

## 1.3 Core value proposition — القيمة المقدمة

| Pillar | Differentiator |
|---|---|
| Financial integrity | DB-native double-entry engine, period locking, immutable posted journals, reversal-only corrections |
| Compliance | Audit trail on every mutation, SoD (segregation of duties) rules, approval chains, financial limits per role |
| Isolation | Tenant-scoped RLS on all business tables; platform-owner oversight layer separated from tenant data |
| Arabic UX | Bidi-safe PDF engine, RTL logical properties enforced by automated checks, Arabic Excel/CSV export with BOM |
| Governability | Architecture fitness functions running in CI; no structural change is possible without an ADR + baseline re-seal |

## 1.4 Objectives for the software agency — أهداف التعاقد مع الشركة البرمجية

The agency is engaged to deliver, in order of priority:

1. **Independent architecture & code audit** — verify that the declared 4-tier separation is real, measure the residual coupling, and validate the layer-violation burn-down numbers reported in section 4.
2. **Security verification** — adversarial review of tenant isolation (RLS + grants + RPC), authentication/2FA, role escalation paths, edge-function authorization, and secret handling.
3. **Performance benchmarking** — database query profiles under multi-tenant load, materialized-view freshness strategy, frontend re-render cost, bundle budget (currently ~4.92 MB total across 91 assets).
4. **Roadmap validation** — confirm, correct, or re-sequence the phased plan in section 6, with effort estimates and staffing model.
5. **Delivery capability assessment** — CI/CD maturity, test strategy adequacy, and the operational runbook required for production customers.

The agency is **not** engaged to rewrite the system. Backward compatibility of financial behavior is an immutable constraint (see Principle 13, section 2.6).

---

# 2. Technical Architecture & Layer Standardization — معمارية النظام وتوحيد الطبقات

## 2.1 The 4-tier model — النموذج رباعي الطبقات

```text
┌──────────────────────────────────────────────────────────────────┐
│ PRESENTATION — طبقة العرض                                        │
│ src/pages/**, src/components/**, src/ui/**                        │
│ React 18 + Vite 5 + Tailwind 3 + shadcn/Radix                     │
│ Renders. Holds no business rules. Never touches the DB client.    │
└───────────────┬──────────────────────────────────────────────────┘
                │ (hooks / application query facades only)
┌───────────────▼──────────────────────────────────────────────────┐
│ APPLICATION — طبقة التطبيق                                        │
│ src/application/** (command handlers, query facades)              │
│ src/hooks/** (React Query orchestration), src/composition/**      │
│ Use-case orchestration, transaction boundaries, error mapping.    │
│ Depends on Domain ports; never on Infrastructure classes.         │
└───────────────┬──────────────────────────────────────────────────┘
                │ (ports / interfaces)
┌───────────────▼──────────────────────────────────────────────────┐
│ DOMAIN — طبقة النطاق                                              │
│ src/domain/finance/**, src/domain/pdf/**, src/shared-kernel/**    │
│ Pure: Value Objects, Aggregate Roots, Domain Events, invariants.  │
│ Zero imports of React, Supabase, browser globals, or infra.       │
└───────────────┬──────────────────────────────────────────────────┘
                │ (implemented by)
┌───────────────▼──────────────────────────────────────────────────┐
│ INFRASTRUCTURE — طبقة البنية التحتية                              │
│ src/infrastructure/**, src/lib/repositories/**,                   │
│ src/integrations/supabase/**, supabase/functions/**, PostgreSQL   │
│ Transport only: SQL, RPC, storage, codecs, error translation.     │
└──────────────────────────────────────────────────────────────────┘
```

### Supporting cross-cutting layers

Beyond the four tiers, the frontend platform introduces two frozen foundation layers (sealed in `BASELINE-UX3A-001`):

- **`src/kernel/**` — Kernel.** Environment, clock, culture, i18n, identity, permissions, tenant, feature flags. Must be *pure*: no React, no Supabase, no browser globals (`window`, `document`, `localStorage`, `fetch`, …). Enforced by `check-kernel-browser-globals.mjs`.
- **`src/platform/**` — Platform.** Runtime lifecycle (`bootstrap → startup → hydration → shutdown → recovery`), 7 declared Ports (Notification, Dialog, Navigation, Storage, Telemetry, Device, Clock) with browser + in-memory adapters, the `PlatformShell` composition root, module and workspace registries.

Canonical dependency direction (from `docs/architecture/DEPENDENCY_RULES.md`, version 1.0.0, Locked):

```text
Kernel → Platform → Design System → UI Contracts → UX Framework → Feature Modules → Pages
```

Lower layers must not import upper layers. Cross-layer imports are permitted **only** through the whitelisted façades: `@/kernel`, `@/platform`, `@/platform/ports`, `@/platform/runtime`, `@/platform/shell`, `@/shared-kernel`, `@/domain/finance`, `@/application/queries`.

## 2.2 Interaction model — نموذج التفاعل بين الطبقات

Two data paths coexist during the Strangler Fig migration, and this duality is the single most important fact for any reviewer:

**Path A — Legacy/Pragmatic (majority of modules today)**

```text
Page/Component → hook (React Query) → repository (src/lib/repositories/*) → supabase client → PostgreSQL (RLS + RPC)
```

**Path B — Clean/Target (Finance/Invoice aggregate, fully implemented)**

```text
Page → hook → Application Command Handler (src/application/finance/invoice/*)
     → Domain Aggregate (Invoice) → Domain Events
     → InvoiceRepository port
     → SupabaseInvoiceRepository (infrastructure) → invoice_events table (event-sourced)
```

Path B is event-sourced: `Invoice` records `InvoiceIssued`, `InvoicePaymentApplied`, `InvoiceVoided` events; state is derived by a pure reducer (`statusOf.ts`); persistence appends events with `expectedVersion` optimistic concurrency; rehydration runs through `EventStreamRehydrator`, and any invariant break during rehydration is classified as `CorruptedPersistenceData`, never as a domain error.

The migration goal is to move modules from Path A to Path B **aggregate by aggregate**, never wholesale.

## 2.3 Coding & naming standards — معايير التسمية والكتابة

| Concern | Standard | Enforcement |
|---|---|---|
| React components | `PascalCase.tsx`, one primary component per file | review + `check-component-loc-budget` |
| Hooks | `useCamelCase.ts`, must start with `use` | lint |
| Utilities / services | `camelCase.ts` | review |
| Feature directories | `kebab-case/` | review |
| Database objects | `snake_case` tables and columns; plural table names | migration review |
| Enum types (DB) | `snake_case` type name, lowercase values | migration review |
| Domain Value Objects | `PascalCase.ts`, branded types, private constructors, static factories returning `Result<T, E>` | `check-domain-purity` |
| Events | `PascalCase` past tense (`InvoiceIssued`) | `check-domain-events-immutable` |
| File length | ≤ 500 lines (excluding generated `types.ts` and shadcn primitives) | `check-component-loc-budget` |
| Props count | budgeted per component | `check-component-props-budget` |
| JSX depth | budgeted | `check-jsx-nesting-depth` |
| Colors | semantic HSL design tokens only; raw hex/`text-white`/`bg-black` forbidden | `check-no-raw-colors` (allowlist-frozen at 21 legacy offenders) |
| Typography & spacing | token scale only | `check-typography-tokens`, `check-spacing-elevation` |
| Direction | logical properties (`start`/`end`), never `left`/`right` | `check-rtl-logical-properties` |
| `any` in UI | forbidden in production code | `check-no-any-in-ui` |
| Deep imports | forbidden across layer façades | `check-no-deep-imports` |
| Inline styles | forbidden | `check-no-inline-styles` |
| Icons | single sanctioned source | `check-icon-source` |

### Directory contract

```text
src/
  kernel/            pure primitives, zero dependencies (FROZEN)
  platform/          runtime, ports, adapters, shell, registries (FROZEN)
  shared-kernel/     Result/Either, errors, Instant, Id, DomainEvent, AggregateRoot
  domain/            finance (Invoice aggregate, Money, TaxRate), pdf
  application/       finance command handlers, queries/** read facades
  infrastructure/    finance codecs, rehydrator, Supabase repositories
  composition/       thin composition roots wiring infra into app handlers
  lib/
    repositories/    44 data-access modules (legacy boundary, still authoritative for Path A)
    queries/         query key factories, React Query config
    pdf/             Arabic PDF engine (bidi-safe)
    financial-engine/ posting helpers
  hooks/             101 React hooks
  ui/                design system v2 (primitives, composites, layout, contracts, tokens)
  components/        406 feature components (+ legacy ui-kit, sunset planned)
  pages/             99 route entries across 47 feature folders
  integrations/      generated Supabase client + types (never hand-edited)
supabase/
  migrations/        181 SQL migrations
  functions/         16 edge functions
docs/                ADRs, architecture specs, audits, baselines, risk log
scripts/
  fitness/           60+ architecture fitness checks
  audits/            deterministic metric generators + JSON outputs
```

## 2.4 Form component standardization strategy — توحيد مكونات النماذج

Forms are the highest-duplication surface in any ERP. The standard is built from two mandatory hooks plus a contract:

**`useFormDialog` — form lifecycle encapsulation.** Owns: open/close state, mode (`create` | `edit`), the entity being edited, reset-on-close semantics, submit-in-flight state, success/error toasting via the notification port, and cache invalidation on success. A feature form may not re-implement any of these locally.

**`useListState` — unified list-state hook.** Owns: search term (debounced), filters, sort, pagination/virtualization state, selection set for bulk actions, saved-view binding, and the "empty because no data" vs "empty because filtered" distinction that drives `EmptyState` routing.

**Validation.** `react-hook-form` + `zod` resolvers. Critical documents (Invoice, Payment, Journal, Quotation, Purchase Order) have Zod schemas colocated with their domain contracts; the schema is the only validation authority — no ad-hoc `if` chains in components.

**Composition rules.**
- Forms compose `src/ui` primitives (`FormField`, `Input`, `Select`, `Textarea`, `Switch`) only. Composites may not import feature code (`check-composite-isolation`).
- Line-item tables inside documents must degrade to stacked cards below the mobile breakpoint (responsive-documents standard).
- Every text input is sanitized for invisible Unicode bidi markers before persistence.
- Numeric money inputs round with `Math.round(value * 100) / 100` at the presentation edge; the domain layer uses integer minor units (see 3.1).

**Dynamic/customizable forms.** Company-level `section_customizations`, `role_field_permissions`, and `role_section_permissions` allow per-tenant field labels, visibility, and custom fields. The renderer reads a permission matrix (cached in `permission_matrix_cache`, invalidated by trigger) and hides or disables fields server-authoritatively — the client never decides authorization, only rendering.

## 2.5 Multi-tenancy & security layer — الفصل بين المستأجرين والأمان

### Tenant isolation

- Every business table carries `tenant_id uuid not null`.
- RLS is enabled on all business tables; policies compare against `get_current_tenant()` / `is_tenant_member()`.
- `user_tenants` maps users to tenants; `auto_assign_default_tenant` provisions on first sign-in.
- Grants are explicit per table (`authenticated`, `service_role`, `anon` only where a policy permits anonymous reads).
- Statistics and aggregate RPCs must re-check tenant scope internally — a mandatory rule after an earlier finding that some stats functions relied on the caller.

### Role & permission model

- Roles live in a **separate** `user_roles` table keyed by `app_role` enum (`admin`, `sales`, `warehouse`, `accountant`, `hr`) — never on `profiles`. Checks go through the `SECURITY DEFINER` function `has_role(_user_id, _role)` to avoid recursive RLS.
- `custom_roles` + `role_section_permissions` + `role_field_permissions` provide granular CRUD and field-level control.
- `role_limits` enforces financial approval ceilings (`check_financial_limit`).
- `sod_rules` + `check_sod_violation` prevent the same actor from creating and approving the same financial document.
- `platform_admins` is a separate oversight plane (platform owner) with its own audit log; it must never be reachable through tenant-scoped policies.

### Authentication

- Email/password plus social OAuth; TOTP-based 2FA (`user_2fa_settings`, `verify-totp` edge function, encrypted secret with column-level SELECT revoked).
- Session handling by the managed auth client; no credentials in frontend storage beyond the SDK's own token.
- Rate limiting via token-bucket (`rate_limits`, `rate_limit_config`, `check_rate_limit`).

### Data protection

- PII masking through security-invoker views.
- `audit_trail` and `activity_logs` capture diff-based JSONB changes rendered in Arabic in the UI.
- No hard deletion of financial entities; DB triggers reverse aggregate statistics on rollback.
- Idempotency keys required on financial edge functions (`operation_idempotency`).

## 2.6 The 13 immutable principles — المبادئ الثابتة

Recorded in `docs/architecture/PRINCIPLES.md`, baseline UX-0, changeable only by ADR:

1. UI does not know the database.
2. Workflow is the source of truth for business state.
3. Workspace defines context only (tenant + role + scope), never data or logic.
4. Repository is the only boundary to data; shadow `supabase.*` calls are violations.
5. Contracts separate UI from Domain.
6. Every pattern is proven on a POC before generalization.
7. No layer is built before a measured need exists.
8. Architectural decisions are recorded as ADRs before implementation.
9. State belongs to the lowest responsible owner.
10. Composition before inheritance.
11. Feature boundaries are stronger than folder boundaries.
12. Everything is measurable before it is refactored.
13. **Backward compatibility before optimization.** No refactor may change observable business behavior — report numbers, journal balances, document totals, and posted state must be identical pre/post change.

## 2.7 Governance machinery — آلية الحوكمة

- **ADRs:** 30 accepted decisions in `docs/adr/` (0000–0030), indexed in `docs/adr/INDEX.md`.
- **Fitness functions:** 60+ Node scripts in `scripts/fitness/`, run via `scripts/fitness/run-all.mjs`, each in `pending → warn → enforcing` lifecycle. CI workflows: `ux2a-exit-gate.yml`, `ux3a-wave1-gate.yml`.
- **Baseline tags:** SHA-256 fingerprints over ADRs, lock files, and the project map. Tags sealed to date: `BASELINE-UX2B-001`, `BASELINE-UX3A-000/001/002/002_5`. Integrity verified by `check-baseline-tag-integrity.mjs`.
- **Deterministic audits:** `scripts/audits/*.mjs` emit machine-readable JSON into `scripts/audits/output/` (dependency graph, bundle, routes, components, complexity, tests, lint/types, data-access classification).
- **Architecture fingerprint:** `scripts/audits/output/architecture-fingerprint.json`, currently `d22b6e09…`, re-sealed at the close of every batch.

---

# 3. Core Business Modules & Invariants — الوحدات البرمجية وأحكام النطاق

## 3.1 Financial kernel — النواة المالية

**`Money`** — the arithmetic authority.
- Stores integer **minor units** plus a `Currency`. No floating-point anywhere in the domain.
- Intermediate arithmetic uses `BigInt`; rounding occurs **only** in `mulScalar`, using Half-Away-From-Zero.
- `add`/`subtract` require **strict currency equality**; mismatched currencies return a domain error, never a coercion.
- 31 dedicated unit tests.

**`TaxRate`** — pure integer basis points, range `0..10000` (0%–100%). `apply(money)` delegates rounding to `Money.mulScalar`.

**`Currency`** — closed set with minor-unit precision metadata.

**Precision rule at the application/UI edge:** `Math.round(value * 100) / 100`. BigInt values are stringified at the domain boundary (`MoneyView`) so that no BigInt escapes into JSON transport.

## 3.2 Invoice aggregate — تجميعة الفاتورة (event-sourced)

**Identity & parts:** `InvoiceId`, `InvoiceNumber`, `InvoiceLine` (computes `lineNet`, `lineTax`, `lineGross` locally and performs **no** aggregation).

**Aggregate root:** `Invoice extends AggregateRoot`. Totals (`totalNet`, `totalTax`, `totalGross`) are **derived projections**, never stored fields.

**Lifecycle:**

```text
Draft ──issue──► Issued ──applyPayment(partial)──► PartiallyPaid ──applyPayment(full)──► Paid
  │                 │
  └──void───────────┴──void──► Cancelled        (Paid is terminal; Cancelled is terminal)
```

**Behavioral locks (L1–L7), binding:**

| Lock | Rule |
|---|---|
| L1 | Overpayment is rejected: cumulative payments may never exceed `totalGross`. |
| L2 | `paidAmount()` and `outstandingAmount()` are pure reductions over event history. |
| L3 | Status checks precede amount checks in every guard. |
| L4 | Guard ordering is fixed and tested; reordering is a breaking change. |
| L5 | Void reason is normalized (trimmed, non-empty) before the event is recorded. |
| L6 | The aggregate never writes an internal status field. |
| L7 | The reducer `statusOf(history)` is the sole authority on status. |

**Event sourcing contract:**
- `DomainEvent` carries a monotonic `sequence`; `sequence` is the **sole ordering authority** (never timestamps).
- `pullEvents()` returns a frozen copy and clears the internal buffer; there is no public getter for the buffer.
- `Invoice.fromHistory(events)` rehydrates with strict validation.
- Persistence: `appendEvents(id, expectedVersion, events, ctx)` → optimistic concurrency; conflict maps to a `ConcurrencyConflict` repository failure via `pgErrorMap`.
- Codec versioning is routed by an `EventCodecRegistry`; the repository adapter is *schema-version blind* and a purity test greps it for forbidden version literals.

**Error taxonomy:** `InvoiceDomainError` is a sealed discriminated union; `InvoiceApplicationError` is a separate sealed union; `RepositoryFailure` (shared kernel) includes `NotFound`, `ConcurrencyConflict`, `PermissionDenied`, `Transient`, and `CorruptedPersistenceData`. No layer leaks the layer below's error type.

## 3.3 Double-entry ledger — القيد المزدوج

Implemented **PostgreSQL-natively** so that correctness cannot be bypassed by any client:

- `journals` (header) + `journal_entries` (lines) with debit/credit balance constraints.
- Auto-posting functions per document type: `create_journal_for_invoice`, `_for_payment`, `_for_expense`, `_for_credit_note`, `_for_delivery_note`, `_for_goods_receipt`, `_for_purchase_invoice`.
- `posting_account_map` resolves the account per tenant and document type; `ensure_*_posting_accounts` validates completeness before posting.
- `fiscal_periods` + `enforce_fiscal_period_open` + `is_period_closed` block posting into closed periods.
- Posted journals are immutable (`posted-journal-immutability` security test); corrections are made through `create_journal_reversal` / `journal_reversals` only.
- `document_posting_log` and `log_posting_failure` provide a forensic trail for every posting attempt.

## 3.4 Commercial document cycle — دورة المستندات التجارية

```text
Quotation ──convert──► Sales Order ──convert──► Invoice ──► Delivery Note ──► (Credit Note on return)
Purchase Order ──► Goods Receipt ──► Purchase Invoice ──► Supplier Payment
```

- Conversions are atomic RPCs (`convert_quote_to_order`, `convert_order_to_invoice`, `convert_invoice_to_delivery`) — never multi-step client orchestration.
- **Three-way matching** (`compute_three_way_matching`, `matching_status_enum`) reconciles Purchase Order ↔ Goods Receipt ↔ Purchase Invoice, flagging `over_received`, `under_received`, `no_receipt`.
- Credit notes generate **reverse journals** and support partial returns with returnable-quantity checks (`get_invoice_item_returnable`).
- Approval gates: `approval_chains`, `approval_records`, `get_approval_chain`, `needs_approval`.

## 3.5 Inventory & operations — المخزون والعمليات

- `products`, `product_variants`, `product_stock` (per warehouse), `warehouses`, `stock_movements` (`in`/`out`/`transfer`/`adjustment`).
- Stock is applied on posting of the logistics document (`apply_gr_stock_on_post`, `apply_dn_stock_on_post`) — not on document creation.
- `get_low_stock_products`, `get_inventory_valuation_mv` for planning and valuation.
- Price lists (`price_lists`, `price_list_items`) resolve customer-specific pricing at document line creation.

## 3.6 Customer & supplier relationship management — إدارة العملاء والموردين

- 32-column `customers` entity with VIP tiering, credit limits, categories, addresses, notes, communications, reminders.
- Financial integrity: `atomic_customer_balance_update` + triggers keep balances consistent; deletion is blocked while active obligations exist.
- Analytics RPCs: `get_customer_financial_summary`, `get_customer_aging`, `get_customer_statement` (running balance), `get_customer_health_score`, `get_customer_chart_data`, `find_duplicate_customers`, `merge_customers_atomic`.
- KPI formulas standardized (DSO, CLV) in one module; the UI never recomputes them.
- An 8-type prioritized alert engine surfaces overdue, credit-exceeded, churn-risk and similar signals.

## 3.7 Reporting, intelligence & documents

- Executive dashboard + grouped accounting reports; materialized views (`get_sales_summary_mv`, `get_ar_aging_mv`, `get_inventory_valuation_mv`) refreshed by `pg_cron`, with a **real-time fallback path** when a view is stale.
- **Nazra decision engine** — an intelligence layer producing prioritized business recommendations.
- **Arabic PDF engine** — a custom renderer that bypasses the standard bidi pipeline; Cairo default with Amiri fallback, per-user persisted font preference; profiles/assets per tenant (`tenant_pdf_profiles`, `tenant_pdf_assets`), rendered by the `render-pdf` edge function with an async job table.
- **Export system** — CSV/Excel via edge functions with UTF-8 BOM for Arabic correctness; templated exports (`export_templates`).

## 3.8 Platform & administration

Multi-tenant management UI, tenant selector, platform-owner dashboard, SaaS pricing tiers (Basic / Pro / Enterprise), saved views persisted per user, adaptive performance settings tuned to device and network, offline sync queue with `client_op_id` idempotency and `sync_conflicts` resolution (server-wins default), push subscriptions, and an MCP server exposing read-only agent tools (`list_customers`, `search_products`, `list_recent_invoices`) behind OAuth 2.1 consent.

---

# 4. Current State, Achievements & Tech Stack — الوضع الحالي والإنجازات الفنية

## 4.1 Tech stack — المكدس التقني

| Layer | Technology |
|---|---|
| Language | TypeScript 5 (strict; extra-strict `tsconfig.finance.json` for the domain) |
| UI runtime | React 18, Vite 5 |
| Styling | Tailwind CSS 3 + semantic HSL design tokens + shadcn/Radix primitives |
| State/data | TanStack React Query (centralized `queryKeys` factory, `queryConfig` staleness policy) |
| Forms | react-hook-form + zod |
| Charts / tables | Recharts, virtualized lists |
| Drag & drop | dnd-kit |
| Backend | Managed PostgreSQL (Supabase-compatible): RLS, RPC, Realtime, Storage, Auth |
| Serverless | 16 Deno edge functions |
| Documents | Custom Arabic PDF engine; Excel/CSV export functions |
| Testing | Vitest + Testing Library + MSW; Playwright for E2E |
| Governance | 60+ custom fitness scripts, deterministic audit generators, GitHub Actions gates |
| Agent surface | MCP server (`@lovable.dev/mcp-js`) with OAuth 2.1 |

## 4.2 Quantified current state — الأرقام الحالية

| Metric | Value | Source |
|---|---:|---|
| TypeScript/TSX files (`src/`) | 1,199 | filesystem |
| Modules in dependency graph | 1,201 | `dependency-report.json` |
| Dependency edges | 4,771 | `dependency-report.json` |
| Routes | 98 across 13 workspaces | `route-report.json` |
| Page components | 99 (47 feature folders) | filesystem |
| Feature components | 406 | filesystem |
| Hooks | 101 | filesystem |
| Repositories | 44 | filesystem |
| DB tables | ~105 | schema |
| DB functions | 150+ | schema |
| Migrations applied | 181 | `supabase/migrations` |
| Edge functions | 16 | `supabase/functions` |
| Vitest tests passing | 1,187 / 1,187 | `tests-report.json` |
| Finance domain coverage | ≥ 95% statements/lines | UX-2A Wave 8 gate |
| Bundle total | 4,920,767 bytes across 91 assets | `bundle-report.json` |
| Largest chunks | `pages-sales-core` 673 KB, `vendor-misc` 667 KB, `vendor-pdf` 574 KB, `vendor-excel` 429 KB | `bundle-report.json` |
| Circular dependencies (whole tree) | 6 | `dependency-report.json` |
| Circular dependencies (`src/ui`) | 0 | `ui-dep-graph.json` |
| Deepest import chain | 18 modules | `dependency-report.json` |
| Critical layer violations | 171 (from 203) | `dependency-report.json` |
| Architecture Score | 8.2 / 10 | `UI_HEALTH_REPORT.md` |
| ADRs accepted | 30 | `docs/adr/INDEX.md` |
| Duplicate component pairs detected | 364 | Wave 2 discovery |

## 4.3 Strangler Fig milestones achieved — الإنجازات المنجزة

**UX-0 — Baseline.** Principles locked, KPIs defined, measurement scripts built. Nothing is refactored without a before-number.

**UX-1 — UI Shell & Design System v1.** Workspace registry, slot-based `AppShell`, event bus, canonical primitives, composition contracts, integration spike protocol, regression lock.

**UX-2A — Finance Domain v1.0 (LOCKED).**
- Wave 1: financial arithmetic kernel (`Money`, `Currency`, `TaxRate`) — no floats, BigInt intermediates, HAFZ rounding.
- Wave 2: `InvoiceId`, `InvoiceNumber`, `InvoiceLine`.
- Wave 3: `Invoice` aggregate with derived totals and lifecycle.
- Wave 4: event sourcing — monotonic `sequence`, event types, `statusOf` reducer, `fromHistory`.
- Wave 5: payment/void behaviors under locks L1–L7.
- Waves 6–7: sealed error unions, repository/read-model ports, single public surface `src/domain/finance/index.ts`.
- Wave 8 exit gate: zero-TODO tree, `tsconfig.finance.json` extra strictness, ≥95% coverage, CI gate, surface snapshot, `ux2a-wave8-lock.json`.

**UX-2B — Application & Infrastructure (LOCKED).**
- Wave 1: command handlers (`IssueInvoice`, `ApplyInvoicePayment`, `VoidInvoice`), sealed application errors, application-purity fitness check.
- Wave 1.5: versioned application-surface manifest with SHA-256, adapter error-boundary check, `CorruptedPersistenceData` classification, ADR-0012 on serialization semantics.
- Wave 2A/2B: event codec + registry, `EventStreamRehydrator`, `SupabaseInvoiceRepository`, `pgErrorMap`, idempotent `invoice_events` migration with RLS, thin composition root, gates G-IDEM / G-PLAN / G-GAP / G-VER / G-THIN.
- Phase 0: `BASELINE-UX2B-001` sealed with a SHA-256 baseline-tag builder and integrity fitness check.

**UX-3A — Frontend Platform & Design System (in progress).**
- Wave 1 (LOCKED, 28/28 fitness): `DEPENDENCY_RULES.md`, kernel, platform runtime lifecycle, 7 ports with dual adapters, `PlatformShell`, architecture fingerprint, signed `AUDIT-WAVE1.md`.
- Wave 2 Sprint 1: design-token, typography and spacing remediation across 22 files; 4 checks flipped to enforcing; raw-color check converted to a frozen allowlist of 21 legacy offenders.
- Sprint 1.5: baseline integrity re-seal after intentional drift.
- Sprint 2 Batch 2A: full dependency-graph health report — Architecture Score 7.4, 8 cycles, 203 layer violations, new metrics (stability, abstraction ratio, public surface area).
- Sprint 2 Batch 2B: **UI cycles 2 → 0**, latent barrel cycles hardened, 167 critical violations staged into sub-waves with owners, Score 7.4 → 8.0.
- Sprint 3.1 Batch A: introduced Application Query Facades (ADR-0028) — `customers`, `suppliers`, `products`, `customer-search`; redirected 30 UI files; **critical violations 203 → 171 (−15.76%)**, Score 8.0 → 8.2, zero regression, fingerprint re-sealed.
- Sprint 3.1 Batch B: **approved, not yet executed** — see section 6.

**Security hardening delivered.** Column-level revocation on 2FA secrets, RPC-based permission and limit enforcement, admin-only RLS on system tables, PII masking views, bulk-operation authorization at the API layer, tenant-isolation and replay tests in `src/__tests__/security/`.

**Performance work delivered.** Route-level lazy loading with retry, vendor chunk splitting, GIN/pg_trgm indexes for fuzzy Arabic search, materialized views on cron with stale fallback, adaptive performance settings, virtualization above 200 rows.

## 4.4 Known debt register — سجل الدين الفني

Fully disclosed; the agency should treat this as the starting backlog.

| # | Item | Scale | Owner wave |
|---|---|---:|---|
| D1 | `components → repositories` direct imports | 41 | Sprint 3.1 B/C |
| D2 | `pages → repositories` direct imports | 27 | Sprint 3.1 B |
| D3 | `components → supabase-client` direct imports | 38 | Sprint 3.2–3.4 |
| D4 | `pages → supabase-client` direct imports | 29 | Sprint 3.3 |
| D5 | `hooks → supabase-client` (Major tier) | 31 | Sprint 3.5 |
| D6 | `components → services` (Minor tier) | 5 | Sprint 3.6 |
| D7 | Non-UI circular dependencies (PDF diagnostics/routing, Dashboard prefetch triangle, domain event barrel) | 6 | PDF/feature owners |
| D8 | Duplicate component pairs | 364 | Wave 2 consolidation |
| D9 | Legacy `src/components/ui-kit` awaiting sunset | 1 barrel | Wave 3–4 |
| D10 | `CustomerDetailsPage.tsx` FanOut 59 / 854 LOC | 1 file | Wave 3 |
| D11 | Bundle: `pages-sales-core` 673 KB, `vendor-pdf` 574 KB, `vendor-excel` 429 KB | 3 chunks | Wave 8 |
| D12 | Only the Invoice aggregate is on the Clean path; all other modules remain on Path A | ~40 modules | UX-2C+ |
| D13 | Read model / outbox projection (TS projectors, `projection_version`) designed but not implemented | 1 subsystem | UX-2C |

---

# 5. Scope for Agency Evaluation & Audit Criteria — نطاق التقييم والمراجعة الفنية

Each category below states **what to inspect**, **how to measure**, and **the pass threshold we consider acceptable**.

## 5.1 Architectural coupling & cleanliness — التماسك المعماري

**Inspect:** `scripts/audits/dep-graph.mjs` output; `src/domain/**` purity; the Path A/Path B split; facade discipline in `src/application/queries/**`; barrel usage.

**Measure:**
- Critical layer violations (baseline 171) and their trajectory.
- Cycles: whole tree (6) and per-layer (`src/ui` must stay 0).
- Max FanIn (93) / FanOut (59) and the distribution tail.
- Public surface area: `src/ui/index.ts` (52 exports), `src/application/queries/index.ts` (4).
- Abstraction ratio in `src/ui/primitives` (currently 0.00 — no wrapper-only files).

**Pass threshold:** no new violation categories; zero domain-layer impurity; every façade a pure re-export until standardized; a documented owner (wave + ADR) for every deferred violation.

**Deliverable expected:** an independent violation census plus a critique of whether the facade strategy (ADR-0028) is the right seam or whether it merely relocates coupling.

## 5.2 Performance & scalability — الأداء وقابلية التوسع

**Inspect:** the 20 heaviest RPCs under a seeded multi-tenant dataset; materialized-view refresh cadence versus staleness tolerance; index coverage for Arabic fuzzy search; React re-render cost on the highest-traffic screens (Dashboard, Invoices list, Customer details); bundle composition.

**Measure:**
- p50/p95 latency per critical RPC at 10 / 100 / 1,000 tenants and 10⁵–10⁶ document rows.
- Sequential scans on tenant-filtered queries (must be zero on hot paths).
- Frontend: TTI, LCP, INP per route; wasted renders per interaction.
- Bundle: initial JS transferred; target ≤ 350 KB gzip for first meaningful route.

**Pass threshold:** no query above 300 ms p95 on hot paths; no route above 3 s TTI on mid-tier mobile over 4G; bundle delta ≤ ±5% versus baseline for any change.

**Deliverable expected:** `EXPLAIN (ANALYZE, BUFFERS)` evidence for the top 20 queries, a flame profile per heavy route, and a prioritized optimization list with expected gain.

## 5.3 Security audit — التدقيق الأمني

**Inspect (adversarial mindset required):**
- Tenant isolation: attempt cross-tenant reads/writes via direct PostgREST calls with a valid token from tenant A against tenant B rows, on **every** table and **every** RPC.
- Grants: confirm no table is reachable by `anon` unless an explicit policy intends it.
- Privilege escalation: role assignment paths, `has_role` definer function, custom-role editing, SoD bypass, financial-limit bypass through bulk operations.
- Edge functions: JWT verification, idempotency enforcement, CORS, input validation, absence of dynamic SQL, secret handling.
- 2FA: TOTP secret storage, replay resistance, recovery flow.
- Storage buckets: object-level policies, signed URL lifetime, PDF/asset leakage across tenants.
- Client: absence of authorization decisions in frontend code, no secrets in the bundle, no PII in logs or telemetry.

**Pass threshold:** zero cross-tenant data access; zero privilege-escalation path; zero unauthenticated write; zero secret in client bundle.

**Deliverable expected:** a reproducible test harness (scripts) proving each isolation claim, plus a severity-ranked finding list with remediation SQL.

## 5.4 Maintainability, testing & CI/CD — القابلية للصيانة والتسليم

**Inspect:** test pyramid shape (1,187 unit/integration vs. a thin Playwright layer), coverage distribution outside the finance domain, the fitness-check suite's false-negative rate, ADR discipline, migration reversibility, environment/config management, release and rollback procedure.

**Measure:**
- Coverage per layer: domain (≥95% today), application, infrastructure, UI (currently unmeasured outside touched files).
- Mean file length and the count of files above the 500-line budget.
- Flakiness rate over 20 consecutive CI runs.
- Time from commit to deployable artifact.

**Pass threshold:** ≥80% line coverage on all non-generated code; zero flaky tests in the gate suite; every migration accompanied by a documented rollback; a single reproducible build command.

**Deliverable expected:** a CI/CD blueprint (environments, gates, seeded test database, preview deployments, blue-green or canary release, backup/restore drill) with estimated implementation effort.

## 5.5 Product & domain-fit review — مراجعة ملاءمة المنتج

Beyond code: validate that the accounting model, tax handling, document cycle and approval semantics match regional statutory practice, and identify gaps (e-invoicing integration, VAT return generation, withholding tax, multi-currency revaluation, fixed assets, payroll).

---

# 6. Comprehensive Future Roadmap — خريطة الطريق والخطوات المستقبلية

## 6.0 Immediate next action (already approved, pending execution)

**UX-3A Wave 2 · Sprint 3.1 · Batch B — residual `pages → repositories` remediation.**

- Scope frozen to `src/pages/**` and `src/application/queries/**`. No `components`, `shared`, `infrastructure`, `domain`, `kernel`, or `runtime` writes.
- Reuse-first gate: no new façade unless (a) no existing façade fits, (b) it cannot be widened without breaking its public contract, and (c) it will serve ≥2 modules. Otherwise the case is deferred, not façaded.
- Dependency budget: **≤2 new public façades**, `src/ui` public exports unchanged, no FanOut increase on any file, no new barrels.
- Exit gate: critical violations ≤155, UI cycles 0, total cycles ≤6, Architecture Score ≥8.2, fingerprint re-sealed, graph diff + ledger updated.
- Additional deliverable: a consolidated **Facade Registry** report listing every Wave 2 façade, its consumers, status, and planned standardization wave — the input to Wave 2.5.

## 6.1 Phase 1 — Immediate (0–3 months) — المرحلة الأولى

**Objective:** eliminate structural debt that blocks safe parallel development, and make quality measurable end-to-end.

| # | Workstream | Concrete output | Exit criterion |
|---|---|---|---|
| 1.1 | Independent audit | Agency audit report across the five categories in section 5 | Findings ranked, owners assigned |
| 1.2 | Layer-violation burn-down (Sprints 3.1B → 3.6) | Critical 171 → 0; hooks→supabase 31 → 0; components→services 5 → 0 | `dep-graph.mjs` critical = 0 |
| 1.3 | Cycle elimination | Remaining 6 non-UI cycles broken (PDF diagnostics/routing, Dashboard prefetch, domain event barrel) | cycles = 0 |
| 1.4 | Test suite expansion | Playwright E2E for the 12 critical business journeys (quote→cash, purchase→pay, month-end close, tenant onboarding, 2FA login, RTL export) | ≥80% coverage; E2E in CI |
| 1.5 | Security remediation | Fixes for every high/critical finding + regression tests | Re-audit clean |
| 1.6 | CI/CD hardening | Seeded test DB, migration rollback drill, preview environments, release checklist | One-command reproducible deploy |
| 1.7 | Component consolidation | 364 duplicate pairs triaged; `ui-kit` sunset plan executed to first milestone | Duplicate pairs ≤100 |
| 1.8 | High-debt file refactor | `CustomerDetailsPage.tsx` (854 LOC, FanOut 59) split; all files ≤500 LOC | LOC budget check enforcing |

## 6.2 Phase 2 — Mid-term (3–6 months) — المرحلة الثانية

**Objective:** finish the Clean Architecture migration for the money-critical aggregates, complete the design system, and harden the API surface.

| # | Workstream | Concrete output |
|---|---|---|
| 2.1 | UX-2C Read Model & Outbox | TypeScript projectors (no DB triggers for projection logic), `projection_version` on every read model, explicit outbox rows, a rebuilder that reuses the same projector |
| 2.2 | Second and third aggregates | `Payment` and `JournalEntry` migrated to the Path B event-sourced model with the same gate discipline as UX-2A |
| 2.3 | UX-3A Waves 2.5 → 4 | Façade standardization (typed Application Query DTOs), UI API uniformity enforcing, Interaction Framework, UX State System (single 11-state union via `UIStateView`), `ui-kit` deleted |
| 2.4 | Waves 5–6 | Data Presentation family (Table/Cards/Kanban/Timeline/Calendar/Tree/Pivot/Charts) and the Dashboard Framework (widget registry + drag-and-drop) |
| 2.5 | API hardening | Versioned public contracts, rate-limit policy per endpoint class, idempotency on every mutating edge function, structured error envelope, OpenAPI-equivalent documentation |
| 2.6 | Performance program | Bundle to ≤350 KB gzip first route (PDF and Excel engines fully deferred), query optimization from the 5.2 findings, index tuning, MV cadence review |
| 2.7 | Observability | Structured logging with correlation IDs end-to-end, error budget/SLO definition, dashboards for posting failures, sync conflicts, and RLS denials |

## 6.3 Phase 3 — Long-term (6+ months) — المرحلة الثالثة

| # | Workstream | Concrete output |
|---|---|---|
| 3.1 | Statutory & e-invoicing | Regional e-invoicing integration, VAT return generation, withholding tax, multi-currency revaluation |
| 3.2 | Domain expansion | Fixed assets, manufacturing/BOM, project accounting, full payroll |
| 3.3 | Enterprise scalability | Tenant sharding strategy, read replicas, archival/partitioning of `stock_movements`, `journal_entries`, `activity_logs`, `invoice_events` |
| 3.4 | Real-time & offline (Wave 9B) | Subscriptions, optimistic updates, conflict-resolution UI on top of the existing sync queue |
| 3.5 | Ecosystem & agents (Wave 10) | MCP tool expansion beyond read-only, third-party connectors (banking, logistics, marketplaces), public partner API |
| 3.6 | Quality bar (Wave 8) | WCAG AAA high-contrast QA, full accessibility certification, performance budget enforcement in CI |
| 3.7 | Operational maturity | Multi-region DR, backup/restore automation with periodic drills, 24/7 runbook, on-call rotation, customer-facing status page |

## 6.4 Non-negotiable constraints for all phases — القيود الملزمة

1. No change may alter observable financial behavior (Principle 13). Any behavior change is a separate, ADR-tracked feature.
2. `src/kernel/**` and `src/platform/**` are frozen; changes require an ADR and a baseline re-seal.
3. No new runtime dependency without an ADR.
4. Every new fitness check ships `warn` before `enforcing`.
5. Every table created in `public` ships with explicit `GRANT`s, RLS enabled, and tenant-scoped policies in the **same** migration.
6. Roles never live on `profiles`; authorization is never decided client-side.
7. No hard deletion of financial entities.
8. Every wave produces: ADR + Audit + Baseline tag + Fitness gate + Scorecard.

---

# 7. Strategic Questionnaire & Agency Review Form — استبيان التقييم والاستلام

To be completed by the agency **after** reading the codebase and this document. Answers should cite file paths, line numbers, or audit-output evidence.

## 7.1 Comprehension checklist — قائمة التحقق من الفهم

| # | Item | Y/N | Evidence / Notes |
|---|---|---|---|
| C-01 | We can reproduce the build and run the full test suite locally | | |
| C-02 | We ran `scripts/fitness/run-all.mjs` and reproduced the reported pass state | | |
| C-03 | We regenerated `dependency-report.json` and reproduced the 171 critical violations | | |
| C-04 | We understand the Path A / Path B duality and can list which modules are on each | | |
| C-05 | We traced one full document cycle (quotation → cash) through all four tiers | | |
| C-06 | We traced one full posting cycle to `journals` / `journal_entries` | | |
| C-07 | We can explain the L1–L7 invoice locks and where each is enforced | | |
| C-08 | We verified that `src/domain/**` imports no React/Supabase/browser globals | | |
| C-09 | We reviewed all 30 ADRs and identified any that are stale or contradicted by code | | |
| C-10 | We reviewed all 181 migrations and can identify non-reversible ones | | |
| C-11 | We enumerated all 16 edge functions and their authorization posture | | |
| C-12 | We inventoried every RLS policy and mapped it to its table's grants | | |

## 7.2 Architecture questions — أسئلة معمارية

1. Is the 4-tier boundary genuinely enforced, or does the Application Query Facade pattern (ADR-0028) relocate coupling without reducing it? Provide evidence.
2. Which of the 171 critical violations are structurally hard (require a design change) versus mechanical (import redirect)? Give the split.
3. Do you recommend continuing the aggregate-by-aggregate Strangler Fig migration, or freezing the Clean path at Invoice and standardizing everything else on a hardened Path A? Justify economically.
4. Is event sourcing warranted for `Payment` and `JournalEntry`, or is a CRUD-plus-audit model sufficient given the DB-native ledger?
5. Are the 6 remaining cycles harmful in practice, or acceptable? Which would you break first?
6. Assess the kernel/platform freeze: does it help, or does it force workarounds elsewhere? Cite examples.
7. Is the fitness-function suite producing real safety, or ceremony? Which checks would you delete, and which are missing?
8. Evaluate the read-model/outbox design (TS projectors + `projection_version`, no trigger logic). Do you agree with rejecting DB triggers for projection?

## 7.3 Security questions — أسئلة أمنية

9. List every path (if any) by which a user of tenant A can read or write tenant B data. Include RPCs, views, storage objects, edge functions, and realtime channels.
10. List every privilege-escalation path, including custom-role editing, SoD bypass, financial-limit bypass, and bulk operations.
11. Is 2FA implementation resistant to replay and enumeration? Is secret storage adequate?
12. Are edge functions uniformly enforcing JWT, idempotency, and input validation? Name the exceptions.
13. Does the PII masking strategy (security-invoker views) actually prevent exposure through joins and RPCs?
14. What is your top-5 severity-ranked finding list, with remediation SQL/code?

## 7.4 Performance questions — أسئلة الأداء

15. Which 10 queries dominate cost at 100 tenants / 10⁶ rows? Provide `EXPLAIN (ANALYZE, BUFFERS)`.
16. Is the materialized-view + cron + stale-fallback strategy correct, or should it be incremental/streaming?
17. Which indexes are missing, redundant, or harmful? Include the GIN/pg_trgm Arabic search indexes in scope.
18. What is the realistic minimum initial bundle after deferring PDF and Excel engines?
19. Which screens have the worst render cost, and what is the fix (memoization, virtualization, query shaping)?
20. What is the tenant ceiling of the current single-database design, and what is the first bottleneck to appear?

## 7.5 Delivery questions — أسئلة التسليم

21. Propose a CI/CD pipeline with gates, environments, seeded data, and rollback. Estimate effort.
22. Propose a test strategy: target pyramid shape, coverage targets per layer, and the E2E journeys you consider mandatory.
23. What is the minimum viable observability stack for production?
24. Define the backup/restore and disaster-recovery posture, including RPO/RTO targets you consider achievable.

## 7.6 Commercial & planning — التخطيط والتعاقد

25. Do you accept the Phase 1/2/3 sequencing in section 6? If not, provide your re-sequenced plan with rationale.
26. Effort estimate per Phase-1 workstream (person-weeks) and proposed team composition (roles and seniority).
27. Identify the top 5 project risks and your mitigation for each.
28. What is missing from this document that you needed and had to discover yourself?

## 7.7 Sign-off — الاعتماد

| Role | Name | Date | Signature |
|---|---|---|---|
| Agency Technical Lead | | | |
| Agency Security Lead | | | |
| Client Product Owner | | | |
| Client Architecture Owner | | | |

---

# 8. Appendices — الملاحق

## 8.1 Repository map for reviewers — خريطة المستودع

| Path | What to read it for |
|---|---|
| `docs/adr/INDEX.md` | Every accepted architectural decision (0000–0030) |
| `docs/architecture/PRINCIPLES.md` | The 13 immutable principles |
| `docs/architecture/DEPENDENCY_RULES.md` | Canonical layer specification, invariants W1-INV-1..12 |
| `docs/architecture/UX3A-ROADMAP.md` | Wave plan and per-wave scorecard template |
| `docs/architecture/UI_HEALTH_REPORT.md` | Current architecture health numbers |
| `docs/architecture/UI_API_V1.md` | UI API uniformity charter + façade registry |
| `docs/architecture/WAVE2_BATCH_2B_LEDGER.md` | Violation ledger with owners |
| `docs/architecture/WAVE2_SPRINT3_BATCHA*.md` | Latest remediation batch: decisions, comparison, graph diff |
| `docs/architecture/baseline/` | Sealed baselines and signed wave audits |
| `docs/engineering-standards.md` | Arabic engineering standards, PR rejection criteria |
| `docs/security-hardening-report.md` | Security posture history |
| `docs/risk-log/` | Named risks with mitigations |
| `docs/audit-reports/` | Dead buttons/routes, TODOs/stubs, i18n/RTL, edge-function coverage |
| `scripts/audits/output/*.json` | All machine-readable metrics cited in section 4 |
| `scripts/fitness/run-all.mjs` | Single entry point to run every architecture check |

## 8.2 Command reference — الأوامر

```bash
# Install & run
bun install && bun run dev

# Quality gates
node scripts/fitness/run-all.mjs        # all architecture fitness checks
bunx vitest run                          # unit + integration suite (1,187 tests)
bunx playwright test                     # E2E suite
bunx tsgo --noEmit                       # type check

# Metric regeneration (deterministic)
node scripts/audits/dep-graph.mjs
node scripts/audits/ui-dep-graph.mjs
node scripts/audits/bundle-report.mjs
node scripts/audits/route-inventory.mjs
node scripts/audits/component-inventory.mjs
node scripts/audits/tests-report.mjs
node scripts/audits/build-baseline-tag.mjs
```

## 8.3 Glossary — المصطلحات

| Term | Meaning |
|---|---|
| Aggregate Root | The single entry point that guards a cluster of domain objects' invariants |
| Value Object | Immutable, identity-less domain type compared by value (`Money`, `TaxRate`) |
| Event Sourcing | Persisting state as an ordered append-only event stream; state is derived |
| `sequence` | The monotonic ordering authority for events (timestamps are never used for ordering) |
| Strangler Fig | Incremental replacement of a legacy path by routing traffic to a new implementation aggregate by aggregate |
| Fitness Function | An automated, executable architecture rule that fails CI when violated |
| Baseline Tag | A SHA-256 fingerprint over ADRs, locks, and the project map, sealing a known-good architectural state |
| Façade | A pure re-export module giving upper layers a sanctioned import path (ADR-0028) |
| RLS | PostgreSQL Row Level Security — the tenant isolation enforcement mechanism |
| SoD | Segregation of Duties — the same actor may not create and approve the same financial document |
| Path A / Path B | Legacy repository path / Clean event-sourced domain path |
| Nazra | The decision-intelligence layer producing prioritized business recommendations |
| MV | Materialized View, refreshed by `pg_cron` with a real-time fallback when stale |
| HAFZ | Half-Away-From-Zero rounding, the single sanctioned rounding mode |

## 8.4 Document maintenance — صيانة الوثيقة

This file is the SSOT. It must be regenerated whenever:

- a wave, sprint, or batch closes (numbers in section 4 change);
- a new ADR is accepted;
- a baseline tag is re-sealed;
- the debt register in 4.4 changes materially.

Numbers must always be sourced from `scripts/audits/output/*.json`, never estimated by hand.

---

**End of document — نهاية الوثيقة**
