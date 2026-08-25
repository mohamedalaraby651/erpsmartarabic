# Stop Report Template

A stop is a valid, expected outcome — not a failure. Stopping preserves scope integrity.

```text
STOP REPORT

Stop ID:
Date:
Wave / Batch:
Commit:
Baseline / Snapshot:

Trigger (one or more):
  [ ] Unexpected architectural change
  [ ] Unexpected business-behavior change
  [ ] Class D change surfaced inside a lower-class batch
  [ ] Target unreachable within the frozen scope
  [ ] Evidence contradicts the batch premise
  [ ] Evidence integrity / staleness failure
  [ ] Other:

What was observed (facts only, with file:line or artifact references):

What was already changed before stopping:

Current repository state:
  Working tree:      clean | modified (list files)
  Typecheck:         PASS | FAIL
  Build:             PASS | FAIL
  Tests:             PASS | FAIL
  Fitness:           PASS | FAIL

Impact if we proceed anyway:

Options:
  A —
  B —
  C —

Recommendation:

Decision required from: Human Governance
```
