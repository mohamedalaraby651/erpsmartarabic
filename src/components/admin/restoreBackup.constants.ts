/**
 * Constants and shared types for the Restore Backup flow.
 * Extracted from RestoreBackupDialog.tsx to reduce file size and improve reuse.
 *
 * Keep in sync with `SENSITIVE_TABLES` / `FORBIDDEN_TABLES` in
 * supabase/functions/restore-backup/index.ts
 */

/** Tables that the backend treats as SENSITIVE — restoring them can affect
 *  access control, fiscal periods, accounting baselines, or company config. */
export const SENSITIVE_TABLE_NAMES = new Set<string>([
  'custom_roles',
  'role_section_permissions',
  'role_limits',
  'user_tenants',
  'company_settings',
  'approval_chains',
  'fiscal_periods',
  'chart_of_accounts',
]);

/** Tables the backend will NEVER restore. We don't even show them as options. */
export const FORBIDDEN_TABLE_NAMES = new Set<string>([
  'tenants',
  'user_roles',
  'platform_admins',
  'audit_trail',
  'activity_logs',
  'restore_snapshots',
  'domain_events',
  'event_metrics',
]);

export type RestoreMode = 'append' | 'upsert' | 'replace';
export type RestoreStep = 'configure' | 'review' | 'results';

export interface RestoreResult {
  table: string;
  inserted: number;
  skipped: number;
  errors: number;
  rejected_foreign_tenant?: number;
  foreign_tenant_ids?: string[];
  error_sample?: string;
  error_messages?: string[];
  truncated?: number;
  is_sensitive?: boolean;
}

export const MODE_LABELS: Record<
  RestoreMode,
  { title: string; effect: string; tone: 'default' | 'warning' | 'destructive' }
> = {
  append: {
    title: 'إلحاق فقط (Append)',
    effect:
      'سيتم إدراج السجلات الجديدة فقط. السجلات ذات المعرّفات الموجودة مسبقاً سيتم تجاهلها.',
    tone: 'default',
  },
  upsert: {
    title: 'دمج (Upsert)',
    effect:
      'سيتم إدراج السجلات الجديدة وتحديث السجلات الموجودة (مطابقة المعرّف). البيانات الحالية قد تُستبدل.',
    tone: 'warning',
  },
  replace: {
    title: 'استبدال كامل (Replace)',
    effect:
      'سيتم حذف كل السجلات الحالية في الجداول المختارة ثم إعادة الإدراج من الملف. عملية لا يمكن التراجع عنها.',
    tone: 'destructive',
  },
};
