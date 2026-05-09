/**
 * Correlation ID + Idempotency Key helpers for client → Edge Function tracing.
 *
 * Usage:
 *   const headers = buildRequestHeaders({ idempotencyKey: crypto.randomUUID() });
 *   await supabase.functions.invoke('process-payment', { body, headers });
 */

export interface RequestHeaderOptions {
  idempotencyKey?: string;
  correlationId?: string;
}

export function newCorrelationId(): string {
  return crypto.randomUUID();
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function buildRequestHeaders(
  opts: RequestHeaderOptions = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    "x-correlation-id": opts.correlationId || newCorrelationId(),
  };
  if (opts.idempotencyKey) {
    headers["Idempotency-Key"] = opts.idempotencyKey;
  }
  return headers;
}
