/**
 * Kernel · tenant — tenant context primitive.
 */
export interface TenantContext {
  readonly tenantId: string;
  readonly displayName?: string;
}

export const SYSTEM_TENANT: TenantContext = Object.freeze({
  tenantId: "system",
  displayName: "System",
});
