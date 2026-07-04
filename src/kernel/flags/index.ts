/**
 * Kernel · flags — FeatureFlagPort + static adapter.
 */
export interface FeatureFlagPort {
  isEnabled(flag: string): boolean;
  variant(flag: string): string | undefined;
}

export class StaticFlagAdapter implements FeatureFlagPort {
  constructor(private readonly flags: Readonly<Record<string, boolean | string>> = {}) {}
  isEnabled(flag: string): boolean {
    const v = this.flags[flag];
    return v === true || (typeof v === "string" && v.length > 0);
  }
  variant(flag: string): string | undefined {
    const v = this.flags[flag];
    return typeof v === "string" ? v : undefined;
  }
}
