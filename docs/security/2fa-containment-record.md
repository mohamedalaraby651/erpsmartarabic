# 2FA Security Containment Record

**Track: Security. Not part of Batch B. Not part of BATCHB-SCOPE-001 or its scope hash.**

## Action taken

```text
Client roles (anon, authenticated)
     ↓
user_2fa_settings.secret_key / secret_encrypted / backup_codes
     ↓
column-level SELECT REVOKED
     ↓
reads remain only in the service-role verification path
```

## Status

```text
Exposure:       CONTAINED
Verification:   REQUIRED
Certification:  NOT CERTIFIED
Outstanding proofs: 5
```

Revoking read access proves a containment action. It does **not**, on its own, prove the integrity of the full verification path. No certification is claimed.

## Outstanding proofs (5)

| # | Proof | Status |
|---|---|---|
| 1 | Unauthorized client read → DENIED | not proven |
| 2 | Authorized server verification → WORKS | not proven |
| 3 | Backup-code verification → WORKS | not proven |
| 4 | Tenant / RLS boundary → CORRECT | not proven |
| 5 | Secret material → NOT EXPOSED (no leak via views, RPCs, logs, or edge responses) | not proven |

Proof 1 (access denial) and proof 5 (no exposure through any other surface) are deliberately distinct: the first tests the direct table path, the second tests every indirect path.

## Rules

- Do not fold these proofs into a Batch B evidence set.
- Do not record "2FA Security = Certified" until all five proofs are captured and reviewed by a human.
- Any future change to the 2FA verification path re-opens all five proofs.
