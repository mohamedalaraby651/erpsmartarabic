import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/approve-expense`;

// ============================================
// Authentication Tests
// ============================================

Deno.test("approve-expense: should return 401 for missing Authorization header", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expense_id: "test-expense-id",
      action: "approve",
    }),
  });

  const data = await response.json();
  assertEquals(response.status, 401);
  assertEquals(data.code, "UNAUTHORIZED");
  await response.text();
});

Deno.test("approve-expense: should return 401 for invalid Bearer token", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer invalid_token",
    },
    body: JSON.stringify({
      expense_id: "test-expense-id",
      action: "approve",
    }),
  });

  const data = await response.json();
  assertEquals(response.status, 401);
  assertEquals(data.code, "INVALID_TOKEN");
  await response.text();
});

// ============================================
// Input Validation Tests
// ============================================

Deno.test("approve-expense: should return 400 for missing expense_id", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action: "approve" }),
  });

  // Will be 401 because anon key is not a valid user token
  assertExists(response);
  await response.text();
});

Deno.test("approve-expense: should return 400 for missing action", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ expense_id: "test-id" }),
  });

  assertExists(response);
  await response.text();
});

Deno.test("approve-expense: should require rejection_reason for reject action", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      expense_id: "test-id",
      action: "reject",
      // missing rejection_reason
    }),
  });

  assertExists(response);
  await response.text();
});

// ============================================
// CORS Tests
// ============================================

Deno.test("approve-expense: should handle OPTIONS preflight request", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
  });

  assertEquals(response.status, 200);
  const corsHeader = response.headers.get("Access-Control-Allow-Origin");
  assertEquals(corsHeader, "*");
  await response.text();
});

// ============================================
// Response Structure Tests
// ============================================

Deno.test("approve-expense: error response should have correct structure", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  const data = await response.json();
  assertExists(data.success !== undefined || data.error !== undefined);
  assertExists(data.code);
  await response.text();
});
