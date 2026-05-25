import { useCallback, useEffect, useState } from 'react';

/**
 * Unified Export Settings Hook
 * Reads/writes 6 keys to localStorage and broadcasts changes via a window event
 * so consumers (PDF router, Excel exporter) can react immediately.
 */

export type PdfEngineMode = 'auto' | 'on' | 'off';
export type PdfFontKey = 'cairo' | 'amiri';
export type DefaultExportFormat = 'xlsx' | 'csv' | 'pdf';
export type CsvDelimiter = ',' | ';' | '\t';
export type ExportLanguage = 'ar' | 'en';

export interface ExportSettings {
  pdfEngine: PdfEngineMode;
  pdfFont: PdfFontKey;
  defaultFormat: DefaultExportFormat;
  csvDelimiter: CsvDelimiter;
  includeBom: boolean;
  language: ExportLanguage;
}

export const EXPORT_SETTINGS_EVENT = 'export-settings-changed';

const KEYS = {
  pdfEngine: 'pdf_engine_v2', // existing key — 'auto' = removed, 'on' = '1', 'off' = '0'
  pdfFont: 'pdf_font',
  defaultFormat: 'export_default_format',
  csvDelimiter: 'export_csv_delimiter',
  includeBom: 'export_include_bom',
  language: 'export_language',
} as const;

export const EXPORT_DEFAULTS: ExportSettings = {
  pdfEngine: 'auto',
  pdfFont: 'cairo',
  defaultFormat: 'xlsx',
  csvDelimiter: ',',
  includeBom: true,
  language: 'ar',
};

function safeGet(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null) {
  try {
    if (typeof window === 'undefined') return;
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}

export function readExportSettings(): ExportSettings {
  const engineRaw = safeGet(KEYS.pdfEngine);
  const pdfEngine: PdfEngineMode =
    engineRaw === '1' ? 'on' : engineRaw === '0' ? 'off' : 'auto';

  const fontRaw = safeGet(KEYS.pdfFont);
  const pdfFont: PdfFontKey = fontRaw === 'amiri' ? 'amiri' : 'cairo';

  const fmtRaw = safeGet(KEYS.defaultFormat);
  const defaultFormat: DefaultExportFormat =
    fmtRaw === 'csv' || fmtRaw === 'pdf' ? fmtRaw : 'xlsx';

  const delRaw = safeGet(KEYS.csvDelimiter);
  const csvDelimiter: CsvDelimiter =
    delRaw === ';' || delRaw === '\t' ? delRaw : ',';

  const bomRaw = safeGet(KEYS.includeBom);
  const includeBom = bomRaw === null ? true : bomRaw === '1';

  const langRaw = safeGet(KEYS.language);
  const language: ExportLanguage = langRaw === 'en' ? 'en' : 'ar';

  return { pdfEngine, pdfFont, defaultFormat, csvDelimiter, includeBom, language };
}

export function writeExportSettings(patch: Partial<ExportSettings>) {
  if (patch.pdfEngine !== undefined) {
    const m = patch.pdfEngine;
    safeSet(KEYS.pdfEngine, m === 'auto' ? null : m === 'on' ? '1' : '0');
  }
  if (patch.pdfFont !== undefined) safeSet(KEYS.pdfFont, patch.pdfFont);
  if (patch.defaultFormat !== undefined) safeSet(KEYS.defaultFormat, patch.defaultFormat);
  if (patch.csvDelimiter !== undefined) safeSet(KEYS.csvDelimiter, patch.csvDelimiter);
  if (patch.includeBom !== undefined) safeSet(KEYS.includeBom, patch.includeBom ? '1' : '0');
  if (patch.language !== undefined) safeSet(KEYS.language, patch.language);

  try {
    window.dispatchEvent(new CustomEvent(EXPORT_SETTINGS_EVENT, { detail: patch }));
  } catch {
    /* noop */
  }
}

export function resetExportSettings() {
  Object.values(KEYS).forEach((k) => safeSet(k, null));
  try {
    window.dispatchEvent(new CustomEvent(EXPORT_SETTINGS_EVENT, { detail: 'reset' }));
  } catch {
    /* noop */
  }
}

export function useExportSettings() {
  const [settings, setSettings] = useState<ExportSettings>(() => readExportSettings());

  useEffect(() => {
    const refresh = () => setSettings(readExportSettings());
    window.addEventListener(EXPORT_SETTINGS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(EXPORT_SETTINGS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const update = useCallback((patch: Partial<ExportSettings>) => {
    writeExportSettings(patch);
    setSettings(readExportSettings());
  }, []);

  const reset = useCallback(() => {
    resetExportSettings();
    setSettings(readExportSettings());
  }, []);

  return { settings, update, reset };
}
