/**
 * Backup Export Service — pure formatters extracted from BackupPage.
 *
 * Phase 3 (P2): split the 528-line BackupPage so business/serialization
 * logic lives outside the React component. Pure functions = trivially
 * testable, swappable formats, smaller component file.
 */
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TableRecord = Record<string, any>;
export type BackupData = Record<string, TableRecord[]>;
export interface TableLabel { name: string; label: string }

export function generateBackupFileName(extension: string): string {
  const date = format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: ar });
  return `نسخة_احتياطية_${date}.${extension}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportBackupToExcel(
  data: BackupData,
  tables: TableLabel[]
): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  for (const [tableName, tableData] of Object.entries(data)) {
    if (tableData.length > 0) {
      const tableInfo = tables.find((t) => t.name === tableName);
      const worksheet = XLSX.utils.json_to_sheet(tableData);
      XLSX.utils.book_append_sheet(workbook, worksheet, tableInfo?.label || tableName);
    }
  }
  XLSX.writeFile(workbook, generateBackupFileName('xlsx'));
}

export function exportBackupToJson(data: BackupData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, generateBackupFileName('json'));
}

export function exportBackupToCsv(data: BackupData, tables: TableLabel[]): void {
  let csvContent = '';
  for (const [tableName, tableData] of Object.entries(data)) {
    if (tableData.length === 0) continue;
    const tableInfo = tables.find((t) => t.name === tableName);
    csvContent += `\n### ${tableInfo?.label || tableName} ###\n`;
    const headers = Object.keys(tableData[0]).join(',');
    csvContent += headers + '\n';
    for (const row of tableData) {
      const values = Object.values(row).map((v) => {
        if (v === null) return '';
        if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
          return `"${v.replace(/"/g, '""')}"`;
        }
        return String(v);
      }).join(',');
      csvContent += values + '\n';
    }
  }
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, generateBackupFileName('csv'));
}

export function exportBackupToSql(data: BackupData): void {
  let sqlContent = '-- نسخة احتياطية\n';
  sqlContent += `-- تاريخ التصدير: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n\n`;
  for (const [tableName, tableData] of Object.entries(data)) {
    if (tableData.length === 0) continue;
    sqlContent += `-- جدول: ${tableName}\n`;
    for (const row of tableData) {
      const columns = Object.keys(row).join(', ');
      const values = Object.values(row).map((v) => {
        if (v === null) return 'NULL';
        if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
        if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
        return String(v);
      }).join(', ');
      sqlContent += `INSERT INTO ${tableName} (${columns}) VALUES (${values});\n`;
    }
    sqlContent += '\n';
  }
  const blob = new Blob([sqlContent], { type: 'text/sql' });
  downloadBlob(blob, generateBackupFileName('sql'));
}
