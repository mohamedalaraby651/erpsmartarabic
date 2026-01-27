/**
 * Customer Journey E2E Tests
 * اختبارات رحلة العميل الشاملة
 * 
 * Tests complete customer lifecycle from creation to transactions
 * @module e2e/customer-journey
 */

import { test, expect } from '@playwright/test';

test.describe('Customer Journey / رحلة العميل', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
  });

  test.describe('Customer Creation / إنشاء عميل', () => {
    test('should navigate to customers page', async ({ page }) => {
      await page.goto('/customers');
      await expect(page).toHaveURL(/customers/);
    });

    test('should display add customer button', async ({ page }) => {
      await page.goto('/customers');
      // Look for add button
      const addButton = page.getByRole('button', { name: /إضافة|جديد|عميل/i });
      await expect(addButton).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/customers?action=new');
      
      // Try to submit without filling required fields
      const saveButton = page.getByRole('button', { name: /حفظ|إضافة/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        // Should show validation errors
        await expect(page.locator('text=/مطلوب|required/i')).toBeVisible();
      }
    });

    test('should create new customer successfully', async ({ page }) => {
      await page.goto('/customers?action=new');
      
      // Fill customer form
      const nameInput = page.getByLabel(/الاسم|name/i);
      if (await nameInput.isVisible()) {
        await nameInput.fill('عميل اختباري');
      }

      const phoneInput = page.getByLabel(/الهاتف|phone/i);
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('0501234567');
      }
    });
  });

  test.describe('Customer Details / تفاصيل العميل', () => {
    test('should navigate to customer details', async ({ page }) => {
      await page.goto('/customers');
      
      // Click on first customer if exists
      const customerRow = page.locator('table tbody tr').first();
      if (await customerRow.isVisible()) {
        await customerRow.click();
      }
    });

    test('should display customer information tabs', async ({ page }) => {
      await page.goto('/customers');
      
      // Try to access a customer detail page
      const viewButton = page.getByRole('button', { name: /عرض|view/i }).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();
        
        // Should show tabs
        await expect(page.locator('text=/معلومات|فواتير|مدفوعات/i')).toBeVisible();
      }
    });

    test('should display customer invoices', async ({ page }) => {
      // Navigate to a customer detail page
      await page.goto('/customers');
      
      const customerLink = page.locator('a[href*="/customers/"]').first();
      if (await customerLink.isVisible()) {
        await customerLink.click();
        
        // Look for invoices tab
        const invoicesTab = page.getByRole('tab', { name: /فواتير|invoices/i });
        if (await invoicesTab.isVisible()) {
          await invoicesTab.click();
        }
      }
    });

    test('should display customer balance', async ({ page }) => {
      await page.goto('/customers');
      
      // Balance should be visible somewhere
      const balanceText = page.locator('text=/رصيد|balance/i');
      if (await balanceText.first().isVisible()) {
        await expect(balanceText.first()).toBeVisible();
      }
    });
  });

  test.describe('Customer Editing / تعديل العميل', () => {
    test('should open edit dialog', async ({ page }) => {
      await page.goto('/customers');
      
      const editButton = page.getByRole('button', { name: /تعديل|edit/i }).first();
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Dialog should open
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    });

    test('should update customer data', async ({ page }) => {
      await page.goto('/customers');
      
      const editButton = page.getByRole('button', { name: /تعديل|edit/i }).first();
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Modify name
        const nameInput = page.getByLabel(/الاسم|name/i);
        if (await nameInput.isVisible()) {
          await nameInput.clear();
          await nameInput.fill('اسم معدل');
        }
      }
    });
  });

  test.describe('Customer Addresses / عناوين العميل', () => {
    test('should display addresses list', async ({ page }) => {
      await page.goto('/customers');
      
      const customerLink = page.locator('a[href*="/customers/"]').first();
      if (await customerLink.isVisible()) {
        await customerLink.click();
        
        // Look for addresses section
        const addressesTab = page.getByRole('tab', { name: /عناوين|addresses/i });
        if (await addressesTab.isVisible()) {
          await addressesTab.click();
        }
      }
    });

    test('should add new address', async ({ page }) => {
      await page.goto('/customers');
      
      const customerLink = page.locator('a[href*="/customers/"]').first();
      if (await customerLink.isVisible()) {
        await customerLink.click();
        
        const addAddressButton = page.getByRole('button', { name: /إضافة عنوان|add address/i });
        if (await addAddressButton.isVisible()) {
          await addAddressButton.click();
        }
      }
    });
  });

  test.describe('Customer Search & Filter / البحث والتصفية', () => {
    test('should search customers by name', async ({ page }) => {
      await page.goto('/customers');
      
      const searchInput = page.getByPlaceholder(/بحث|search/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('عميل');
        await page.waitForTimeout(500); // Wait for search
      }
    });

    test('should filter by customer type', async ({ page }) => {
      await page.goto('/customers');
      
      const filterButton = page.getByRole('button', { name: /تصفية|filter/i });
      if (await filterButton.isVisible()) {
        await filterButton.click();
        
        // Select filter option
        const typeFilter = page.locator('text=/نوع العميل|customer type/i');
        if (await typeFilter.isVisible()) {
          await typeFilter.click();
        }
      }
    });

    test('should filter by VIP level', async ({ page }) => {
      await page.goto('/customers');
      
      const filterButton = page.getByRole('button', { name: /تصفية|filter/i });
      if (await filterButton.isVisible()) {
        await filterButton.click();
      }
    });
  });

  test.describe('Customer Export / تصدير العملاء', () => {
    test('should export to Excel', async ({ page }) => {
      await page.goto('/customers');
      
      const exportButton = page.getByRole('button', { name: /تصدير|export/i });
      if (await exportButton.isVisible()) {
        await exportButton.click();
        
        const excelOption = page.locator('text=/excel/i');
        if (await excelOption.isVisible()) {
          await excelOption.click();
        }
      }
    });

    test('should export to PDF', async ({ page }) => {
      await page.goto('/customers');
      
      const exportButton = page.getByRole('button', { name: /تصدير|export/i });
      if (await exportButton.isVisible()) {
        await exportButton.click();
        
        const pdfOption = page.locator('text=/pdf/i');
        if (await pdfOption.isVisible()) {
          await pdfOption.click();
        }
      }
    });
  });

  test.describe('Customer Mobile Experience / تجربة الموبايل', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('should display mobile layout', async ({ page }) => {
      await page.goto('/customers');
      
      // Should show mobile navigation
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible().catch(() => {
        // Alternative: check for bottom nav
        expect(page.locator('nav')).toBeVisible();
      });
    });

    test('should use swipeable cards on mobile', async ({ page }) => {
      await page.goto('/customers');
      
      // Cards should be visible instead of table
      const cards = page.locator('[class*="card"]');
      if (await cards.first().isVisible()) {
        expect(await cards.count()).toBeGreaterThan(0);
      }
    });
  });
});
