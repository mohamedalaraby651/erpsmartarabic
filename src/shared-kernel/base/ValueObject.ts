/**
 * ValueObject — equality by declared identity fields only.
 *
 * Subclasses MUST override identityFields() to return the subset of properties
 * that constitute logical identity. Order-independent; no JSON.stringify.
 */

export abstract class ValueObject {
  /** Subset of properties participating in logical equality. */
  protected abstract identityFields(): readonly string[];

  equals(other: unknown): boolean {
    if (other === this) return true;
    if (!(other instanceof ValueObject)) return false;
    if (Object.getPrototypeOf(other) !== Object.getPrototypeOf(this)) return false;
    const fields = this.identityFields();
    const otherFields = (other as ValueObject).identityFields();
    if (fields.length !== otherFields.length) return false;
    const a = this as unknown as Record<string, unknown>;
    const b = other as unknown as Record<string, unknown>;
    for (const f of fields) {
      if (!Object.is(a[f], b[f])) return false;
    }
    return true;
  }
}
