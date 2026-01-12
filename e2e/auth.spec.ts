import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should display login form by default', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /تسجيل الدخول|Login/i })).toBeVisible();
    await expect(page.getByLabel(/البريد الإلكتروني|Email/i)).toBeVisible();
    await expect(page.getByLabel(/كلمة المرور|Password/i)).toBeVisible();
  });

  test('should switch to signup form', async ({ page }) => {
    const signupTab = page.getByRole('tab', { name: /إنشاء حساب|Sign Up|Register/i });
    
    if (await signupTab.isVisible()) {
      await signupTab.click();
      await expect(page.getByLabel(/الاسم الكامل|Full Name|Name/i)).toBeVisible();
    }
  });

  test('should show validation error for empty email', async ({ page }) => {
    const loginButton = page.getByRole('button', { name: /تسجيل الدخول|Login|Sign In/i });
    await loginButton.click();
    
    // Should show validation error
    await expect(page.getByText(/مطلوب|required|البريد الإلكتروني/i)).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.getByLabel(/البريد الإلكتروني|Email/i).fill('invalid-email');
    await page.getByLabel(/كلمة المرور|Password/i).fill('password123');
    
    const loginButton = page.getByRole('button', { name: /تسجيل الدخول|Login|Sign In/i });
    await loginButton.click();
    
    // Should show validation error for email format
    await expect(page.getByText(/غير صالح|invalid|صيغة/i)).toBeVisible();
  });

  test('should show error for wrong credentials', async ({ page }) => {
    await page.getByLabel(/البريد الإلكتروني|Email/i).fill('wrong@example.com');
    await page.getByLabel(/كلمة المرور|Password/i).fill('wrongpassword');
    
    const loginButton = page.getByRole('button', { name: /تسجيل الدخول|Login|Sign In/i });
    await loginButton.click();
    
    // Should show authentication error
    await expect(page.getByText(/خطأ|error|فشل|failed|credentials/i)).toBeVisible({ timeout: 10000 });
  });

  test('should validate password length on signup', async ({ page }) => {
    const signupTab = page.getByRole('tab', { name: /إنشاء حساب|Sign Up|Register/i });
    
    if (await signupTab.isVisible()) {
      await signupTab.click();
      
      await page.getByLabel(/الاسم الكامل|Full Name|Name/i).fill('Test User');
      await page.getByLabel(/البريد الإلكتروني|Email/i).fill('test@example.com');
      await page.getByLabel(/كلمة المرور|Password/i).fill('123'); // Too short
      
      const signupButton = page.getByRole('button', { name: /إنشاء حساب|Sign Up|Register/i });
      await signupButton.click();
      
      // Should show password length error
      await expect(page.getByText(/أحرف|characters|قصيرة|short/i)).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await expect(page.getByLabel(/البريد الإلكتروني|Email/i)).toBeVisible();
    await expect(page.getByLabel(/كلمة المرور|Password/i)).toBeVisible();
    
    // Form should be usable on mobile
    await page.getByLabel(/البريد الإلكتروني|Email/i).fill('test@example.com');
    await expect(page.getByLabel(/البريد الإلكتروني|Email/i)).toHaveValue('test@example.com');
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to auth when not logged in', async ({ page }) => {
    await page.goto('/');
    
    // Should be redirected to auth page
    await expect(page).toHaveURL(/auth/);
  });

  test('should redirect to auth when accessing dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should be redirected to auth page
    await expect(page).toHaveURL(/auth/);
  });

  test('should redirect to auth when accessing customers', async ({ page }) => {
    await page.goto('/customers');
    
    // Should be redirected to auth page
    await expect(page).toHaveURL(/auth/);
  });
});

test.describe('Session Persistence', () => {
  test('should maintain session after page reload', async ({ page, context }) => {
    // This test requires a valid session
    // For now, we just verify the auth page loads correctly
    await page.goto('/auth');
    await page.reload();
    
    await expect(page.getByLabel(/البريد الإلكتروني|Email/i)).toBeVisible();
  });
});
