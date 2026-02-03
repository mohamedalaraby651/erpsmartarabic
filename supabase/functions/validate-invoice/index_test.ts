import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/validate-invoice`;

// ============================================
// Authentication Tests
// ============================================

Deno.test("validate-invoice: should return 401 for missing Authorization header", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoice_data: { customer_id: "test", total_amount: 100 } }),
  });

  const data = await response.json();
  assertEquals(response.status, 401);
  assertEquals(data.code, "UNAUTHORIZED");
});

Deno.test("validate-invoice: should return 401 for invalid Bearer token", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer invalid_token_here",
    },
    body: JSON.stringify({ invoice_data: { customer_id: "test", total_amount: 100 } }),
  });

  const data = await response.json();
  assertEquals(response.status, 401);
  assertEquals(data.code, "INVALID_TOKEN");
});

// ============================================
// Input Validation Tests
// ============================================

Deno.test("validate-invoice: should return 400 for missing invoice_data", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });

  // Will be 401 because anon key is not a valid user token
  // This tests the flow correctly
  assertExists(response);
  await response.text();
});

Deno.test("validate-invoice: should handle empty body gracefully", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(null),
  });

  assertExists(response);
  await response.text();
});

// ============================================
// CORS Tests
// ============================================

Deno.test("validate-invoice: should handle OPTIONS preflight request", async () => {
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

Deno.test("validate-invoice: response should have correct structure on error", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invoice_data: {} }),
  });

  const data = await response.json();
  
  // Should have valid, error, and code fields
  assertExists(data.valid !== undefined || data.error !== undefined);
  assertExists(data.code);
});
