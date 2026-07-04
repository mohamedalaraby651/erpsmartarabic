# PROJECT MAP — UX-2B (locked at Wave 2B)

A one-page topographical index of the Finance-side runtime stack as of
ADR-0012 acceptance. Layers and their boundaries:

```text
        ┌──────────────────────────────────────────────────┐
        │  UI / App shell  (out of finance scope, untouched)│
        └────────────────────────┬─────────────────────────┘
                                 │ depends on
                                 ▼
        ┌──────────────────────────────────────────────────┐
        │  Composition Root        src/composition/         │
        │   • createFinanceModule(deps) — the ONLY file     │
        │     allowed to import domain + application +      │
        │     infrastructure in the same module.            │
        └────────┬───────────────┬───────────────┬─────────┘
                 │               │               │
                 ▼               ▼               ▼
   ┌──────────────────┐  ┌────────────────┐  ┌────────────────────────────┐
   │ Domain           │  │ Application    │  │ Infrastructure             │
   │ src/domain/      │  │ src/application/│ │ src/infrastructure/        │
   │   finance/       │  │   finance/      │ │   finance/invoice/          │
   │                  │  │                 │ │                             │
   │ Invoice          │  │ IssueInvoice    │ │ SupabaseInvoiceRepository   │
   │ Money / TaxRate  │  │ ApplyPayment    │ │ EventCodecRegistry          │
   │ InvoiceLine      │  │ VoidInvoice     │ │ EventStreamRehydrator       │
   │ Events (v1)      │  │ AppError union  │ │ pgErrorMap                  │
   │ Ports            │  │ Surface manifest│ │ Codecs (Issued/Paid/Voided) │
   └──────────────────┘  └────────────────┘  └────────────────────────────┘
                                                         │
                                                         ▼
                                          ┌─────────────────────────────┐
                                          │ DB     public.invoice_events │
                                          │   RLS  tenant_id = current_tenant()│
                                          │   Unique (aggregate_id, sequence)  │
                                          └─────────────────────────────┘
```

## Dependency rules (enforced)

| Direction                                | Allowed? | Enforced by                                            |
|------------------------------------------|----------|--------------------------------------------------------|
| Domain → Application                     | No       | `check-domain-purity`                                  |
| Domain → Infrastructure                  | No       | `check-ui-infrastructure-isolation`                    |
| Domain → UI                              | No       | `check-ui-infrastructure-isolation`                    |
| Application → Domain                     | Yes      | (via `@/domain/finance` barrel only)                   |
| Application → Infrastructure             | No       | `check-adapter-error-boundary` (Direction 2)           |
| Application → UI                         | No       | `check-ui-infrastructure-isolation`                    |
| Infrastructure → Domain                  | Yes      | (via `@/domain/finance` barrel + own internals)        |
| Infrastructure → Application             | No       | `check-adapter-error-boundary` (Direction 1)           |
| Infrastructure → UI                      | No       | `check-adapter-error-boundary` Direction 1 + R4 UI bans|
| Composition → Domain/App/Infra together  | Yes      | `check-composition-root-uniqueness` (exactly 1 root)   |

## Active fitness checks (22)

Read order (see `scripts/fitness/run-all.mjs`):

1. check-temporal-authority      8. check-domain-purity            15. check-domain-api-stability
2. check-identity-authority      9. check-domain-service-purity    16. check-domain-bigint-boundary
3. check-retryability-single-source  10. check-error-mapping       17. check-domain-strictness
4. check-no-deep-imports         11. check-repository-failure-taxonomy  18. check-application-purity
5. check-aggregate-boundaries    12. check-handler-signature       19. check-application-surface
6. check-domain-events-immutable 13. check-ui-infrastructure-isolation  20. check-adapter-error-boundary
                                 14. check-composition-root-uniqueness  21. check-transaction-finality
                                                                       22. **check-metadata-non-domain** (new, Wave 2B)

## Key contracts at this lock

* Events are ordered by `(aggregate_id, sequence)` and ONLY by sequence
  (ADR-0012 §D-0012-08).
* `metadata` is operational; domain code never reads it (ADR-0012
  §D-0012-09; enforced by `check-metadata-non-domain`).
* `RepositoryFailure` carries `CorruptedPersistenceData` for at-rest
  invariant breaks (ADR-0012 §D-0012-01); `isRetryable` is the single
  classifier (ADR-0010 R-0010-03).
* `EventCodecRegistry` is the ONLY module that handles `schemaVersion`;
  `SupabaseInvoiceRepository` is schema-version blind.
* `current_tenant()` returns NULL for orphaned users; RLS filters them
  out on SELECT and rejects them on INSERT (TenantOrphan scenario).

---

## UX-3A Wave 1 — Frontend Platform (BASELINE-UX3A-001)

- `src/kernel/**` — pure primitives (identity, clock, culture, i18n, env, flags, tenant, permissions).
- `src/platform/**` — `runtime/`, `ports/` (+ `adapters/{browser,memory}/`), `shell/`, `registries/` (reserved), `modules/` (reserved), `ai/` (slot constants only).
- `src/components/layout/AppLayout.tsx` imports `@/platform/shell` only. `AdaptiveShell.tsx` deprecated (composed by `PlatformShell` only).
- Fitness: `check-platform-layering` (enforcing), `check-kernel-browser-globals`, `check-port-adapter-parity`, `check-port-registry-completeness`, `check-platform-shell-single-entry`, `check-no-new-adaptiveshell-imports`.
- References: [DEPENDENCY_RULES](docs/architecture/DEPENDENCY_RULES.md), [UX3A reference](docs/architecture/reference/UX3A-FRONTEND-PLATFORM.md), ADR-0014/0015/0023/0024.
