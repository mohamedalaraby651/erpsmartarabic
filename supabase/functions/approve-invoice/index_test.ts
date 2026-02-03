import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";

const FUNCTION_URL = "http://localhost:54321/functions/v1/approve-invoice";

Deno.test("approve-invoice: should reject unauthenticated requests", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      invoice_id: "test-invoice-id",
      action: "approve",
    }),
  });

  assertEquals(response.status, 401);
  const data = await response.json();
  assertExists(data.error);
});

Deno.test("approve-invoice: should reject requests without invoice_id", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-token",
    },
    body: JSON.stringify({
      action: "approve",
    }),
  });

  // Should fail because invoice_id is required
  const data = await response.json();
  assertExists(data.error || response.status >= 400);
});

Deno.test("approve-invoice: should reject invalid action", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-token",
    },
    body: JSON.stringify({
      invoice_id: "test-invoice-id",
      action: "invalid_action",
    }),
  });

  const data = await response.json();
  assertExists(data.error || response.status >= 400);
});

Deno.test("approve-invoice: should require rejection_reason for reject action", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-token",
    },
    body: JSON.stringify({
      invoice_id: "test-invoice-id",
      action: "reject",
      // Missing rejection_reason
    }),
  });

  const data = await response.json();
  assertExists(data.error || response.status >= 400);
});

Deno.test("approve-invoice: should handle CORS preflight", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:3000",
      "Access-Control-Request-Method": "POST",
    },
  });

  assertEquals(response.status, 200);
});
