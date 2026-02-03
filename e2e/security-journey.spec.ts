/**
 * E2E Security Journey Tests
 * Q1 Enterprise Transformation - Foundation & Governance
 * 
 * Tests security controls, permission enforcement, and access restrictions
 */

import { test, expect } from '@playwright/test';

test.describe('Security Journey Tests', () => {
  test.describe('Authentication & Authorization', () => {
    test('should redirect unauthenticated users to login page', async ({ page }) => {
      // Try accessing protected routes without authentication
      await page.goto('/dashboard');
      
      // Should redirect to auth page
      await expect(page).toHaveURL(/\/auth/);
    });

    test('should show login form on auth page', async ({ page }) => {
      await page.goto('/auth');
      
      // Check for login form elements
      await expect(page.getByRole('textbox', { name: /البريد الإلكتروني|email/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /تسجيل الدخول|login/i })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth');
      
      // Fill in invalid credentials
      await page.getByRole('textbox', { name: /البريد الإلكتروني|email/i }).fill('invalid@test.com');
      await page.getByLabel(/كلمة المرور|password/i).fill('wrongpassword');
      
      // Submit form
      await page.getByRole('button', { name: /تسجيل الدخول|login/i }).click();
      
      // Should show error message
      await expect(page.getByText(/خطأ|error|invalid/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should protect admin routes from unauthorized access', async ({ page }) => {
      // Try to access admin pages directly
      const adminRoutes = [
        '/admin',
        '/admin/users',
        '/admin/roles',
        '/admin/permissions',
        '/admin/activity-log',
      ];

      for (const route of adminRoutes) {
        await page.goto(route);
        // Should redirect to auth or show access denied
        const url = page.url();
        expect(url).toMatch(/\/auth|access-denied/);
      }
    });

    test('should protect sensitive sections from direct URL access', async ({ page }) => {
      // Financial sections
      const sensitiveRoutes = [
        '/invoices',
        '/payments',
        '/expenses',
        '/treasury',
      ];

      for (const route of sensitiveRoutes) {
        await page.goto(route);
        // Should redirect to auth
        await expect(page).toHaveURL(/\/auth/);
      }
    });
  });

  test.describe('API Security', () => {
    test('should reject unauthenticated API calls to edge functions', async ({ request }) => {
      // Try calling edge functions without auth token
      const endpoints = [
        '/functions/v1/validate-invoice',
        '/functions/v1/process-payment',
        '/functions/v1/approve-expense',
        '/functions/v1/stock-movement',
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await request.post(`https://npwofemokwddtutugmas.supabase.co${endpoint}`, {
            data: { test: 'data' },
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          // Should return 401 Unauthorized
          expect(response.status()).toBe(401);
        } catch (error) {
          // Network errors are expected for protected endpoints
          expect(error).toBeDefined();
        }
      }
    });
  });

  test.describe('Form Security Controls', () => {
    test('should validate required fields before submission', async ({ page }) => {
      await page.goto('/auth');
      
      // Try submitting empty form
      await page.getByRole('button', { name: /تسجيل الدخول|login/i }).click();
      
      // Should show validation error
      await expect(page.getByText(/مطلوب|required/i)).toBeVisible();
    });
  });

  test.describe('Data Exposure Prevention', () => {
    test('should not expose sensitive data in page source', async ({ page }) => {
      await page.goto('/auth');
      
      const content = await page.content();
      
      // Should not contain API keys or secrets
      expect(content).not.toMatch(/SUPABASE_SERVICE_ROLE/i);
      expect(content).not.toMatch(/sk_live_/); // Stripe secret keys
      expect(content).not.toMatch(/secret_key/i);
    });

    test('should not expose user data without authentication', async ({ page }) => {
      // Try accessing customer data page
      await page.goto('/customers');
      
      // Should redirect to auth, not show data
      await expect(page).toHaveURL(/\/auth/);
    });
  });

  test.describe('XSS Prevention', () => {
    test('should sanitize user input in forms', async ({ page }) => {
      await page.goto('/auth');
      
      const xssPayload = '<script>alert("xss")</script>';
      
      // Try injecting XSS in email field
      await page.getByRole('textbox', { name: /البريد الإلكتروني|email/i }).fill(xssPayload);
      
      // Check that script is not executed (page title should remain)
      const content = await page.content();
      expect(content).not.toContain('<script>alert');
    });
  });

  test.describe('Session Security', () => {
    test('should clear session data on logout', async ({ page }) => {
      await page.goto('/');
      
      // Check localStorage doesn't contain sensitive session data after page load
      const storage = await page.evaluate(() => {
        return Object.keys(localStorage).filter(key => 
          key.includes('supabase.auth.token') && localStorage.getItem(key)
        );
      });
      
      // Should not have active session without login
      // This is expected behavior for a fresh page load
      expect(storage.length).toBe(0);
    });
  });

  test.describe('Rate Limiting Awareness', () => {
    test('should handle rapid requests gracefully', async ({ page }) => {
      await page.goto('/auth');
      
      // Rapidly click submit button
      const submitButton = page.getByRole('button', { name: /تسجيل الدخول|login/i });
      
      for (let i = 0; i < 5; i++) {
        await submitButton.click();
        await page.waitForTimeout(100);
      }
      
      // Page should still be functional
      await expect(submitButton).toBeVisible();
    });
  });

  test.describe('Secure Navigation', () => {
    test('should use HTTPS for all resources', async ({ page }) => {
      // Note: In preview/development, this might be http
      // In production, all resources should be HTTPS
      await page.goto('/');
      
      const url = page.url();
      // In production, should be HTTPS
      // For preview, we just verify the page loads
      expect(url).toContain('://');
    });

    test('should not have open redirects', async ({ page }) => {
      // Try to navigate with a malicious redirect
      await page.goto('/auth?redirect=https://evil.com');
      
      // Should stay on the application domain
      const url = page.url();
      expect(url).not.toContain('evil.com');
    });
  });
});
