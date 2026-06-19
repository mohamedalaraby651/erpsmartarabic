# Architecture Decisions — Q1 → Q6 (Locked at UX-0)

This document captures the six foundational decisions made before UX-0 execution. They are referenced by every subsequent ADR.

| # | Question | Decision | Reasoning (one line) |
|---|----------|----------|----------------------|
| Q1 | Rewrite vs Evolution? | **Evolutionary Frontend Modernization** (no rewrite) | Business logic, DB, and repository layer are stable; only the presentation layer is the problem. |
| Q2 | What is the right level of rebuild? | **Three layers**: ERP UI Operating System → Workspace Architecture → Business Screens | Build the system that produces UIs, not the UIs themselves. |
| Q3 | What is built first? | **Foundation primitives**: Tokens → Layout → Navigation → DataGrid → Forms → Dialogs → CommandBar → Shell | Every screen consumes these; without them, every screen reinvents them. |
| Q4 | First Workspace? | **Finance** | Covers nearly every UI pattern (tables, forms, approval, posting, reports, KPIs, multi-step flows). If Finance succeeds, every workspace can succeed. |
| Q5 | Definition of Done? | A Workspace is *Done* only when it uses tokens + shell + standard grid + repository + command system + permissions, is responsive, accessible, tested, documented, and contains **zero legacy components**. | Aesthetic improvements are not DoD. Compliance with the OS is. |
| Q6 | How is degradation prevented over years? | Build an **ERP UI Operating System** with Contracts, Composition Rules, Layout Rules, Navigation Rules, Interaction Rules, A11y Rules, Motion Rules, Permission Rules, Extension Rules, and Workspace Contracts — enforced via lint rules, dependency boundaries, and CI checks. | Code reviews alone cannot prevent drift across multi-year ERP development. |

---

**Status:** Locked at UX-0. Any revision requires an ADR and a phase boundary.
