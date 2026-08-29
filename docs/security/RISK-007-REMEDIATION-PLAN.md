# RISK-007 — Security Findings Classification & Remediation Plan (Control 2)

- **Track:** Security. Separate from architecture. Not part of any Batch B scope hash.
- **Authorization status:** **PLAN ONLY.** No security remediation is authorized by the
  Post-Exit Control Resolution. This document is a plan and a classification, not a fix record.
- **Certification:** none claimed. 2FA remains **CONTAINED, NOT CERTIFIED**.

## 1. Finding inventory (unchanged, re-stated with a per-finding pipeline)

Every finding must traverse the same seven stages before it can be closed:

```text
Finding → Reproduce → Classify → Impact → Remediation → Test → Evidence
```

| ID | Finding | Class | Stage reached | Blocking question |
|---|---|---|---|---|
| RISK-007.1 | TOTP-related scanner finding | Sensitive data exposure | Reproduce | Is it the counterpart of the contained 2FA issue, or a distinct surface? **Cannot be classified without the second scanner's own evidence.** No inference-based closure. |
| RISK-007.2 | Raw DB error disclosure — `export-customers` | Information leakage | Classify | Does the raw Postgres `.message` reach an unauthenticated caller, or only an authenticated tenant member? |
| RISK-007.3 | Raw DB error disclosure — `render-pdf` | Information leakage | Classify | same |
| RISK-007.4 | Raw DB error disclosure — `rollback-restore` / `restore-backup` | Information leakage | Classify | Table whitelisting and tenant rewrite already verified correct; only error text leaks |
| RISK-007.5 | Raw DB error disclosure — `verify-totp` / `approve-invoice` | Information leakage | Classify | `verify-totp` is on the 2FA path → couples to the five outstanding 2FA proofs |
| RISK-007.6 | Raw DB error disclosure + unsanitized search interpolation — MCP tools (`list-customers`, `list-recent-invoices`, `search-products`) | Information leakage + injection into PostgREST `.or()` filters | Classify | The `.or()` interpolation is the only item here with a plausible **integrity** (not just disclosure) impact — it must be split into its own finding before remediation |

## 2. Structural conclusion

RISK-007.2 … RISK-007.6 share **one root cause**: edge functions return `error.message` verbatim
instead of mapping to a stable, non-disclosing error contract. That is a single missing boundary
control (an error-mapping port at the edge boundary), not five independent bugs.

RISK-007.1 does **not** share that root cause and must not be bundled with them.
The `.or()` interpolation inside RISK-007.6 does not either.

Therefore the security wave splits into three units, not six:

```text
SEC-U1  Edge error-mapping boundary        → RISK-007.2 .. 007.6 (disclosure part)
SEC-U2  PostgREST filter input sanitation  → RISK-007.6 (injection part, split out)
SEC-U3  TOTP finding + 2FA proof closure   → RISK-007.1 + the 5 outstanding proofs
```

## 3. Preconditions before any remediation is authorized

1. A fresh security scan producing **the scanner's own evidence** per finding (no inference).
2. A dedicated scope contract with a frozen file list and scope hash, mirroring `BATCHB-SCOPE-001`.
3. Negative tests written **before** the fix for each unit (unauthorized read denied; error text
   contains no schema/table/constraint identifiers; malicious search term does not alter the filter).
4. SEC-U3 additionally requires all five proofs in `docs/security/2fa-containment-record.md`:
   client read denied · server verification works · backup-code verification works ·
   tenant/RLS boundary correct · secret material not exposed via views, RPCs, logs, or edge responses.

## 4. Explicit non-claims

```text
Containment  ≠  Remediation  ≠  Verification  ≠  Certification
```

Revoking column-level SELECT on 2FA secret material proved a containment **action**.
It proves nothing about the integrity of the verification path.

## 5. Status

Control 2 — **CLASSIFIED / PLANNED**. `RISK-007` remains **OPEN**.
Security remediation awaits its own explicit authorization and its own scope contract.
