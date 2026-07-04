/**
 * Kernel · culture — locale/direction/calendar primitives (no DOM).
 */
export type Direction = "ltr" | "rtl";
export type CalendarSystem = "gregorian" | "hijri";

export interface Culture {
  readonly locale: string; // BCP-47
  readonly direction: Direction;
  readonly calendar: CalendarSystem;
  readonly numberingSystem?: string;
}

export const ARABIC_SA: Culture = Object.freeze({
  locale: "ar-SA",
  direction: "rtl",
  calendar: "gregorian",
  numberingSystem: "arab",
});

export const ENGLISH_US: Culture = Object.freeze({
  locale: "en-US",
  direction: "ltr",
  calendar: "gregorian",
});
