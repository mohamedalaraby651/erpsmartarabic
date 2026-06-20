/**
 * Instant — immutable UTC moment (ADR-0006).
 *
 * Representation only. NO zero-arg factory; the current moment is produced
 * exclusively by ClockPort.now() at the application boundary.
 *
 * Allowed origins: ClockPort.now() | repository deserialization boundary |
 * FakeClock (test boundary).
 */

export class Instant {
  private constructor(public readonly epochMillis: number) {
    Object.freeze(this);
  }

  static fromEpochMillis(epochMillis: number): Instant {
    if (!Number.isFinite(epochMillis)) {
      throw new RangeError("Instant.fromEpochMillis: epochMillis must be finite");
    }
    return new Instant(Math.trunc(epochMillis));
  }

  static fromISOString(iso: string): Instant {
    // Deserialization boundary — permitted use of `new Date(arg)`.
    // eslint-disable-next-line no-restricted-syntax
    const ms = new Date(iso).getTime();
    if (Number.isNaN(ms)) {
      throw new RangeError(`Instant.fromISOString: invalid ISO-8601: ${iso}`);
    }
    return new Instant(ms);
  }

  toEpochMillis(): number {
    return this.epochMillis;
  }

  toISOString(): string {
    // Deserialization/serialization helper — permitted construction with arg.
    // eslint-disable-next-line no-restricted-syntax
    return new Date(this.epochMillis).toISOString();
  }

  equals(other: Instant): boolean {
    return other instanceof Instant && other.epochMillis === this.epochMillis;
  }

  compare(other: Instant): -1 | 0 | 1 {
    if (this.epochMillis < other.epochMillis) return -1;
    if (this.epochMillis > other.epochMillis) return 1;
    return 0;
  }

  isBefore(other: Instant): boolean {
    return this.epochMillis < other.epochMillis;
  }

  isAfter(other: Instant): boolean {
    return this.epochMillis > other.epochMillis;
  }

  plusMillis(ms: number): Instant {
    return Instant.fromEpochMillis(this.epochMillis + ms);
  }

  minusMillis(ms: number): Instant {
    return Instant.fromEpochMillis(this.epochMillis - ms);
  }
}
