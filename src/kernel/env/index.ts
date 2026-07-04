/**
 * Kernel · env — runtime environment classification (pure).
 */
export type RuntimeEnv = "development" | "test" | "staging" | "production";

export interface EnvPort {
  readonly env: RuntimeEnv;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly isTest: boolean;
}

export class StaticEnv implements EnvPort {
  constructor(public readonly env: RuntimeEnv) {}
  get isProduction() { return this.env === "production"; }
  get isDevelopment() { return this.env === "development"; }
  get isTest() { return this.env === "test"; }
}
