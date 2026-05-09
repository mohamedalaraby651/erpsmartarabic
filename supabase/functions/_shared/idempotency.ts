// Shared idempotency helper for Edge Functions.
// Usage: const guard = await checkIdempotency(supabaseAdmin, { tenantId, userId, operation, key });
//        if (guard.duplicate) return existingResponse(...);
//        ... do work ...
//        await markIdempotencyComplete(supabaseAdmin, guard.id, responseHash);

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface IdempotencyArgs {
  tenantId: string;
  userId: string;
  operation: string;
  key: string;
}

export interface IdempotencyResult {
  duplicate: boolean;
  id?: string;
}

/**
 * Atomically reserve an idempotency key. Returns { duplicate: true } if the
 * (tenant, operation, key) tuple was already used (replay attempt).
 */
export async function checkIdempotency(
  admin: SupabaseClient,
  { tenantId, userId, operation, key }: IdempotencyArgs,
): Promise<IdempotencyResult> {
  if (!key) return { duplicate: false };

  const { data, error } = await admin
    .from("operation_idempotency")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      operation,
      idempotency_key: key,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation → replay
    if ((error as { code?: string }).code === "23505") {
      return { duplicate: true };
    }
    // Other errors: log but don't block (fail-open to avoid blocking valid traffic)
    console.error("[idempotency] insert error", error);
    return { duplicate: false };
  }

  return { duplicate: false, id: data?.id };
}

/**
 * Mark an idempotency record as complete with the response data.
 */
export async function markIdempotencyComplete(
  admin: SupabaseClient,
  id: string,
  response: any,
): Promise<void> {
  await admin
    .from("operation_idempotency")
    .update({
      status: "completed",
      response,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
}

/**
 * Extract idempotency key from request headers (Idempotency-Key, case-insensitive).
 */
export function getIdempotencyKey(req: Request): string {
  return (
    req.headers.get("Idempotency-Key") ||
    req.headers.get("idempotency-key") ||
    ""
  );
}

/**
 * Extract correlation id (x-correlation-id) or generate one.
 */
export function getCorrelationId(req: Request): string {
  return (
    req.headers.get("x-correlation-id") ||
    req.headers.get("X-Correlation-Id") ||
    crypto.randomUUID()
  );
}
