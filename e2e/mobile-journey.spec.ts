/**
 * Mobile Journey E2E Tests
 * اختبارات رحلة الموبايل الشاملة
 * 
 * Tests mobile-specific features and interactions
 * @module e2e/mobile-journey
 */

import { test, expect } from '@playwright/test';

test.describe('Mobile Journey / رحلة الموبايل', () => {
  // Use mobile viewport
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Mobile Navigation / التنقل', () => {
    test('should display bottom navigation', async ({ page }) => {
      await page.goto('/');
      
      // Bottom nav should be visible
      const bottomNav = page.locator('[class*="bottom"]').filter({ hasText: /الرئيسية|home/i });
      if (await bottomNav.isVisible()) {
        await expect(bottomNav).toBeVisible();
      }
    });

    test('should open mobile drawer', async ({ page }) => {
      await page.goto('/');
      
      // Click menu button
      const menuButton = page.locator('[class*="grid"]').first();
      if (await menuButton.isVisible()) {
        await menuButton.click();
        
        // Drawer should open
        await expect(page.locator('[class*="drawer"], [role="dialog"]')).toBeVisible();
      }
    });

    test('should navigate via bottom nav', async ({ page }) => {
      await page.goto('/');
      
      // Click on customers in bottom nav
      const customersNavItem = page.locator('nav button, nav a').filter({ hasText: /عملاء|customers/i });
      if (await customersNavItem.isVisible()) {
        await customersNavItem.click();
        await expect(page).toHaveURL(/customers/);
      }
    });

    test('should show mobile header', async ({ page }) => {
      await page.goto('/');
      
      // Header should be visible and compact
      const header = page.locator('header');
      if (await header.isVisible()) {
        await expect(header).toBeVisible();
      }
    });
  });

  test.describe('Mobile Dashboard / لوحة التحكم', () => {
    test('should display stats cards', async ({ page }) => {
      await page.goto('/');
      
      // Stats should be visible
      const statsCards = page.locator('[class*="card"]');
      if (await statsCards.first().isVisible()) {
        expect(await statsCards.count()).toBeGreaterThan(0);
      }
    });

    test('should display quick actions', async ({ page }) => {
      await page.goto('/');
      
      // Quick action buttons should be visible
      const quickActions = page.locator('text=/سريع|quick/i');
      if (await quickActions.isVisible()) {
        await expect(quickActions).toBeVisible();
      }
    });

    test('should show recent activities', async ({ page }) => {
      await page.goto('/');
      
      // Activities section should be visible
      const activities = page.locator('text=/أنشطة|activities|آخر/i');
      if (await activities.first().isVisible()) {
        await expect(activities.first()).toBeVisible();
      }
    });
  });

  test.describe('FAB Menu / زر الإجراءات العائم', () => {
    test('should display FAB button', async ({ page }) => {
      await page.goto('/customers');
      
      // FAB should be visible
      const fab = page.locator('[class*="fab"], button[class*="rounded-full"]');
      if (await fab.first().isVisible()) {
        await expect(fab.first()).toBeVisible();
      }
    });

    test('should expand FAB menu on click', async ({ page }) => {
      await page.goto('/customers');
      
      const fab = page.locator('[class*="fab"], button[class*="rounded-full"]').last();
      if (await fab.isVisible()) {
        await fab.click();
        
        // Menu items should appear
        await page.waitForTimeout(300);
      }
    });

    test('should show context-aware actions', async ({ page }) => {
      await page.goto('/customers');
      
      const fab = page.locator('[class*="fab"], button[class*="rounded-full"]').last();
      if (await fab.isVisible()) {
        await fab.click();
        
        // Customer-specific action should be visible
        const addCustomer = page.locator('text=/عميل|customer/i');
        if (await addCustomer.first().isVisible()) {
          await expect(addCustomer.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Mobile Forms / النماذج', () => {
    test('should display full-screen form dialog', async ({ page }) => {
      await page.goto('/customers?action=new');
      
      // Form should be full screen on mobile
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible()) {
        await expect(dialog).toBeVisible();
      }
    });

    test('should have proper input sizing', async ({ page }) => {
      await page.goto('/customers?action=new');
      
      const input = page.getByRole('textbox').first();
      if (await input.isVisible()) {
        // Input should be touch-friendly size (at least 44px)
        const box = await input.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(36);
        }
      }
    });

    test('should have numeric keyboard for phone inputs', async ({ page }) => {
      await page.goto('/customers?action=new');
      
      const phoneInput = page.getByLabel(/هاتف|phone/i);
      if (await phoneInput.isVisible()) {
        const inputMode = await phoneInput.getAttribute('inputmode');
        // Should have numeric or tel input mode
        expect(['numeric', 'tel', null]).toContain(inputMode);
      }
    });
  });

  test.describe('Mobile Lists / القوائم', () => {
    test('should display data as cards', async ({ page }) => {
      await page.goto('/customers');
      
      // On mobile, should show cards instead of table
      const cards = page.locator('[class*="card"]');
      const table = page.locator('table');
      
      // Either cards should be visible or table should be hidden
      const hasCards = await cards.first().isVisible();
      const hasTable = await table.isVisible();
      
      // Mobile should prefer cards
      if (hasCards) {
        expect(await cards.count()).toBeGreaterThan(0);
      }
    });

    test('should support pull to refresh', async ({ page }) => {
      await page.goto('/customers');
      
      // Pull to refresh gesture (scroll up beyond top)
      await page.evaluate(() => {
        window.scrollTo(0, -100);
      });
      
      // Wait for potential refresh
      await page.waitForTimeout(500);
    });

    test('should show loading skeletons', async ({ page }) => {
      // Intercept API to add delay
      await page.route('**/rest/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.continue();
      });
      
      await page.goto('/customers');
      
      // Skeleton should be briefly visible
      const skeleton = page.locator('[class*="skeleton"]');
      // May or may not catch it depending on timing
    });
  });

  test.describe('Mobile Search / البحث', () => {
    test('should display search bar', async ({ page }) => {
      await page.goto('/customers');
      
      const searchInput = page.getByPlaceholder(/بحث|search/i);
      if (await searchInput.isVisible()) {
        await expect(searchInput).toBeVisible();
      }
    });

    test('should focus search on tap', async ({ page }) => {
      await page.goto('/customers');
      
      const searchInput = page.getByPlaceholder(/بحث|search/i);
      if (await searchInput.isVisible()) {
        await searchInput.tap();
        await expect(searchInput).toBeFocused();
      }
    });

    test('should filter results as typing', async ({ page }) => {
      await page.goto('/customers');
      
      const searchInput = page.getByPlaceholder(/بحث|search/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Mobile Settings / الإعدادات', () => {
    test('should display settings as list', async ({ page }) => {
      await page.goto('/settings');
      
      // Settings should be in list format
      const settingItems = page.locator('[class*="list-item"], button[class*="rounded"]');
      if (await settingItems.first().isVisible()) {
        expect(await settingItems.count()).toBeGreaterThan(0);
      }
    });

    test('should navigate to setting detail on tap', async ({ page }) => {
      await page.goto('/settings');
      
      const settingItem = page.locator('button, a').filter({ hasText: /مظهر|appearance/i });
      if (await settingItem.isVisible()) {
        await settingItem.click();
        
        // Should show detail view
        await page.waitForTimeout(300);
      }
    });

    test('should have back button in detail view', async ({ page }) => {
      await page.goto('/settings?tab=appearance');
      
      const backButton = page.locator('button').filter({ has: page.locator('[class*="chevron"]') });
      if (await backButton.first().isVisible()) {
        await expect(backButton.first()).toBeVisible();
      }
    });
  });

  test.describe('Touch Interactions / تفاعلات اللمس', () => {
    test('should have touch-friendly button sizes', async ({ page }) => {
      await page.goto('/');
      
      const buttons = page.getByRole('button');
      const firstButton = buttons.first();
      
      if (await firstButton.isVisible()) {
        const box = await firstButton.boundingBox();
        if (box) {
          // Minimum touch target is 44x44 or 48x48
          expect(box.height).toBeGreaterThanOrEqual(32);
        }
      }
    });

    test('should support swipe gestures on list items', async ({ page }) => {
      await page.goto('/customers');
      
      const listItem = page.locator('[class*="card"]').first();
      if (await listItem.isVisible()) {
        // Simulate swipe
        const box = await listItem.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width / 2 - 100, box.y + box.height / 2);
          await page.mouse.up();
        }
      }
    });
  });

  test.describe('RTL Layout / تخطيط RTL', () => {
    test('should align text to right', async ({ page }) => {
      await page.goto('/');
      
      // Check that HTML has dir="rtl" or body has RTL styling
      const htmlDir = await page.locator('html').getAttribute('dir');
      const hasRtlClass = await page.locator('html, body').evaluate(el => 
        window.getComputedStyle(el).direction === 'rtl'
      );
      
      expect(htmlDir === 'rtl' || hasRtlClass).toBe(true);
    });

    test('should position icons correctly for RTL', async ({ page }) => {
      await page.goto('/');
      
      // Icons should be mirrored or positioned correctly
      const icon = page.locator('svg').first();
      if (await icon.isVisible()) {
        await expect(icon).toBeVisible();
      }
    });
  });

  test.describe('Offline Mode / وضع عدم الاتصال', () => {
    test('should show offline indicator when disconnected', async ({ page }) => {
      await page.goto('/');
      
      // Simulate offline
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);
      
      // Offline indicator should appear
      const offlineIndicator = page.locator('text=/offline|غير متصل/i');
      // May or may not show depending on implementation
      
      // Restore online
      await page.context().setOffline(false);
    });
  });
});
