# RISK-007 — Security Findings Backlog (Separate Track)

**Not part of Batch B.** `Batch B (Architecture Migration) ≠ Security Remediation`. None of these items may be remediated inside BATCHB-SCOPE-001 or appear in its scope hash.

| ID | Finding | Class | Status | Note |
|---|---|---|---|---|
| RISK-007.1 | TOTP-related scanner finding | Sensitive data exposure | OPEN | May be the counterpart of the contained 2FA issue **or** a false positive — cannot be classified either way without the second scanner's own evidence. Do not close by assumption. |
| RISK-007.2 | Raw DB error disclosure — `export-customers` | Information leakage | OPEN | Returns raw Postgres `.message` |
| RISK-007.3 | Raw DB error disclosure — `render-pdf` | Information leakage | OPEN | |
| RISK-007.4 | Raw DB error disclosure — `rollback-restore` / `restore-backup` | Information leakage | OPEN | Table whitelisting and tenant rewrite are already correct; only error text leaks |
| RISK-007.5 | Raw DB error disclosure — `verify-totp` / `approve-invoice` | Information leakage | OPEN | |
| RISK-007.6 | Raw DB error disclosure — MCP tools (`list-customers`, `list-recent-invoices`, `search-products`) | Information leakage | OPEN | Also tracked: unsanitized search interpolation into PostgREST `.or()` filters |

## Handling rules

- Classification as "false positive" requires scanner evidence, never inference.
- Remediation happens in a dedicated Security wave with its own scope contract and evidence set.
- One scope → one intent → one evidence set → one decision.

## Related

- `docs/security/2fa-containment-record.md` — containment recorded, 5 proofs outstanding, not certified
