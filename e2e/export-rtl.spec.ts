/**
 * E2E: Arabic + RTL guarantees for every export pathway.
 *
 * Runs in both desktop and mobile Playwright projects (see playwright.config.ts).
 * Skips gracefully when no PREVIEW_URL or test credentials are provided so the
 * spec never blocks local UI development.
 */
import { test, expect, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  assertCsvArabic,
  assertXlsxRtl,
  assertPdfArabic,
} from './helpers/exportAssertions';

const PREVIEW_URL = process.env.PREVIEW_URL ?? '';
const TEST_USER = process.env.E2E_USER ?? '';
const TEST_PASS = process.env.E2E_PASS ?? '';

const PAGES_TO_TEST: { route: string; label: string }[] = [
  { route: '/invoices', label: 'الفواتير' },
  { route: '/quotations', label: 'عروض الأسعار' },
  { route: '/sales-orders', label: 'أوامر البيع' },
  { route: '/reports', label: 'التقارير' },
];

async function login(page: Page) {
  if (!TEST_USER || !TEST_PASS) return;
  await page.goto('/auth');
  await page.getByLabel(/البريد|email/i).fill(TEST_USER);
  await page.getByLabel(/كلمة المرور|password/i).fill(TEST_PASS);
  await page.getByRole('button', { name: /دخول|تسجيل|sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 15_000 });
}

async function triggerExport(page: Page, item: RegExp) {
  const trigger = page.getByRole('button', { name: /تصدير/ }).first();
  await trigger.click();
  const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
  await page.getByRole('menuitem', { name: item }).first().click();
  return downloadPromise;
}

test.describe('Exports — Arabic + RTL guarantees', () => {
  test.skip(!PREVIEW_URL, 'PREVIEW_URL not set; skipping E2E export checks.');

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const { route, label } of PAGES_TO_TEST) {
    test(`${label} → CSV preserves UTF-8 BOM and Arabic`, async ({ page }) => {
      await page.goto(route);
      const download = await triggerExport(page, /^CSV$/);
      const buf = await readFile(await download.path());
      assertCsvArabic(buf);
    });

    test(`${label} → Excel emits RTL workbook view`, async ({ page }) => {
      await page.goto(route);
      const download = await triggerExport(page, /Excel/);
      const buf = await readFile(await download.path());
      await assertXlsxRtl(buf);
    });

    test(`${label} → PDF embeds Arabic text`, async ({ page }) => {
      await page.goto(route);
      const download = await triggerExport(page, /PDF/);
      const buf = await readFile(await download.path());
      await assertPdfArabic(buf);
      // Visual evidence — saved as a Playwright artifact on failure
      await expect(page).toHaveScreenshot({ fullPage: false, maxDiffPixelRatio: 1 });
    });
  }
});
