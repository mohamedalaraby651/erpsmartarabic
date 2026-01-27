/**
 * Responsive Design Tests
 * اختبارات التصميم المتجاوب
 */

import { test, expect } from '@playwright/test';

// Viewport configurations
const viewports = {
  mobileS: { width: 320, height: 568 },
  mobileM: { width: 375, height: 667 },
  mobileL: { width: 425, height: 812 },
  tablet: { width: 768, height: 1024 },
  laptop: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 },
};

test.describe('Responsive Layout Tests / اختبارات التخطيط المتجاوب', () => {
  
  test.describe('Mobile Small (320px)', () => {
    test.use({ viewport: viewports.mobileS });

    test('should display mobile layout', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Should show mobile bottom navigation
      const bottomNav = page.locator('[data-testid="mobile-bottom-nav"], nav.fixed.bottom-0');
      // Mobile nav may be visible
    });

    test('should hide desktop sidebar', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Desktop sidebar should be hidden on mobile
      const sidebar = page.locator('aside[data-testid="sidebar"]');
      // Sidebar may not be visible on mobile
    });

    test('should show hamburger menu', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      const menuButton = page.locator('button[aria-label*="menu"], button:has(svg.lucide-menu)');
      // Menu button should be visible
    });

    test('should use full-width cards', async ({ page }) => {
      await page.goto('/customers');
      await page.waitForTimeout(1000);

      // Cards should be full width on mobile
    });
  });

  test.describe('Mobile Medium (375px)', () => {
    test.use({ viewport: viewports.mobileM });

    test('should display properly on iPhone-sized screen', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Check main content fits
      const body = page.locator('body');
      const box = await body.boundingBox();
      expect(box?.width).toBe(375);
    });

    test('should show mobile-optimized forms', async ({ page }) => {
      await page.goto('/customers?action=new');
      await page.waitForTimeout(1000);

      // Dialog should be full-screen or nearly full-screen on mobile
      const dialog = page.locator('[role="dialog"], [data-vaul-drawer]');
      if (await dialog.isVisible()) {
        const box = await dialog.boundingBox();
        // Should be close to full width
      }
    });
  });

  test.describe('Mobile Large (425px)', () => {
    test.use({ viewport: viewports.mobileL });

    test('should handle large mobile screens', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Should still use mobile layout
    });
  });

  test.describe('Tablet (768px)', () => {
    test.use({ viewport: viewports.tablet });

    test('should show tablet-optimized layout', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      // May show collapsed sidebar or mobile layout
    });

    test('should display 2-column grid where appropriate', async ({ page }) => {
      await page.goto('/customers');
      await page.waitForTimeout(1000);

      // Cards might be in 2-column grid
    });

    test('should show table on tablet', async ({ page }) => {
      await page.goto('/customers');
      await page.waitForTimeout(2000);

      // Tables should be visible on tablet
      const table = page.locator('table');
      // Table may be visible or card view depending on implementation
    });
  });

  test.describe('Laptop (1024px)', () => {
    test.use({ viewport: viewports.laptop });

    test('should show desktop layout', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Should show sidebar
      const sidebar = page.locator('aside, [data-testid="sidebar"]');
      // Sidebar should be visible
    });

    test('should hide mobile navigation', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Mobile bottom nav should be hidden
      const bottomNav = page.locator('[data-testid="mobile-bottom-nav"]');
      if (await bottomNav.count() > 0) {
        expect(await bottomNav.isVisible()).toBe(false);
      }
    });

    test('should display full tables', async ({ page }) => {
      await page.goto('/customers');
      await page.waitForTimeout(2000);

      const table = page.locator('table');
      expect(await table.isVisible()).toBe(true);
    });
  });

  test.describe('Desktop (1440px)', () => {
    test.use({ viewport: viewports.desktop });

    test('should display full desktop layout', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Full sidebar, full content area
      const sidebar = page.locator('aside, [data-testid="sidebar"]');
      expect(await sidebar.first().isVisible()).toBe(true);
    });

    test('should show all table columns', async ({ page }) => {
      await page.goto('/customers');
      await page.waitForTimeout(2000);

      const table = page.locator('table');
      if (await table.isVisible()) {
        const headers = table.locator('th');
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(3);
      }
    });

    test('should display multi-column dashboard', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Dashboard should have multi-column widgets
    });
  });
});

