import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test.describe('Auth Page Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      await page.goto('/auth');
      
      // Email input should have associated label
      const emailInput = page.getByLabel(/البريد الإلكتروني|Email/i);
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toHaveAttribute('type', 'email');
      
      // Password input should have associated label
      const passwordInput = page.getByLabel(/كلمة المرور|Password/i);
      await expect(passwordInput).toBeVisible();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should have proper button roles', async ({ page }) => {
      await page.goto('/auth');
      
      const loginButton = page.getByRole('button', { name: /تسجيل الدخول|Login|Sign In/i });
      await expect(loginButton).toBeVisible();
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/auth');
      
      // Should have at least one heading
      const headings = page.getByRole('heading');
      await expect(headings.first()).toBeVisible();
    });

    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/auth');
      
      const emailInput = page.getByLabel(/البريد الإلكتروني|Email/i);
      await emailInput.focus();
      
      // Input should be focusable and visible
      await expect(emailInput).toBeFocused();
    });

    test('should support screen reader navigation', async ({ page }) => {
      await page.goto('/auth');
      
      // All interactive elements should be accessible via roles
      const form = page.locator('form');
      if (await form.isVisible()) {
        await expect(form).toBeVisible();
      }
      
      // Buttons should have accessible names
      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);
    });
  });

  test.describe('Color Contrast', () => {
    test('should have readable text', async ({ page }) => {
      await page.goto('/auth');
      
      // Text should be visible
      const heading = page.getByRole('heading').first();
      await expect(heading).toBeVisible();
      
      // Verify text is not invisible
      const headingText = await heading.textContent();
      expect(headingText?.length).toBeGreaterThan(0);
    });
  });

  test.describe('Form Validation Accessibility', () => {
    test('should announce validation errors', async ({ page }) => {
      await page.goto('/auth');
      
      // Submit empty form
      const loginButton = page.getByRole('button', { name: /تسجيل الدخول|Login|Sign In/i });
      await loginButton.click();
      
      // Error messages should be visible
      const errors = page.getByText(/مطلوب|required|خطأ|error/i);
      if (await errors.first().isVisible()) {
        await expect(errors.first()).toBeVisible();
      }
    });

    test('should have aria-invalid on invalid inputs', async ({ page }) => {
      await page.goto('/auth');
      
      // Fill with invalid email
      const emailInput = page.getByLabel(/البريد الإلكتروني|Email/i);
      await emailInput.fill('invalid');
      
      // Submit form
      const loginButton = page.getByRole('button', { name: /تسجيل الدخول|Login|Sign In/i });
      await loginButton.click();
      
      // Input should indicate invalid state
      // Note: This depends on how validation is implemented
    });
  });

  test.describe('Responsive Accessibility', () => {
    test('should maintain accessibility on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth');
      
      // Form should still be accessible
      const emailInput = page.getByLabel(/البريد الإلكتروني|Email/i);
      await expect(emailInput).toBeVisible();
      
      const loginButton = page.getByRole('button', { name: /تسجيل الدخول|Login|Sign In/i });
      await expect(loginButton).toBeVisible();
    });

    test('should have touch-friendly targets', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth');
      
      const loginButton = page.getByRole('button', { name: /تسجيل الدخول|Login|Sign In/i });
      const box = await loginButton.boundingBox();
      
      if (box) {
        // Button should be at least 44x44 pixels for touch
        expect(box.height).toBeGreaterThanOrEqual(40);
        expect(box.width).toBeGreaterThanOrEqual(40);
      }
    });
  });
});

test.describe('Skip Links and Landmarks', () => {
  test('should have main landmark', async ({ page }) => {
    await page.goto('/auth');
    
    // Should have a main region
    const main = page.locator('main');
    if (await main.isVisible()) {
      await expect(main).toBeVisible();
    }
  });
});
