/**
 * Kernel · clock — pure temporal abstractions (ADR-0006).
 */
export interface ClockPort {
  now(): Date;
  nowMs(): number;
}

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date(this.nowMs());
  }
  nowMs(): number {
    // Date.now is language-level, not a browser global.
    return Date.now();
  }
}

export class FakeClock implements ClockPort {
  private ms: number;
  constructor(seed: number | Date = 0) {
    this.ms = seed instanceof Date ? seed.getTime() : seed;
  }
  now(): Date {
    return new Date(this.ms);
  }
  nowMs(): number {
    return this.ms;
  }
  advance(deltaMs: number): void {
    this.ms += deltaMs;
  }
  set(ms: number | Date): void {
    this.ms = ms instanceof Date ? ms.getTime() : ms;
  }
}
