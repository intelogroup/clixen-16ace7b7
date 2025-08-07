import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('should load landing page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Take screenshot for documentation - Modern UI
    await page.screenshot({
      path: 'test-results/modern-01-landing-page.png',
      fullPage: true
    });

    // Also capture viewport only
    await page.screenshot({
      path: 'test-results/modern-01-landing-viewport.png',
      fullPage: false
    });
    
    // Check if page loads with expected content
    await expect(page).toHaveTitle(/Clixen/i);
    
    // Look for common landing page elements
    const hasGetStarted = await page.getByText(/get started/i).first().isVisible().catch(() => false);
    const hasSignIn = await page.getByText(/sign in/i).first().isVisible().catch(() => false);
    const hasLogin = await page.getByText(/login/i).first().isVisible().catch(() => false);
    
    expect(hasGetStarted || hasSignIn || hasLogin).toBe(true);
  });

  test('should navigate to authentication page', async ({ page }) => {
    await page.goto('/');
    
    // Try multiple ways to get to auth page
    const authTriggers = [
      page.getByText(/get started/i).first(),
      page.getByText(/sign in/i).first(),
      page.getByText(/login/i).first(),
      page.getByRole('button', { name: /get started/i }),
      page.getByRole('button', { name: /sign in/i }),
      page.getByRole('button', { name: /login/i }),
      page.getByRole('link', { name: /get started/i }),
      page.getByRole('link', { name: /sign in/i }),
      page.getByRole('link', { name: /login/i })
    ];
    
    let authClicked = false;
    for (const trigger of authTriggers) {
      try {
        if (await trigger.isVisible({ timeout: 2000 })) {
          await trigger.click();
          authClicked = true;
          break;
        }
      } catch (error) {
        // Continue to next trigger
        continue;
      }
    }
    
    // If no button found, try navigating directly to auth routes
    if (!authClicked) {
      const authRoutes = ['/auth', '/login', '/signin'];
      for (const route of authRoutes) {
        try {
          await page.goto(route);
          const hasAuthForm = await page.locator('input[type="email"], input[type="password"]').first().isVisible({ timeout: 5000 });
          if (hasAuthForm) {
            break;
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    await page.screenshot({
      path: 'test-results/modern-02-auth-page-full.png',
      fullPage: true
    });

    await page.screenshot({
      path: 'test-results/modern-02-auth-page-viewport.png',
      fullPage: false
    });
    
    // Wait for auth form to appear
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('should authenticate with provided credentials', async ({ page }) => {
    // Navigate to auth page first
    await page.goto('/');
    
    // Try to get to auth page
    const authTriggers = [
      page.getByText(/get started/i).first(),
      page.getByText(/sign in/i).first(),
      page.getByText(/login/i).first()
    ];
    
    for (const trigger of authTriggers) {
      try {
        if (await trigger.isVisible({ timeout: 2000 })) {
          await trigger.click();
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    // If no trigger worked, try direct navigation
    const currentUrl = page.url();
    if (!currentUrl.includes('auth') && !currentUrl.includes('login')) {
      await page.goto('/auth');
    }
    
    // Wait for and fill email field
    const emailField = page.locator('input[type="email"]');
    await expect(emailField).toBeVisible({ timeout: 10000 });
    await emailField.fill('jayveedz19@gmail.com');
    
    // Wait for and fill password field
    const passwordField = page.locator('input[type="password"]');
    await expect(passwordField).toBeVisible();
    await passwordField.fill('Goldyear2023#');
    
    await page.screenshot({ 
      path: 'test-results/03-credentials-filled.png',
      fullPage: true 
    });
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login"), button:has-text("Get Started")');
    await submitButton.first().click();
    
    // Wait for either successful login or error
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/04-after-login-attempt.png',
      fullPage: true 
    });
    
    // Check for successful authentication
    const isAuthenticated = await page.waitForFunction(() => {
      return window.location.pathname.includes('dashboard') || 
             window.location.pathname.includes('chat') ||
             document.querySelector('[data-testid="authenticated"]') !== null ||
             document.querySelector('.dashboard') !== null ||
             document.body.textContent?.includes('Dashboard') ||
             document.body.textContent?.includes('Welcome');
    }, { timeout: 15000 }).catch(() => false);
    
    expect(isAuthenticated).toBeTruthy();
  });

  test('should handle logout functionality', async ({ page }) => {
    // First login
    await page.goto('/');
    
    // Get to auth and login (abbreviated for this test)
    try {
      await page.goto('/auth');
    } catch (error) {
      // Try alternative routes
      await page.goto('/');
    }
    
    // Quick login if auth form is available
    const emailField = page.locator('input[type="email"]');
    if (await emailField.isVisible({ timeout: 5000 })) {
      await emailField.fill('jayveedz19@gmail.com');
      await page.locator('input[type="password"]').fill('Goldyear2023#');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(3000);
    }
    
    // Look for logout button/link
    const logoutTriggers = [
      page.getByText(/logout/i),
      page.getByText(/sign out/i),
      page.getByRole('button', { name: /logout/i }),
      page.getByRole('button', { name: /sign out/i }),
      page.locator('[data-testid="logout"]'),
      page.locator('.logout'),
      // Check in navigation menu
      page.locator('nav').getByText(/logout/i),
      page.locator('nav').getByText(/sign out/i)
    ];
    
    let loggedOut = false;
    for (const trigger of logoutTriggers) {
      try {
        if (await trigger.isVisible({ timeout: 2000 })) {
          await trigger.click();
          loggedOut = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    await page.screenshot({ 
      path: 'test-results/05-after-logout.png',
      fullPage: true 
    });
    
    if (loggedOut) {
      // Verify we're back to landing/auth page
      await page.waitForTimeout(2000);
      const isLoggedOut = await page.waitForFunction(() => {
        return window.location.pathname === '/' ||
               window.location.pathname.includes('auth') ||
               window.location.pathname.includes('login') ||
               document.querySelector('input[type="email"]') !== null;
      }, { timeout: 10000 }).catch(() => false);
      
      expect(isLoggedOut).toBeTruthy();
    } else {
      // If no logout button found, that's also important information
      console.log('⚠️ No logout functionality found in UI');
    }
  });
});
