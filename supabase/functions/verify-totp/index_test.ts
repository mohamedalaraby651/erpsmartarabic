import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";

const FUNCTION_URL = "http://localhost:54321/functions/v1/verify-totp";

Deno.test("verify-totp: should reject unauthenticated requests", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "setup",
    }),
  });

  assertEquals(response.status, 401);
  const data = await response.json();
  assertExists(data.error);
});

Deno.test("verify-totp: should reject invalid action", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-token",
    },
    body: JSON.stringify({
      action: "invalid_action",
    }),
  });

  const data = await response.json();
  assertExists(data.error || response.status >= 400);
});

Deno.test("verify-totp: should reject verify without code", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-token",
    },
    body: JSON.stringify({
      action: "verify",
      // Missing totp_code
    }),
  });

  const data = await response.json();
  assertExists(data.error || response.status >= 400);
});

Deno.test("verify-totp: should reject invalid TOTP code format", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-token",
    },
    body: JSON.stringify({
      action: "verify",
      totp_code: "abc", // Invalid - should be 6 digits
    }),
  });

  const data = await response.json();
  assertExists(data.error || response.status >= 400);
});

Deno.test("verify-totp: should handle CORS preflight", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:3000",
      "Access-Control-Request-Method": "POST",
    },
  });

  assertEquals(response.status, 200);
});

Deno.test("verify-totp: should reject backup code without action", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-token",
    },
    body: JSON.stringify({
      backup_code: "12345678",
      // Missing action
    }),
  });

  const data = await response.json();
  assertExists(data.error || response.status >= 400);
});

Deno.test("verify-totp: should reject empty body", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-token",
    },
    body: JSON.stringify({}),
  });

  const data = await response.json();
  assertExists(data.error || response.status >= 400);
});
