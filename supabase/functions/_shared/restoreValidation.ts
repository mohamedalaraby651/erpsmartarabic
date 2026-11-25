export type RestoreRow = Record<string, unknown>;
export interface RestoreColumn { table_name: string; column_name: string; data_type: string; is_required: boolean }
export interface RestoreReference { table_name: string; column_name: string; target_table: string; target_column: string; target_has_tenant: boolean }
export interface RestoreValidationIssue { table: string; row: number; field?: string; message: string }

const SERVER_MANAGED = new Set(['tenant_id', 'created_at', 'updated_at']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validType(type: string, value: unknown): boolean {
  if (value === null) return true;
  if (type.endsWith('[]')) return Array.isArray(value);
  if (type === 'uuid') return typeof value === 'string' && UUID.test(value);
  if (type === 'boolean') return typeof value === 'boolean';
  if (/^(smallint|integer|bigint)$/.test(type)) return Number.isSafeInteger(typeof value === 'string' ? Number(value) : value);
  if (/^(numeric|real|double precision)/.test(type)) {
    const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    return typeof n === 'number' && Number.isFinite(n);
  }
  if (type === 'date') return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  if (type.startsWith('timestamp')) return typeof value === 'string' && !Number.isNaN(Date.parse(value));
  if (type === 'json' || type === 'jsonb') return true;
  return typeof value === 'string';
}

/** Removes server-owned metadata and rejects fields outside the current database contract. */
export function sanitizeRestoreRows(data: Record<string, RestoreRow[]>, tables: string[], tenantId: string, columns: RestoreColumn[]) {
  const issues: RestoreValidationIssue[] = [];
  const sanitized: Record<string, RestoreRow[]> = {};
  const contracts = new Map<string, Map<string, RestoreColumn>>();
  for (const column of columns) {
    const table = contracts.get(column.table_name) ?? new Map<string, RestoreColumn>();
    table.set(column.column_name, column);
    contracts.set(column.table_name, table);
  }
  for (const table of tables) {
    const contract = contracts.get(table);
    const rows = data[table];
    sanitized[table] = [];
    if (!contract?.has('id')) { issues.push({ table, row: 0, message: 'جدول غير مدعوم للاستعادة' }); continue; }
    if (!Array.isArray(rows)) { issues.push({ table, row: 0, message: 'بيانات الجدول يجب أن تكون قائمة' }); continue; }
    rows.forEach((row, index) => {
      const rowNumber = index + 1;
      if (!row || typeof row !== 'object' || Array.isArray(row)) { issues.push({ table, row: rowNumber, message: 'صف غير صالح' }); return; }
      const incomingTenant = row.tenant_id;
      if (incomingTenant !== undefined && incomingTenant !== null && incomingTenant !== '' && incomingTenant !== tenantId) {
        issues.push({ table, row: rowNumber, field: 'tenant_id', message: 'الصف ينتمي لشركة أخرى' });
      }
      const copy: RestoreRow = {};
      for (const [field, value] of Object.entries(row)) {
        if (SERVER_MANAGED.has(field)) continue;
        const column = contract.get(field);
        if (!column) { issues.push({ table, row: rowNumber, field, message: 'حقل غير مسموح به' }); continue; }
        if (!validType(column.data_type, value)) issues.push({ table, row: rowNumber, field, message: 'نوع قيمة غير صالح' });
        copy[field] = value;
      }
      if (typeof copy.id !== 'string' || !UUID.test(copy.id)) issues.push({ table, row: rowNumber, field: 'id', message: 'معرّف غير صالح' });
      for (const column of contract.values()) {
        if (column.is_required && (copy[column.column_name] === undefined || copy[column.column_name] === null)) issues.push({ table, row: rowNumber, field: column.column_name, message: 'حقل مطلوب مفقود' });
      }
      copy.tenant_id = tenantId;
      sanitized[table].push(copy);
    });
  }
  return { sanitized, issues };
}

export function referenceValues(data: Record<string, RestoreRow[]>, references: RestoreReference[]) {
  const values = new Map<string, Set<string>>();
  for (const reference of references) {
    for (const row of data[reference.table_name] ?? []) {
      const value = row[reference.column_name];
      if (typeof value !== 'string') continue;
      const key = `${reference.target_table}.${reference.target_column}`;
      const set = values.get(key) ?? new Set<string>();
      set.add(value);
      values.set(key, set);
    }
  }
  return values;
}

export function referenceIssues(data: Record<string, RestoreRow[]>, references: RestoreReference[], available: Map<string, Set<string>>) {
  const issues: RestoreValidationIssue[] = [];
  for (const reference of references.filter(r => r.target_has_tenant)) {
    const key = `${reference.target_table}.${reference.target_column}`;
    const allowed = new Set([...(available.get(key) ?? []), ...(data[reference.target_table] ?? []).map(row => row[reference.target_column]).filter((v): v is string => typeof v === 'string')]);
    (data[reference.table_name] ?? []).forEach((row, index) => {
      const value = row[reference.column_name];
      if (typeof value === 'string' && !allowed.has(value)) issues.push({ table: reference.table_name, row: index + 1, field: reference.column_name, message: 'مرجع غير متاح في الشركة الحالية' });
    });
  }
  return issues;
}

export function foreignIdIssues(data: Record<string, RestoreRow[]>, existing: Record<string, Array<{ id: string; tenant_id: string }>>, tenantId: string) {
  const issues: RestoreValidationIssue[] = [];
  for (const [table, rows] of Object.entries(data)) {
    const foreign = new Set((existing[table] ?? []).filter(row => row.tenant_id !== tenantId).map(row => row.id));
    rows.forEach((row, index) => { if (typeof row.id === 'string' && foreign.has(row.id)) issues.push({ table, row: index + 1, field: 'id', message: 'المعرّف مستخدم في شركة أخرى' }); });
  }
  return issues;
}