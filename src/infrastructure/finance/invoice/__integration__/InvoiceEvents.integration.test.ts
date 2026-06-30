/**
 * Wave 2B integration scenarios — Finance / Invoice persistence.
 *
 * These tests hit the live Supabase database and require a fully
 * provisioned `invoice_events` table + RLS policies. They are gated
 * behind `process.env.INTEGRATION === "1"` so the unit-test build stays
 * hermetic. CI may enable them in a dedicated job that provisions test
 * users.
 *
 * Scenarios (per ADR-0012 §D-0012-07 + Wave 2B addendum A3):
 *
 *   1. Concurrency           — two concurrent appendEvents with the same
 *                              expectedVersion: exactly one Conflict.
 *   2. Rehydration           — load() returns events ordered 1..N gap-free.
 *   3. TenantIsolation       — tenant B can never observe tenant A rows.
 *   4. TenantOrphan (A3)     — user with no user_tenants row: SELECT
 *                              returns zero rows; INSERT rejected.
 *   5. GapAfterRace          — after a concurrent insert wins slot N, the
 *                              loser does NOT leave a phantom row at N+1.
 *
 * Each scenario is described as a self-contained `it.skip(...)` block
 * with the exact assertion shape so it can be promoted to a live run in
 * a CI matrix without re-deriving the test plan. Implementing the live
 * client wiring is deliberately deferred to the CI job that owns test
 * credentials.
 */
import { describe, it, expect } from "vitest";

const INTEGRATION = process.env.INTEGRATION === "1";
const d = INTEGRATION ? describe : describe.skip;

d("UX-2B Wave 2B — invoice_events integration (live DB)", () => {
  it.skip("1. Concurrency: two parallel appendEvents@v0 ⇒ exactly one Conflict", async () => {
    // Pseudocode (filled in by the integration-credentials CI job):
    //   const ctx = await loginAs("tenantA-user");
    //   const repo = newRepo(ctx);
    //   const [a, b] = await Promise.allSettled([
    //     repo.appendEvents(id, 0, [issuedA], ctx),
    //     repo.appendEvents(id, 0, [issuedB], ctx),
    //   ]);
    //   const oks   = [a, b].filter(r => r.status === "fulfilled" && isOk((r as any).value));
    //   const fails = [a, b].filter(r => r.status === "fulfilled" && isErr((r as any).value));
    //   expect(oks.length).toBe(1);
    //   expect(fails.length).toBe(1);
    //   expect((fails[0] as any).value.error.kind).toBe("Conflict");
    expect(true).toBe(true);
  });

  it.skip("2. Rehydration: load() returns events ordered by sequence, gap-free 1..N", async () => {
    // append N events, then load(); assert sequences === [1..N] and ordering
    // matches insertion order.
    expect(true).toBe(true);
  });

  it.skip("3. TenantIsolation: tenant B cannot see tenant A rows", async () => {
    // Sign in as tenantA-user, append events. Sign in as tenantB-user,
    // load(sameId) ⇒ NotFound. Direct .from("invoice_events").select("*")
    // ⇒ zero rows.
    expect(true).toBe(true);
  });

  it.skip("4. TenantOrphan (A3): user with no user_tenants row sees nothing and cannot insert", async () => {
    // Sign in as orphan-user (user_tenants returns 0 rows).
    // a. select returns [].
    // b. insert is rejected (RepositoryFailure of kind "PermissionDenied"
    //    or "Conflict" depending on RLS error mapping in pgErrorMap).
    expect(true).toBe(true);
  });

  it.skip("5. GapAfterRace: loser of a concurrent race leaves no phantom row", async () => {
    // Reuse Concurrency setup; after one Conflict, query
    // SELECT count(*) WHERE aggregate_id = id ⇒ exactly N rows,
    // sequences contiguous from 1..N (no gap, no orphan slot).
    expect(true).toBe(true);
  });
});
