/**
 * FakeClock — deterministic ClockPort for tests.
 * Each call to now() advances by `stepMs` (default 1000ms) so events get
 * monotonically increasing occurredAt timestamps without coupling to wall
 * time.
 */
import { Instant } from "@/shared-kernel";
import type { ClockPort } from "@/shared-kernel";

export class FakeClock implements ClockPort {
  #current: Instant;
  readonly #stepMs: number;

  constructor(startISO = "2025-01-01T00:00:00.000Z", stepMs = 1000) {
    this.#current = Instant.fromISOString(startISO);
    this.#stepMs = stepMs;
  }

  now(): Instant {
    const out = this.#current;
    this.#current = this.#current.plusMillis(this.#stepMs);
    return out;
  }

  peek(): Instant {
    return this.#current;
  }
}
