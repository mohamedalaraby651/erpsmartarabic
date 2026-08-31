/**
 * Kernel · tenant — tenant context primitive.
 *
 * BND-05 authority rule (ADR-0045): a tenant identifier only has authority
 * when it was derived server-side (`public.get_current_tenant()` → `auth.uid()`).
 * The brand below exists to make that provenance explicit in types; it can only
 * be produced by `fromServer`, which callers must use at the boundary where a
 * server-derived value enters the client.
 */
export interface TenantContext {
  readonly tenantId: string;
  readonly displayName?: string;
}

/** A tenant id whose value came from the server, never from client state. */
export type ServerDerivedTenantId = string & { readonly __serverDerived: unique symbol };

/** Mark a value as server-derived. Call ONLY with an RPC/JWT-sourced value. */
export function fromServer(tenantId: string): ServerDerivedTenantId {
  return tenantId as ServerDerivedTenantId;
}

export const SYSTEM_TENANT: TenantContext = Object.freeze({
  tenantId: "system",
  displayName: "System",
});
