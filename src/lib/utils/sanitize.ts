/**
 * Shared search sanitization utility
 * Escapes special Postgres ILIKE characters to prevent injection
 */
export function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}
