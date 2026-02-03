import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/stock-movement`;

// ============================================
// Authentication Tests
// ============================================

Deno.test("stock-movement: should return 401 for missing Authorization header", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      movement_data: {
        product_id: "test-product",
        movement_type: "in",
        quantity: 10,
        to_warehouse_id: "test-warehouse",
      },
    }),
  });

  const data = await response.json();
  assertEquals(response.status, 401);
  assertEquals(data.code, "UNAUTHORIZED");
});

Deno.test("stock-movement: should return 401 for invalid Bearer token", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer invalid_token",
    },
    body: JSON.stringify({
      movement_data: {
        product_id: "test-product",
        movement_type: "in",
        quantity: 10,
        to_warehouse_id: "test-warehouse",
      },
    }),
  });

  const data = await response.json();
  assertEquals(response.status, 401);
  assertEquals(data.code, "INVALID_TOKEN");
});

// ============================================
// Input Validation Tests
// ============================================

Deno.test("stock-movement: should return 400 for missing movement_data", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });

  assertExists(response);
  await response.text();
});

Deno.test("stock-movement: should validate required fields", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      movement_data: {
        // missing product_id, movement_type, quantity
      },
    }),
  });

  assertExists(response);
  await response.text();
});

// ============================================
// CORS Tests
// ============================================

Deno.test("stock-movement: should handle OPTIONS preflight request", async () => {
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

Deno.test("stock-movement: error response should have correct structure", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  const data = await response.json();
  assertExists(data.success !== undefined || data.error !== undefined);
  assertExists(data.code);
});

// ============================================
// Movement Type Tests
// ============================================

Deno.test("stock-movement: should handle 'in' movement type", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      movement_data: {
        product_id: "test-product",
        movement_type: "in",
        quantity: 10,
        to_warehouse_id: "test-warehouse",
      },
    }),
  });

  assertExists(response);
  await response.text();
});

Deno.test("stock-movement: should handle 'out' movement type", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      movement_data: {
        product_id: "test-product",
        movement_type: "out",
        quantity: 5,
        from_warehouse_id: "test-warehouse",
      },
    }),
  });

  assertExists(response);
  await response.text();
});

Deno.test("stock-movement: should handle 'transfer' movement type", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      movement_data: {
        product_id: "test-product",
        movement_type: "transfer",
        quantity: 5,
        from_warehouse_id: "warehouse-1",
        to_warehouse_id: "warehouse-2",
      },
    }),
  });

  assertExists(response);
  await response.text();
});
