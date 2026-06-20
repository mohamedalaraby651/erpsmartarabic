/**
 * ClockPort — Single Temporal Authority (ADR-0006).
 *
 * The sole source of the current moment in the system. All adapters
 * (SystemClock, FakeClock) implement this port.
 */
import type { Instant } from "./Instant";

export interface ClockPort {
  now(): Instant;
}
