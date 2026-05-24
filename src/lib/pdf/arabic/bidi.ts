/**
 * Bidi utilities for the PDF pipeline.
 *
 * Two concerns are handled here:
 *   1. Sanitization — strip invisible Unicode Bidi control marks that arrive
 *      from copy/paste, RTL CMS editors, or pasted Word content. Left in
 *      place they corrupt jsPDF glyph runs and break visual ordering.
 *   2. Protection — wrap tokens that must NOT be reversed (digits, SKUs,
 *      emails, URLs, IBANs, phone numbers) with First Strong Isolate
 *      controls so downstream shapers keep them LTR inside RTL paragraphs.
 *
 * Pure functions, no DOM/jsPDF deps — safe to import in workers and tests.
 */

/** All Unicode Bidi formatting controls we strip from raw input. */
const BIDI_CONTROL_RANGES: Array<[number, number]> = [
  [0x200e, 0x200f], // LRM, RLM
  [0x202a, 0x202e], // LRE, RLE, PDF, LRO, RLO
  [0x2066, 0x2069], // LRI, RLI, FSI, PDI
];

const BIDI_CONTROL_REGEX = new RegExp(
  '[' +
    BIDI_CONTROL_RANGES.map(([lo, hi]) => `\\u${lo.toString(16).padStart(4, '0')}-\\u${hi.toString(16).padStart(4, '0')}`).join('') +
    ']',
  'g',
);

/** Remove all invisible Bidi control characters from a string. */
export function stripBidiControls(input: string | null | undefined): string {
  if (input == null) return '';
  return String(input).replace(BIDI_CONTROL_REGEX, '');
}

/** True if the string contains at least one Bidi control character. */
export function hasBidiControls(input: string | null | undefined): boolean {
  if (input == null) return false;
  BIDI_CONTROL_REGEX.lastIndex = 0;
  return BIDI_CONTROL_REGEX.test(String(input));
}

// First Strong Isolate + Pop Directional Isolate. Treated by Unicode bidi
// as a neutral run whose direction is fixed by the first strong char inside.
const FSI = '\u2068';
const PDI = '\u2069';

/** Patterns that must stay LTR even inside RTL paragraphs. */
const PROTECT_PATTERNS: RegExp[] = [
  /\b[A-Z0-9]{2}\d{2}[A-Z0-9]{10,30}\b/g,                // IBAN-ish
  /\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,               // email
  /\bhttps?:\/\/[^\s\u0600-\u06FF]+/g,                    // URL
  /\b\+?\d[\d\s\-().]{6,}\d\b/g,                          // phone
  /\b[A-Z]{2,}-?\d{2,}[A-Z0-9-]*\b/g,                     // SKU / product code
];

/**
 * Wrap LTR-must-stay tokens (emails, URLs, phones, SKUs, IBANs) in
 * First Strong Isolate so they are not reversed by the bidi algorithm.
 * Input is sanitized first; existing isolates inside the value are dropped
 * to keep the output deterministic and idempotent.
 */
export function isolateLtrTokens(input: string | null | undefined): string {
  const clean = stripBidiControls(input);
  if (!clean) return '';
  let out = clean;
  for (const re of PROTECT_PATTERNS) {
    out = out.replace(re, (m) => `${FSI}${m}${PDI}`);
  }
  return out;
}

/** Convenience: sanitize then isolate in one pass. */
export function prepareForPdf(input: string | null | undefined): string {
  return isolateLtrTokens(input);
}
