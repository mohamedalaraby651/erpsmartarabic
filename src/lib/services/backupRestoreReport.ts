/**
 * Builds a human-readable restore report (text log) from the Edge Function
 * response, plus a structured JSON version. Used by the post-restore screen
 * to render the summary and to power the "download log" button.
 */

export interface RestoreResultRow {
  table: string;
  inserted: number;
  skipped: number;
  errors: number;
  error_sample?: string;
  error_messages?: string[];
}

export interface RestoreReportInput {
  mode: 'append' | 'upsert' | 'replace';
  fileName: string;
  fileSizeBytes: number;
  tenantId?: string;
  totalInserted: number;
  totalErrors: number;
  results: RestoreResultRow[];
  startedAt: Date;
  finishedAt: Date;
  tableLabels: Record<string, string>;
}

export interface RestoreReportSummary {
  successTables: number;
  partialTables: number;
  failedTables: number;
  totalInserted: number;
  totalSkipped: number;
  totalErrors: number;
  durationSeconds: number;
  conflictHits: number;
}

const MODE_LABEL: Record<RestoreReportInput['mode'], string> = {
  append: 'إلحاق فقط (Append)',
  upsert: 'دمج (Upsert)',
  replace: 'استبدال كامل (Replace)',
};

/**
 * Heuristic: detect Postgres unique/foreign-key conflict messages so we
 * can flag them prominently in the report.
 */
export function classifyError(message: string | undefined): 'conflict' | 'fk' | 'check' | 'other' {
  if (!message) return 'other';
  const m = message.toLowerCase();
  if (m.includes('duplicate key') || m.includes('unique constraint') || m.includes('23505')) {
    return 'conflict';
  }
  if (m.includes('foreign key') || m.includes('23503')) return 'fk';
  if (m.includes('check constraint') || m.includes('23514')) return 'check';
  return 'other';
}

export function summarize(input: RestoreReportInput): RestoreReportSummary {
  let successTables = 0;
  let partialTables = 0;
  let failedTables = 0;
  let totalSkipped = 0;
  let conflictHits = 0;

  for (const r of input.results) {
    totalSkipped += r.skipped;
    if (r.errors === 0 && (r.inserted > 0 || r.skipped > 0)) successTables++;
    else if (r.errors > 0 && r.inserted > 0) partialTables++;
    else if (r.errors > 0) failedTables++;
    else successTables++; // empty table = no-op success

    const messages = r.error_messages?.length ? r.error_messages : r.error_sample ? [r.error_sample] : [];
    for (const msg of messages) {
      if (classifyError(msg) === 'conflict') conflictHits++;
    }
  }

  const durationSeconds = Math.max(
    0,
    Math.round((input.finishedAt.getTime() - input.startedAt.getTime()) / 1000),
  );

  return {
    successTables,
    partialTables,
    failedTables,
    totalInserted: input.totalInserted,
    totalSkipped,
    totalErrors: input.totalErrors,
    durationSeconds,
    conflictHits,
  };
}

/**
 * Builds a plain-text log file (UTF-8) suitable for download.
 */
export function buildLogText(input: RestoreReportInput): string {
  const summary = summarize(input);
  const lines: string[] = [];
  const ts = (d: Date) => d.toISOString();

  lines.push('================================================================');
  lines.push(' تقرير استعادة النسخة الاحتياطية / Backup Restore Report');
  lines.push('================================================================');
  lines.push('');
  lines.push(`تاريخ التنفيذ      : ${ts(input.startedAt)}`);
  lines.push(`تاريخ الانتهاء     : ${ts(input.finishedAt)}`);
  lines.push(`المدة (ثانية)      : ${summary.durationSeconds}`);
  lines.push(`الملف المصدر       : ${input.fileName} (${(input.fileSizeBytes / 1024).toFixed(1)} KB)`);
  lines.push(`وضع الاستعادة      : ${MODE_LABEL[input.mode]}`);
  if (input.tenantId) lines.push(`المستأجر           : ${input.tenantId}`);
  lines.push('');
  lines.push('--- ملخص ----------------------------------------------------');
  lines.push(`جداول ناجحة كلياً    : ${summary.successTables}`);
  lines.push(`جداول ناجحة جزئياً   : ${summary.partialTables}`);
  lines.push(`جداول فاشلة         : ${summary.failedTables}`);
  lines.push(`إجمالي السجلات الناجحة : ${summary.totalInserted}`);
  lines.push(`إجمالي السجلات المتجاهلة: ${summary.totalSkipped}`);
  lines.push(`إجمالي الأخطاء         : ${summary.totalErrors}`);
  lines.push(`تعارضات مفاتيح (PK/Unique): ${summary.conflictHits}`);
  lines.push('');
  lines.push('--- التفاصيل لكل جدول --------------------------------------');

  for (const r of input.results) {
    const label = input.tableLabels[r.table] ?? r.table;
    lines.push('');
    lines.push(`[${label}] (${r.table})`);
    lines.push(`  ناجح   : ${r.inserted}`);
    lines.push(`  متجاهل : ${r.skipped}`);
    lines.push(`  أخطاء  : ${r.errors}`);

    const messages = r.error_messages?.length ? r.error_messages : r.error_sample ? [r.error_sample] : [];
    if (messages.length > 0) {
      lines.push('  رسائل الخطأ:');
      for (const msg of messages) {
        const kind = classifyError(msg);
        const tag =
          kind === 'conflict'
            ? '[تعارض مفتاح]'
            : kind === 'fk'
              ? '[علاقة مرجعية]'
              : kind === 'check'
                ? '[قيد تحقق]'
                : '[خطأ]';
        lines.push(`    - ${tag} ${msg}`);
      }
    }
  }

  lines.push('');
  lines.push('================================================================');
  lines.push(' انتهى التقرير');
  lines.push('================================================================');
  return lines.join('\n');
}

export function downloadLog(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJsonReport(filename: string, input: RestoreReportInput): void {
  const payload = {
    ...input,
    startedAt: input.startedAt.toISOString(),
    finishedAt: input.finishedAt.toISOString(),
    summary: summarize(input),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
