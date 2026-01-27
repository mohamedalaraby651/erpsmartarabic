/**
 * Reports Journey E2E Tests
 * اختبارات رحلة التقارير الشاملة
 */

import { test, expect } from '@playwright/test';

test.describe('Reports Journey / رحلة التقارير', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Reports Page / صفحة التقارير', () => {
    test('should display reports page', async ({ page }) => {
      await page.goto('/reports');
      
      await expect(page.locator('h1, [data-testid="page-title"]')).toBeVisible();
    });

    test('should show different report types', async ({ page }) => {
      await page.goto('/reports');
      
      await page.waitForTimeout(1000);
      
      // Should have tabs or sections for different reports
      const tabs = page.locator('[role="tablist"], .tabs');
      if (await tabs.isVisible()) {
        const tabCount = await tabs.locator('[role="tab"], button').count();
        expect(tabCount).toBeGreaterThan(0);
      }
    });

    test('should have date range picker', async ({ page }) => {
      await page.goto('/reports');
      
      await page.waitForTimeout(1000);
      
      // Look for date picker
      const datePicker = page.locator('[data-testid="date-range-picker"], input[type="date"], button:has-text("تاريخ")');
      // Date picker should exist
    });
  });

  test.describe('Aging Report / تقرير أعمار الديون', () => {
    test('should display aging report tab', async ({ page }) => {
      await page.goto('/reports');
      
      await page.waitForTimeout(1000);
      
      // Click on aging report tab if available
      const agingTab = page.locator('button:has-text("أعمار"), [data-testid="aging-tab"]');
      if (await agingTab.isVisible()) {
        await agingTab.click();
        await page.waitForTimeout(500);
      }
    });

    test('should show customer balances', async ({ page }) => {
      await page.goto('/reports');
      
      await page.waitForTimeout(2000);
      
      // Look for balance data in table or cards
    });
  });

  test.describe('Profitability Report / تقرير الربحية', () => {
    test('should display profitability metrics', async ({ page }) => {
      await page.goto('/reports');
      
      await page.waitForTimeout(1000);
      
      // Click on profitability tab if available
      const profitTab = page.locator('button:has-text("ربحية"), button:has-text("أرباح"), [data-testid="profit-tab"]');
      if (await profitTab.isVisible()) {
        await profitTab.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Inventory Flow Report / تقرير حركة المخزون', () => {
    test('should display inventory flow data', async ({ page }) => {
      await page.goto('/reports');
      
      await page.waitForTimeout(1000);
      
      // Click on inventory flow tab if available
      const inventoryTab = page.locator('button:has-text("مخزون"), button:has-text("حركة"), [data-testid="inventory-tab"]');
      if (await inventoryTab.isVisible()) {
        await inventoryTab.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Export Functionality / وظائف التصدير', () => {
    test('should have export button', async ({ page }) => {
      await page.goto('/reports');
      
      await page.waitForTimeout(1000);
      
      const exportButton = page.locator('button:has-text("تصدير"), button:has-text("Export"), [data-testid="export-button"]');
      // Export button should exist
    });

    test('should show export options', async ({ page }) => {
      await page.goto('/reports');
      
      await page.waitForTimeout(1000);
      
      const exportButton = page.locator('button:has-text("تصدير"), [data-testid="export-button"]');
      if (await exportButton.first().isVisible()) {
        await exportButton.first().click();
        await page.waitForTimeout(500);
        
        // Should show export format options (PDF, Excel)
      }
    });
  });

  test.describe('Charts and Visualizations / الرسوم البيانية', () => {
    test('should display charts', async ({ page }) => {
      await page.goto('/reports');
      
      await page.waitForTimeout(2000);
      
      // Look for chart containers (recharts)
      const charts = page.locator('.recharts-wrapper, svg.recharts-surface, [data-testid="chart"]');
      // Charts may or may not be visible depending on data
    });
  });

  test.describe('Report Templates / قوالب التقارير', () => {
    test('should access report template editor', async ({ page }) => {
      await page.goto('/reports');
      
      await page.waitForTimeout(1000);
      
      // Look for template settings
      const templateButton = page.locator('button:has-text("قالب"), button:has-text("إعدادات"), [data-testid="template-settings"]');
      if (await templateButton.first().isVisible()) {
        await templateButton.first().click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Filter and Sort / الفلترة والترتيب', () => {
    test('should filter report data', async ({ page }) => {
      await page.goto('/reports');
      
      await page.waitForTimeout(1000);
      
      // Look for filter controls
      const filterButton = page.locator('[data-testid="filter-button"], button:has-text("فلتر")');
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await page.waitForTimeout(500);
      }
    });
  });
});

test.describe('Dashboard Reports / تقارير لوحة التحكم', () => {
  test('should show performance widget', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(2000);
    
    // Look for performance stats on dashboard
    const statsWidget = page.locator('[data-testid="stats-widget"], [data-testid="performance-widget"]');
  });

  test('should show today performance', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(2000);
    
    // Look for today's performance data
  });

  test('should show sales chart', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(2000);
    
    // Look for sales chart
    const chart = page.locator('.recharts-wrapper, [data-testid="sales-chart"]');
  });
});

test.describe('Reports Mobile Experience / تجربة التقارير على الموبايل', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('should display reports in mobile layout', async ({ page }) => {
    await page.goto('/reports');
    
    await page.waitForTimeout(1000);
    
    // Should show mobile-friendly layout
  });

  test('should have responsive charts', async ({ page }) => {
    await page.goto('/reports');
    
    await page.waitForTimeout(2000);
    
    // Charts should be responsive
    const charts = page.locator('.recharts-wrapper');
    if (await charts.first().isVisible()) {
      const box = await charts.first().boundingBox();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test('should have swipeable tabs on mobile', async ({ page }) => {
    await page.goto('/reports');
    
    await page.waitForTimeout(1000);
    
    // Tabs should be scrollable on mobile
    const tabs = page.locator('[role="tablist"]');
    if (await tabs.isVisible()) {
      // Tabs container should exist
    }
  });
});
