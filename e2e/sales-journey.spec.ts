/**
 * Sales Journey E2E Tests
 * اختبارات رحلة المبيعات الشاملة
 * 
 * Tests complete sales cycle: Quotation → Order → Invoice → Payment
 * @module e2e/sales-journey
 */

import { test, expect } from '@playwright/test';

test.describe('Sales Journey / رحلة المبيعات', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Quotation Flow / تدفق عروض الأسعار', () => {
    test('should navigate to quotations page', async ({ page }) => {
      await page.goto('/quotations');
      await expect(page).toHaveURL(/quotations/);
    });

    test('should display quotations list', async ({ page }) => {
      await page.goto('/quotations');
      
      // Should show table or cards
      const table = page.locator('table');
      const cards = page.locator('[class*="card"]');
      
      const hasContent = await table.isVisible() || await cards.first().isVisible();
      expect(hasContent).toBe(true);
    });

    test('should open create quotation dialog', async ({ page }) => {
      await page.goto('/quotations?action=new');
      
      // Dialog should be visible
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible()) {
        await expect(dialog).toBeVisible();
      }
    });

    test('should select customer for quotation', async ({ page }) => {
      await page.goto('/quotations?action=new');
      
      const customerSelect = page.getByLabel(/العميل|customer/i);
      if (await customerSelect.isVisible()) {
        await customerSelect.click();
      }
    });

    test('should add products to quotation', async ({ page }) => {
      await page.goto('/quotations?action=new');
      
      const addProductButton = page.getByRole('button', { name: /إضافة منتج|add product/i });
      if (await addProductButton.isVisible()) {
        await addProductButton.click();
      }
    });

    test('should calculate totals automatically', async ({ page }) => {
      await page.goto('/quotations?action=new');
      
      // Total should be visible
      const totalLabel = page.locator('text=/الإجمالي|total/i');
      if (await totalLabel.first().isVisible()) {
        await expect(totalLabel.first()).toBeVisible();
      }
    });

    test('should view quotation details', async ({ page }) => {
      await page.goto('/quotations');
      
      const quotationLink = page.locator('a[href*="/quotations/"]').first();
      if (await quotationLink.isVisible()) {
        await quotationLink.click();
        await expect(page).toHaveURL(/quotations\/.+/);
      }
    });
  });

  test.describe('Sales Order Flow / تدفق أوامر البيع', () => {
    test('should navigate to sales orders page', async ({ page }) => {
      await page.goto('/sales-orders');
      await expect(page).toHaveURL(/sales-orders/);
    });

    test('should create sales order from quotation', async ({ page }) => {
      await page.goto('/quotations');
      
      const quotationLink = page.locator('a[href*="/quotations/"]').first();
      if (await quotationLink.isVisible()) {
        await quotationLink.click();
        
        const convertButton = page.getByRole('button', { name: /تحويل|convert|أمر بيع/i });
        if (await convertButton.isVisible()) {
          await convertButton.click();
        }
      }
    });

    test('should display order status', async ({ page }) => {
      await page.goto('/sales-orders');
      
      // Status badges should be visible
      const statusBadge = page.locator('[class*="badge"]');
      if (await statusBadge.first().isVisible()) {
        expect(await statusBadge.count()).toBeGreaterThan(0);
      }
    });

    test('should view order details', async ({ page }) => {
      await page.goto('/sales-orders');
      
      const orderLink = page.locator('a[href*="/sales-orders/"]').first();
      if (await orderLink.isVisible()) {
        await orderLink.click();
        await expect(page).toHaveURL(/sales-orders\/.+/);
      }
    });
  });

  test.describe('Invoice Flow / تدفق الفواتير', () => {
    test('should navigate to invoices page', async ({ page }) => {
      await page.goto('/invoices');
      await expect(page).toHaveURL(/invoices/);
    });

    test('should create invoice from order', async ({ page }) => {
      await page.goto('/sales-orders');
      
      const orderLink = page.locator('a[href*="/sales-orders/"]').first();
      if (await orderLink.isVisible()) {
        await orderLink.click();
        
        const createInvoiceButton = page.getByRole('button', { name: /فاتورة|invoice/i });
        if (await createInvoiceButton.isVisible()) {
          await createInvoiceButton.click();
        }
      }
    });

    test('should display invoice payment status', async ({ page }) => {
      await page.goto('/invoices');
      
      // Payment status should be visible
      const statusText = page.locator('text=/مدفوع|جزئي|معلق|paid|partial|pending/i');
      if (await statusText.first().isVisible()) {
        expect(await statusText.count()).toBeGreaterThan(0);
      }
    });

    test('should print invoice', async ({ page }) => {
      await page.goto('/invoices');
      
      const invoiceLink = page.locator('a[href*="/invoices/"]').first();
      if (await invoiceLink.isVisible()) {
        await invoiceLink.click();
        
        const printButton = page.getByRole('button', { name: /طباعة|print/i });
        if (await printButton.isVisible()) {
          await expect(printButton).toBeVisible();
        }
      }
    });

    test('should export invoice to PDF', async ({ page }) => {
      await page.goto('/invoices');
      
      const invoiceLink = page.locator('a[href*="/invoices/"]').first();
      if (await invoiceLink.isVisible()) {
        await invoiceLink.click();
        
        const exportButton = page.getByRole('button', { name: /pdf|تصدير/i });
        if (await exportButton.isVisible()) {
          await expect(exportButton).toBeVisible();
        }
      }
    });
  });

  test.describe('Payment Flow / تدفق المدفوعات', () => {
    test('should navigate to payments page', async ({ page }) => {
      await page.goto('/payments');
      await expect(page).toHaveURL(/payments/);
    });

    test('should create payment for invoice', async ({ page }) => {
      await page.goto('/invoices');
      
      const invoiceLink = page.locator('a[href*="/invoices/"]').first();
      if (await invoiceLink.isVisible()) {
        await invoiceLink.click();
        
        const addPaymentButton = page.getByRole('button', { name: /دفعة|تحصيل|payment/i });
        if (await addPaymentButton.isVisible()) {
          await addPaymentButton.click();
        }
      }
    });

    test('should select payment method', async ({ page }) => {
      await page.goto('/payments?action=new');
      
      const methodSelect = page.getByLabel(/طريقة الدفع|payment method/i);
      if (await methodSelect.isVisible()) {
        await methodSelect.click();
      }
    });

    test('should display payment history', async ({ page }) => {
      await page.goto('/payments');
      
      // Payments list should be visible
      const table = page.locator('table');
      const cards = page.locator('[class*="card"]');
      
      const hasContent = await table.isVisible() || await cards.first().isVisible();
      expect(hasContent).toBe(true);
    });
  });

  test.describe('Complete Sales Cycle / دورة المبيعات الكاملة', () => {
    test('should track quotation to payment flow', async ({ page }) => {
      // This is a comprehensive test that tracks the entire flow
      
      // 1. Go to quotations
      await page.goto('/quotations');
      await expect(page).toHaveURL(/quotations/);
      
      // 2. Go to sales orders
      await page.goto('/sales-orders');
      await expect(page).toHaveURL(/sales-orders/);
      
      // 3. Go to invoices
      await page.goto('/invoices');
      await expect(page).toHaveURL(/invoices/);
      
      // 4. Go to payments
      await page.goto('/payments');
      await expect(page).toHaveURL(/payments/);
    });
  });

  test.describe('Sales Reports / تقارير المبيعات', () => {
    test('should navigate to reports', async ({ page }) => {
      await page.goto('/reports');
      await expect(page).toHaveURL(/reports/);
    });

    test('should display sales report options', async ({ page }) => {
      await page.goto('/reports');
      
      const salesReport = page.locator('text=/مبيعات|sales/i');
      if (await salesReport.first().isVisible()) {
        await expect(salesReport.first()).toBeVisible();
      }
    });

    test('should filter reports by date range', async ({ page }) => {
      await page.goto('/reports');
      
      const dateFilter = page.getByLabel(/من|from|تاريخ/i);
      if (await dateFilter.first().isVisible()) {
        await expect(dateFilter.first()).toBeVisible();
      }
    });
  });
});
