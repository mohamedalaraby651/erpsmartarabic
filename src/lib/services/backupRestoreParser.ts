/**
 * Backup file parsers (JSON / SQL / Excel).
 *
 * Returns a normalized shape: Record<table_name, row[]>.
 *
 * SQL parser is intentionally limited to the format produced by our own
 * exporter: simple `INSERT INTO <table> (cols) VALUES (...);` statements.
 * It will refuse anything else (DDL, multi-row inserts, functions) so a
 * malicious SQL file can never be executed verbatim — only parsed values
 * are sent to the server, which then re-validates everything.
 */
export type ParsedBackup = Record<string, Record<string, unknown>[]>;

export async function parseBackupFile(file: File): Promise<ParsedBackup> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.json')) return parseJson(await file.text());
  if (name.endsWith('.sql')) return parseSql(await file.text());
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseExcel(await file.arrayBuffer());
  }
  throw new Error('صيغة الملف غير مدعومة. الصيغ المسموحة: JSON, SQL, Excel');
}

function parseJson(text: string): ParsedBackup {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('ملف JSON غير صالح');
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('بنية JSON غير متوقعة — يجب أن يكون كائناً يحتوي على جداول');
  }
  const out: ParsedBackup = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (Array.isArray(v)) out[k] = v as Record<string, unknown>[];
  }
  return out;
}

/**
 * Parse our exporter's SQL format. Each row line:
 *   INSERT INTO table (col1, col2) VALUES ('v1', 2);
 * Strings are single-quoted with '' escaping; NULL is the literal NULL.
 */
function parseSql(text: string): ParsedBackup {
  const out: ParsedBackup = {};
  const re = /INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\((.+)\)\s*;/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const table = m[1];
    const cols = m[2].split(',').map((c) => c.trim());
    const values = splitSqlValues(m[3]);
    if (cols.length !== values.length) continue;
    const row: Record<string, unknown> = {};
    cols.forEach((c, i) => (row[c] = values[i]));
    (out[table] ||= []).push(row);
  }
  return out;
}

function splitSqlValues(raw: string): unknown[] {
  const result: unknown[] = [];
  let i = 0;
  let buf = '';
  let inStr = false;
  while (i < raw.length) {
    const ch = raw[i];
    if (inStr) {
      if (ch === "'" && raw[i + 1] === "'") {
        buf += "'";
        i += 2;
        continue;
      }
      if (ch === "'") {
        inStr = false;
        i++;
        continue;
      }
      buf += ch;
      i++;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      i++;
      continue;
    }
    if (ch === ',') {
      result.push(coerce(buf.trim()));
      buf = '';
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  if (buf.length > 0) result.push(coerce(buf.trim()));
  return result;
}

function coerce(token: string): unknown {
  if (token === 'NULL' || token === '') return null;
  if (/^-?\d+$/.test(token)) return Number(token);
  if (/^-?\d*\.\d+$/.test(token)) return Number(token);
  if (token === 'true') return true;
  if (token === 'false') return false;
  // strings have their quotes already stripped by splitSqlValues
  return token;
}

async function parseExcel(buf: ArrayBuffer): Promise<ParsedBackup> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'array' });
  const out: ParsedBackup = {};
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    // Sheet names in our exporter are Arabic labels; we cannot map
    // them back to table names blindly, so we accept the Arabic label
    // OR an English table name. Caller selects which sheets to import
    // and must map them to actual table names via the dialog.
    out[sheetName] = rows;
  }
  return out;
}
