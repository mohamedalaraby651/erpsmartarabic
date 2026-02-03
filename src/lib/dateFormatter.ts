import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { ar } from 'date-fns/locale';

/**
 * Date Formatter Utility
 * Provides consistent date formatting across the application with Arabic locale support
 */

export type DateInput = string | Date | null | undefined;

/**
 * Parse date input to Date object
 */
function parseDate(date: DateInput): Date | null {
  if (!date) return null;
  
  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }
  
  try {
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Format date as dd/MM/yyyy (e.g., 15/01/2024)
 */
export function formatDate(date: DateInput): string {
  const parsed = parseDate(date);
  if (!parsed) return '-';
  
  return format(parsed, 'dd/MM/yyyy');
}

/**
 * Format date with Arabic month name (e.g., 15 يناير 2024)
 */
export function formatDateArabic(date: DateInput): string {
  const parsed = parseDate(date);
  if (!parsed) return '-';
  
  return format(parsed, 'dd MMMM yyyy', { locale: ar });
}

/**
 * Format date and time (e.g., 15/01/2024 14:30)
 */
export function formatDateTime(date: DateInput): string {
  const parsed = parseDate(date);
  if (!parsed) return '-';
  
  return format(parsed, 'dd/MM/yyyy HH:mm');
}

/**
 * Format date and time with Arabic (e.g., 15 يناير 2024 02:30 م)
 */
export function formatDateTimeArabic(date: DateInput): string {
  const parsed = parseDate(date);
  if (!parsed) return '-';
  
  return format(parsed, 'dd MMMM yyyy hh:mm a', { locale: ar });
}

/**
 * Format as short date (e.g., 15 يناير)
 */
export function formatShortDate(date: DateInput): string {
  const parsed = parseDate(date);
  if (!parsed) return '-';
  
  return format(parsed, 'dd MMM', { locale: ar });
}

/**
 * Format relative time (e.g., منذ 5 دقائق)
 */
export function formatRelativeTime(date: DateInput): string {
  const parsed = parseDate(date);
  if (!parsed) return '-';
  
  return formatDistanceToNow(parsed, { addSuffix: true, locale: ar });
}

/**
 * Format for input[type="date"] (YYYY-MM-DD)
 */
export function formatForInput(date: DateInput): string {
  const parsed = parseDate(date);
  if (!parsed) return '';
  
  return format(parsed, 'yyyy-MM-dd');
}

/**
 * Format time only (e.g., 14:30)
 */
export function formatTime(date: DateInput): string {
  const parsed = parseDate(date);
  if (!parsed) return '-';
  
  return format(parsed, 'HH:mm');
}

/**
 * Check if date is today
 */
export function isToday(date: DateInput): boolean {
  const parsed = parseDate(date);
  if (!parsed) return false;
  
  const today = new Date();
  return (
    parsed.getDate() === today.getDate() &&
    parsed.getMonth() === today.getMonth() &&
    parsed.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is in the past
 */
export function isPast(date: DateInput): boolean {
  const parsed = parseDate(date);
  if (!parsed) return false;
  
  return parsed < new Date();
}

/**
 * Get current date formatted for input
 */
export function getCurrentDateForInput(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
