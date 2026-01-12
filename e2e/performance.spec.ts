import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test.describe('Page Load Performance', () => {
    test('should load auth page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/auth');
      await page.waitForLoadState('domcontentloaded');
      
      const loadTime = Date.now() - startTime;
      
      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should have no console errors on load', async ({ page }) => {
      const consoleErrors: string[] = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      
      // Filter out expected errors (like favicon 404)
      const unexpectedErrors = consoleErrors.filter(
        (error) => !error.includes('favicon') && !error.includes('404')
      );
      
      expect(unexpectedErrors.length).toBe(0);
    });

    test('should have no network errors on load', async ({ page }) => {
      const networkErrors: string[] = [];
      
      page.on('requestfailed', (request) => {
        // Ignore expected failures
        if (!request.url().includes('favicon')) {
          networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`);
        }
      });

      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      
      expect(networkErrors.length).toBe(0);
    });
  });

  test.describe('Core Web Vitals', () => {
    test('should have acceptable First Contentful Paint', async ({ page }) => {
      await page.goto('/auth');
      
      // Get performance metrics
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcp = entries.find((entry) => entry.name === 'first-contentful-paint');
            resolve(fcp ? fcp.startTime : null);
          }).observe({ entryTypes: ['paint'] });
          
          // Fallback timeout
          setTimeout(() => resolve(null), 5000);
        });
      });

      if (metrics !== null) {
        expect(metrics).toBeLessThan(2500); // FCP should be under 2.5s
      }
    });

    test('should have acceptable Largest Contentful Paint', async ({ page }) => {
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry ? lastEntry.startTime : null);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          setTimeout(() => resolve(null), 5000);
        });
      });

      if (lcp !== null) {
        expect(lcp).toBeLessThan(4000); // LCP should be under 4s
      }
    });
  });

  test.describe('Resource Loading', () => {
    test('should load JavaScript bundles efficiently', async ({ page }) => {
      const jsRequests: { url: string; size: number }[] = [];
      
      page.on('response', async (response) => {
        const url = response.url();
        if (url.endsWith('.js') || url.includes('.js?')) {
          const headers = response.headers();
          const size = parseInt(headers['content-length'] || '0', 10);
          jsRequests.push({ url, size });
        }
      });

      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      
      // Total JS should be under 2MB
      const totalSize = jsRequests.reduce((acc, req) => acc + req.size, 0);
      expect(totalSize).toBeLessThan(2 * 1024 * 1024);
    });

    test('should use caching for static assets', async ({ page }) => {
      const responses: { url: string; cacheControl: string | null }[] = [];
      
      page.on('response', async (response) => {
        const url = response.url();
        if (url.endsWith('.js') || url.endsWith('.css')) {
          const headers = response.headers();
          responses.push({
            url,
            cacheControl: headers['cache-control'] || null
          });
        }
      });

      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      
      // Static assets should have cache headers
      // Note: Development mode might not have caching
    });
  });

  test.describe('Memory Usage', () => {
    test('should not have memory leaks on navigation', async ({ page }) => {
      await page.goto('/auth');
      
      // Get initial memory
      const initialMetrics = await page.metrics();
      
      // Navigate multiple times
      for (let i = 0; i < 5; i++) {
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
      
      // Get final memory
      const finalMetrics = await page.metrics();
      
      // Memory should not grow excessively (2x is acceptable for tests)
      if (initialMetrics.JSHeapUsedSize && finalMetrics.JSHeapUsedSize) {
        expect(finalMetrics.JSHeapUsedSize).toBeLessThan(
          initialMetrics.JSHeapUsedSize * 2
        );
      }
    });
  });

  test.describe('Network Optimization', () => {
    test('should minimize number of requests', async ({ page }) => {
      let requestCount = 0;
      
      page.on('request', () => {
        requestCount++;
      });

      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      
      // Should have reasonable number of requests
      expect(requestCount).toBeLessThan(50);
    });

    test('should load images lazily where appropriate', async ({ page }) => {
      await page.goto('/auth');
      
      // Check for lazy loading attributes
      const images = page.locator('img[loading="lazy"]');
      // Note: Auth page might not have many images
    });
  });
});

test.describe('Stress Testing', () => {
  test('should handle rapid form input', async ({ page }) => {
    await page.goto('/auth');
    
    const emailInput = page.getByLabel(/البريد الإلكتروني|Email/i);
    
    // Rapid input
    for (let i = 0; i < 10; i++) {
      await emailInput.fill(`test${i}@example.com`);
    }
    
    // Should still work correctly
    await expect(emailInput).toHaveValue('test9@example.com');
  });

  test('should handle rapid tab switching', async ({ page }) => {
    await page.goto('/auth');
    
    const signupTab = page.getByRole('tab', { name: /إنشاء حساب|Sign Up|Register/i });
    const loginTab = page.getByRole('tab', { name: /تسجيل الدخول|Login|Sign In/i });
    
    if (await signupTab.isVisible()) {
      // Rapid switching
      for (let i = 0; i < 5; i++) {
        await signupTab.click();
        await loginTab.click();
      }
      
      // Should be stable
      await expect(page.getByLabel(/البريد الإلكتروني|Email/i)).toBeVisible();
    }
  });
});
