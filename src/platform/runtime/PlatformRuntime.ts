/**
 * PlatformRuntime — 5-phase lifecycle (bootstrap → startup → hydration →
 * shutdown → recovery). Pure TS, no React, no browser globals.
 * ADR-0024. Invariants: see DEPENDENCY_RULES.md §Runtime.
 */
import type { ClockPort, FeatureFlagPort, IdPort, TenantContext, Culture } from "@/kernel";
import type { PortRegistry } from "../ports";

export type RuntimePhase =
  | "bootstrap"
  | "startup"
  | "hydration"
  | "shutdown"
  | "recovery";

export type RuntimeState =
  | "idle"
  | "bootstrapping"
  | "starting"
  | "hydrating"
  | "ready"
  | "shutting-down"
  | "recovering"
  | "failed";

export interface RuntimePhaseEvent {
  readonly phase: RuntimePhase;
  readonly at: number;
  readonly state: RuntimeState;
  readonly error?: Error;
}

export interface RuntimeConfig {
  readonly clock: ClockPort;
  readonly id: IdPort;
  readonly flags: FeatureFlagPort;
  readonly tenant: TenantContext;
  readonly culture: Culture;
  readonly ports: PortRegistry;
}

type Listener = (e: RuntimePhaseEvent) => void;

export class PlatformRuntime {
  private _state: RuntimeState = "idle";
  private _bootstrapped = false;
  private _hydrated = false;
  private _shutdownComplete = false;
  private _lastError?: Error;
  private readonly listeners = new Set<Listener>();

  constructor(public readonly config: RuntimeConfig) {}

  get state(): RuntimeState { return this._state; }
  get lastError(): Error | undefined { return this._lastError; }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(phase: RuntimePhase, error?: Error): void {
    const evt: RuntimePhaseEvent = {
      phase,
      at: this.config.clock.nowMs(),
      state: this._state,
      error,
    };
    for (const l of this.listeners) l(evt);
  }

  private failIfTerminal(): void {
    if (this._state === "failed") {
      throw new Error("PlatformRuntime is in terminal 'failed' state");
    }
  }

  async bootstrap(): Promise<void> {
    this.failIfTerminal();
    if (this._bootstrapped) return;
    this._state = "bootstrapping";
    this.emit("bootstrap");
    this._bootstrapped = true;
  }

  async startup(): Promise<void> {
    this.failIfTerminal();
    if (!this._bootstrapped) {
      throw new Error("startup() requires bootstrap() first");
    }
    this._state = "starting";
    this.emit("startup");
  }

  async hydration(): Promise<void> {
    this.failIfTerminal();
    if (this._hydrated) return;
    this._state = "hydrating";
    this.emit("hydration");
    this._hydrated = true;
    this._state = "ready";
  }

  async shutdown(): Promise<void> {
    if (this._shutdownComplete) return; // idempotent
    this._state = "shutting-down";
    this.emit("shutdown");
    this._shutdownComplete = true;
  }

  async recovery(): Promise<void> {
    if (this._state === "failed") {
      throw new Error("recovery() cannot restart a terminal runtime");
    }
    this._state = "recovering";
    this.emit("recovery");
    // Recovery cannot transition directly to `ready`; caller must re-run
    // hydration explicitly.
    this._hydrated = false;
  }

  fail(error: Error): void {
    this._lastError = error;
    this._state = "failed";
    this.emit("bootstrap", error);
  }
}
