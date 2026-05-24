/**
 * Arabic-safe filename sanitizer.
 *
 * Goals:
 *  - keep Arabic, Latin, and digits as-is (Unicode property classes)
 *  - strip path separators, control chars, and Bidi marks (which break OS file pickers)
 *  - collapse whitespace + repeated separators
 *  - cap total length to avoid OS limits (~120 chars excluding extension)
 *  - never return an empty string — fall back to `fallback`
 */

const BIDI_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
const CONTROL_RE = /[\u0000-\u001F\u007F]/g;
const SEPARATOR_RE = /[\\/:*?"<>|]+/g; // OS-illegal on Windows + path separators
const REPEAT_UNDERSCORE_RE = /_+/g;
const REPEAT_DASH_RE = /-+/g;
const TRIM_SAFE_RE = /^[._\-\s]+|[._\-\s]+$/g;

export interface SanitizeFilenameOptions {
  /** Without dot. Defaults to "pdf". */
  extension?: string;
  /** Used when input collapses to empty. */
  fallback?: string;
  /** Soft cap on the base name (excludes extension + dot). Defaults to 120. */
  maxBaseLength?: number;
}

export function sanitizeFilename(
  raw: string | null | undefined,
  opts: SanitizeFilenameOptions = {},
): string {
  const ext = (opts.extension ?? 'pdf').replace(/^\.+/, '').toLowerCase();
  const fallback = opts.fallback ?? 'document';
  const maxLen = opts.maxBaseLength ?? 120;

  let base = String(raw ?? '')
    .replace(BIDI_RE, '')
    .replace(CONTROL_RE, '')
    .replace(SEPARATOR_RE, '_')
    .replace(/\s+/g, '_')
    .replace(REPEAT_UNDERSCORE_RE, '_')
    .replace(REPEAT_DASH_RE, '-')
    .replace(TRIM_SAFE_RE, '');

  // Drop anything outside Letter/Number/_/- to avoid weird shell-meaning chars.
  base = base.replace(/[^\p{L}\p{N}_\-]/gu, '_').replace(REPEAT_UNDERSCORE_RE, '_');

  if (!base) base = fallback;
  if (base.length > maxLen) base = base.slice(0, maxLen).replace(TRIM_SAFE_RE, '') || fallback;

  return `${base}.${ext}`;
}

/** Build "<prefix>_<number>.pdf" with sanitization applied to both parts. */
export function buildDocFilename(prefix: string, number: string | number | null | undefined): string {
  const safePrefix = sanitizeFilename(prefix, { extension: '', fallback: 'document' }).replace(/\.$/, '');
  const safeNum = sanitizeFilename(String(number ?? ''), { extension: '', fallback: 'NA' }).replace(/\.$/, '');
  return sanitizeFilename(`${safePrefix}_${safeNum}`, { extension: 'pdf' });
}
