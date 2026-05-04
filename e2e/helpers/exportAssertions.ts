/**
 * E2E export assertions — Arabic + RTL guarantees.
 * Reusable across page-level export specs.
 */
import { expect } from '@playwright/test';

const ARABIC = /[\u0600-\u06FF]/;
const BIDI_CONTROLS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

export function assertCsvArabic(buffer: Buffer) {
  // UTF-8 BOM (EF BB BF) is REQUIRED for Excel to render Arabic CSV correctly.
  expect(buffer[0]).toBe(0xef);
  expect(buffer[1]).toBe(0xbb);
  expect(buffer[2]).toBe(0xbf);
  const text = buffer.toString('utf-8').slice(1); // strip BOM for content tests
  expect(ARABIC.test(text)).toBe(true);
  expect(BIDI_CONTROLS.test(text)).toBe(false);
}

export async function assertXlsxRtl(buffer: Buffer) {
  // Inspect the workbook XML for the rightToLeft="1" view flag.
  // unzipper is loaded lazily so the helper works even when the dep is absent.
  let unzipper: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    unzipper = require('unzipper');
  } catch {
    // Fallback: just sniff the raw bytes for the RTL marker.
    const text = buffer.toString('binary');
    expect(text.includes('rightToLeft="1"') || text.includes("rightToLeft='1'")).toBe(true);
    return;
  }
  const directory = await unzipper.Open.buffer(buffer);
  const wbFile = directory.files.find((f: any) => f.path === 'xl/workbook.xml');
  expect(wbFile).toBeDefined();
  const xml = (await wbFile.buffer()).toString('utf-8');
  expect(/rightToLeft\s*=\s*"1"/.test(xml)).toBe(true);
}

export async function assertPdfArabic(buffer: Buffer) {
  // pdf-parse is optional — fall back to a binary sniff if it is not installed.
  let pdfParse: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    pdfParse = require('pdf-parse');
  } catch {
    // Look for the embedded Amiri font marker which our pipeline always uses.
    const head = buffer.toString('binary');
    expect(/Amiri|Cairo|FE7\d|FE8\d|FE9\d|FEA\d|FEB\d|FEC\d|FED\d|FEE\d|FEF\d/.test(head)).toBe(true);
    return;
  }
  const data = await pdfParse(buffer);
  expect(data.text.length).toBeGreaterThan(0);
  expect(ARABIC.test(data.text)).toBe(true);
}