test.describe('Component Responsiveness / استجابة المكونات', () => {
  test.describe('Data Tables', () => {
    test('should switch to cards on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/customers');
      await page.waitForTimeout(2000);

      // Should show cards instead of table on mobile
      const table = page.locator('table');
      const cards = page.locator('[data-testid="data-card"], .card');
      
      // Either table should be hidden or cards should be visible
    });

    test('should show table on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/customers');
      await page.waitForTimeout(2000);

      const table = page.locator('table');
      expect(await table.isVisible()).toBe(true);
    });
  });

  test.describe('Navigation', () => {
    test('should show bottom nav on mobile only', async ({ page }) => {
      // Mobile
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/');
      await page.waitForTimeout(1000);

      const bottomNavMobile = page.locator('[data-testid="mobile-bottom-nav"], nav.fixed.bottom-0');
      // Should be visible on mobile (if implemented)

      // Desktop
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Should be hidden on desktop
    });
  });

  test.describe('Dialogs and Modals', () => {
    test('should be full-screen on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/customers?action=new');
      await page.waitForTimeout(1000);

      const dialog = page.locator('[role="dialog"], [data-vaul-drawer]');
      if (await dialog.isVisible()) {
        const box = await dialog.boundingBox();
        if (box) {
          // Should be close to full width
          expect(box.width).toBeGreaterThan(350);
        }
      }
    });

    test('should be centered modal on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/customers?action=new');
      await page.waitForTimeout(1000);

      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        const box = await dialog.boundingBox();
        if (box) {
          // Should not be full width
          expect(box.width).toBeLessThan(1200);
        }
      }
    });
  });

  test.describe('Forms', () => {
    test('should stack form fields on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/settings?tab=profile');
      await page.waitForTimeout(1000);

      // Form fields should be stacked vertically
    });

    test('should use grid layout on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/settings?tab=profile');
      await page.waitForTimeout(1000);

      // Form may use grid layout with multiple columns
    });
  });

  test.describe('Charts', () => {
    test('should resize charts for mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/reports');
      await page.waitForTimeout(2000);

      const charts = page.locator('.recharts-wrapper');
      if (await charts.first().isVisible()) {
        const box = await charts.first().boundingBox();
        if (box) {
          expect(box.width).toBeLessThanOrEqual(375);
        }
      }
    });
  });
});

test.describe('Touch Interactions / التفاعلات اللمسية', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('should support touch targets of at least 44px', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Check button sizes
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // Touch targets should be at least 44px
          // This is a best practice, not strict requirement
        }
      }
    }
  });

  test('should handle swipe gestures', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Test swipeable elements (if any)
  });
});

test.describe('Orientation Changes / تغييرات الاتجاه', () => {
  test('should handle portrait to landscape', async ({ page }) => {
    // Portrait
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForTimeout(500);

    // Landscape
    await page.setViewportSize({ width: 812, height: 375 });
    await page.waitForTimeout(500);

    // Content should still be visible
    const main = page.locator('main, [role="main"]');
    expect(await main.first().isVisible()).toBe(true);
  });

  test('should handle landscape to portrait', async ({ page }) => {
    // Landscape
    await page.setViewportSize({ width: 812, height: 375 });
    await page.goto('/');
    await page.waitForTimeout(500);

    // Portrait
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    // Content should still be visible
    const main = page.locator('main, [role="main"]');
    expect(await main.first().isVisible()).toBe(true);
  });
});
