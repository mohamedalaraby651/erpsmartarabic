/**
 * Kernel · permissions — permission primitive + evaluator.
 */
export type Permission = string;

export interface PermissionSet {
  has(permission: Permission): boolean;
  hasAll(permissions: readonly Permission[]): boolean;
  hasAny(permissions: readonly Permission[]): boolean;
}

export class StaticPermissionSet implements PermissionSet {
  private readonly set: ReadonlySet<Permission>;
  constructor(permissions: Iterable<Permission>) {
    this.set = new Set(permissions);
  }
  has(p: Permission): boolean { return this.set.has(p); }
  hasAll(ps: readonly Permission[]): boolean { return ps.every((p) => this.set.has(p)); }
  hasAny(ps: readonly Permission[]): boolean { return ps.some((p) => this.set.has(p)); }
}
