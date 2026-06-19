# Architecture Principles (Immutable)

> Baseline: **UX-0**. These principles govern every subsequent UX phase. Changes require a new ADR + explicit revision of this document.

1. **UI does not know the database.** No `supabase.from(...)`, no SQL, no raw query in `src/components/**` or `src/pages/**`. All data access goes through `src/lib/repositories/**` and `src/lib/queries/**`.
2. **Workflow is the source of truth for state.** Business state transitions (draft → posted → cancelled) live in workflow definitions, not in component-local `useState`.
3. **Workspace defines context only.** A Workspace (Finance, Inventory, CRM…) carries tenant + role + permission scope — not data and not business logic.
4. **Repository is the only boundary to data.** Every read, write, RPC, realtime, storage, or auth call is exposed via a typed repository function. Shadow repositories (ad-hoc `supabase.*` calls) are violations.
5. **Contracts separate UI from Domain.** UI consumes typed contracts (`Invoice`, `Customer`, `JournalEntry`) — not raw database rows. Contracts can evolve independently of schema.
6. **Every Pattern must be proven on a POC before generalization.** No library, primitive, or abstraction is rolled out across the codebase until one feature ships using it successfully.
7. **No layer is built before a measured need exists.** Foundation, Workflow Engine, Plugin SDK — each waits for evidence (KPIs) showing the next phase is justified.
8. **Architectural decisions are recorded as ADRs before implementation.** Anything that changes structure, dependencies, or layer boundaries needs an ADR.
9. **State belongs to the lowest responsible owner.** Lift state only when two siblings genuinely share it. Global stores are a last resort, not a default.
10. **Composition before inheritance.** Components compose primitives and hooks; we do not build deep class hierarchies, mega-HOCs, or god-context providers.
11. **Feature boundaries are stronger than folder boundaries.** A `feature/` may not reach into another feature’s internals; cross-feature contracts go through `lib/` or `domain/`.
12. **Everything is measurable before it is refactored.** A refactor without a before-number is forbidden — we cannot prove improvement without baseline.
13. **Backward compatibility before optimization.** No optimization, refactor, or modernization may change observable business behavior. ERP rule: numbers in reports, journal balances, document totals, and posted state must remain identical pre/post-change. If improvement requires a behavior change, it becomes a separate, ADR-tracked feature — not a refactor.

---

Locked: UX-0. Modifications require ADR `0001-*` or later.

## UX-1 Governance Pre-flight (Wave 0)

These documents extend the principles above and are binding from UX-1 onward:

- [Contract Versioning](../contracts/CONTRACT_VERSIONING.md)
- [UI Performance Budget](./UI_PERFORMANCE_BUDGET.md)
- [Canonical Component Criteria & Lifecycle](./CANONICAL_COMPONENT_CRITERIA.md)
- [Workspace API](./WORKSPACE_API.md)
- [Workspace Certification](./WORKSPACE_CERTIFICATION.md)
- [State Hierarchy](./STATE_HIERARCHY.md)
- [UX Regression Checklist](../qa/UX_REGRESSION_CHECKLIST.md)
- [ADR Template](../adr/TEMPLATE.md)
- [ADR Registry (INDEX)](../adr/INDEX.md)
- [Engineering Scorecard](./ENGINEERING_SCORECARD.md)
- [Token Changelog](./TOKEN_CHANGELOG.md)
