# Baseline 03 — Components

> Source of truth: [`scripts/audits/output/component-report.json`](../../../scripts/audits/output/component-report.json) · Baseline: **UX-0**

## Numbers

| Metric | Value |
| ------ | ----: |
| Files analyzed | **873** |
| Avg component LOC | **161.07** |
| Avg hook LOC | **100** |
| Avg props per component (when typed) | **5.13** |
| Files > 300 LOC | **93** |
| Files > 500 LOC | **7** |

## Inventory (high level)

| Kind | Count |
| ---- | ----: |
| feature components | (JSON `byKind.feature`) |
| primitives (`ui/` + `ui-kit/`) | (JSON `byKind.primitive`) |
| dialogs / forms / tables / charts | (JSON `byKind.*`) |
| hooks | (JSON `byKind.hook`) |
| pages | (JSON `byKind.page`) |

Full lists: see `byKind` and `inventory.*` blocks in the JSON.

## Competing primitives

The JSON `inventory.competingPrimitives` lists every primitive name that exists in **both** `components/ui/` and `components/ui-kit/`. Each entry is a UX-1 decision (canonicalize or deprecate).

## UX-1 inputs

- Resolve the 93 files > 300 LOC: triage into *split / extract / refactor*.
- Pick **one** canonical home for each competing primitive (decision recorded as ADR-0001+).
- Establish avg component LOC target (≤ 150) and props target (≤ 5).
