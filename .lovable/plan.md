# Fix Final 2 Legacy Test Failures

Both failures are **stale test assertions** that didn't keep up with recent production code changes. Production code is correct; the tests need updating.

## Failure 1 — `edge-function-security.test.ts` › processPayment

**Cause:** `processPayment` now adds tracing headers (`Idempotency-Key`, `x-correlation-id` via `buildRequestHeaders`) to the `supabase.functions.invoke` call. The test still asserts the exact old shape (`{ body: {...} }` only) and fails because `headers` is now present.

**Fix:** Use `expect.objectContaining` for the second argument and assert only the `body` shape. Add a separate assertion that `headers` contains a UUID-shaped `x-correlation-id` and `Idempotency-Key` so the tracing contract stays covered.

```ts
expect(mockInvoke).toHaveBeenCalledWith(
  'process-payment',
  expect.objectContaining({
    body: { payment_data: { /* unchanged */ } },
    headers: expect.objectContaining({
      'x-correlation-id': expect.any(String),
      'Idempotency-Key': expect.any(String),
    }),
  }),
);
```

## Failure 2 — `useSidebarCounts.test.tsx` › should fetch counts when user is authenticated

**Cause:** `useSidebarCounts` was refactored to call a single RPC `supabase.rpc('get_sidebar_counts')` instead of 7 `supabase.from(...)` queries. The test still asserts `expect(supabase.from).toHaveBeenCalled()` and also doesn't mock `supabase.rpc`, so the hook errors out silently and returns zero counts.

**Fix in** `src/__tests__/unit/hooks/useSidebarCounts.test.tsx`**:**

1. Extend the top-level `vi.mock('@/integrations/supabase/client')` to expose `rpc: vi.fn(() => Promise.resolve({ data: {...zeros}, error: null }))`.
2. Update the "should fetch counts when user is authenticated" test to assert `expect(supabase.rpc).toHaveBeenCalledWith('get_sidebar_counts')`.
3. Update the "should return SidebarCounts interface shape" test to mock `supabase.rpc` returning the snake_case RPC payload (`pending_invoices`, `pending_sales_orders`, …) instead of the per-table `from().select()` chain.
4. Update the "should handle fetch errors gracefully" test to mock `supabase.rpc` returning `{ data: null, error: { message: 'Error' } }` and assert the hook still resolves with zeroed counts (the existing fallback in the hook).
5. Leave the "not fetch when user is not authenticated" and "refetch periodically" tests as-is (they don't touch `from`).

No production code changes. Only the two test files are edited.

## Verification

Run `bunx vitest run` and confirm **1152/1152 green**, with the previously failing two tests now passing and no regressions in the surrounding suites (`edge-function-security`, `useSidebarCounts`).

Act as a Principal QA & Automation Engineer. We need to update two legacy, stale test files to realign them with our correct production code updates, bringing our suite to a 100% perfect green baseline (1152/1152 passing tests). 

&nbsp;

Please safely apply the following test fixes:

&nbsp;

1. Fix `edge-function-security.test.ts` (processPayment suite):

- Production code now correctly injects tracing headers (`Idempotency-Key` and `x-correlation-id`) via `buildRequestHeaders` inside the `supabase.functions.invoke` call.

- Update the test assertion to use `expect.objectContaining` for the invocation parameters.

- Verify that the body shape matches the required payment contract, and explicitly assert that `headers` contains `x-correlation-id: expect.any(String)` and `Idempotency-Key: expect.any(String)`.

&nbsp;

2. Fix `src/__tests__/unit/hooks/useSidebarCounts.test.tsx`:

- Production code has optimized count fetching into a single unified RPC call (`get_sidebar_counts`) instead of 7 split table queries.

- Extend the top-level `vi.mock('@/integrations/supabase/client')` mock payload to cleanly expose and mock the `rpc` function: `vi.fn(() => Promise.resolve({ data: {}, error: null }))`.

- In the "should fetch counts when user is authenticated" test, change the assertion to expect `supabase.rpc` to have been called with `'get_sidebar_counts'`.

- In the "should return SidebarCounts interface shape" test, configure `supabase.rpc` to return a successful snake_case mock payload matching the RPC output format (`pending_invoices`, `pending_sales_orders`, etc.).

- In the "should handle fetch errors gracefully" test, mock `supabase.rpc` returning `{ data: null, error: { message: 'Error' } }` and verify the hook smoothly falls back to zeroed counts as intended.

&nbsp;

Run the absolute full test suite (`bunx vitest run`) afterwards to confirm that we have successfully achieved a flawless 1152/1152

 green test run!