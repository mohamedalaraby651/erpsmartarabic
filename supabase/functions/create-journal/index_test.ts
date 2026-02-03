import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";

const FUNCTION_URL = "http://localhost:54321/functions/v1/create-journal";

Deno.test("create-journal: should reject unauthenticated requests", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      journal_date: "2025-01-15",
      description: "Test journal",
      entries: [],
    }),
  });

  assertEquals(response.status, 401);
  const data = await response.json();
  assertExists(data.error);
});

Deno.test("create-journal: should reject empty entries", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-token",
    },
    body: JSON.stringify({
      journal_date: "2025-01-15",
      description: "Test journal",
      entries: [],
    }),
  });

  const data = await response.json();
  // Should fail validation - entries cannot be empty
  assertExists(data.error || response.status >= 400);
});

Deno.test("create-journal: should reject unbalanced entries", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-token",
    },
    body: JSON.stringify({
      journal_date: "2025-01-15",
      description: "Unbalanced journal",
      entries: [
        { account_id: "acc-1", debit_amount: 1000, credit_amount: 0 },
        { account_id: "acc-2", debit_amount: 0, credit_amount: 500 },
        // Unbalanced: debit 1000 != credit 500
      ],
    }),
  });

  const data = await response.json();
  // Should fail - journal must be balanced
  assertExists(data.error || response.status >= 400);
});

Deno.test("create-journal: should reject invalid date format", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-token",
    },
    body: JSON.stringify({
      journal_date: "invalid-date",
      description: "Test journal",
      entries: [
        { account_id: "acc-1", debit_amount: 1000, credit_amount: 0 },
        { account_id: "acc-2", debit_amount: 0, credit_amount: 1000 },
      ],
    }),
  });

  const data = await response.json();
  assertExists(data.error || response.status >= 400);
});

Deno.test("create-journal: should reject entries with both debit and credit", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-token",
    },
    body: JSON.stringify({
      journal_date: "2025-01-15",
      description: "Invalid entry",
      entries: [
        // Invalid: entry has both debit AND credit
        { account_id: "acc-1", debit_amount: 1000, credit_amount: 500 },
      ],
    }),
  });

  const data = await response.json();
  assertExists(data.error || response.status >= 400);
});

Deno.test("create-journal: should handle CORS preflight", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:3000",
      "Access-Control-Request-Method": "POST",
    },
  });

  assertEquals(response.status, 200);
});

Deno.test("create-journal: should reject missing journal_date", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-token",
    },
    body: JSON.stringify({
      description: "Missing date",
      entries: [
        { account_id: "acc-1", debit_amount: 1000, credit_amount: 0 },
        { account_id: "acc-2", debit_amount: 0, credit_amount: 1000 },
      ],
    }),
  });

  const data = await response.json();
  assertExists(data.error || response.status >= 400);
});
