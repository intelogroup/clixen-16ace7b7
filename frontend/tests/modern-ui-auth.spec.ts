import { test, expect } from '@playwright/test';

test.describe('Modern UI Authentication Flow with Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.context().clearPermissions();
    
    // Clear local storage for Supabase auth
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should capture modern landing page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to fully load with animations
    await page.waitForTimeout(3000);
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'test-results/modern-01-landing-page-full.png',
      fullPage: true 
    });
    
    // Take viewport screenshot
    await page.screenshot({ 
      path: 'test-results/modern-01-landing-page-viewport.png',
      fullPage: false 
    });
    
    // Check if page loads correctly
    await expect(page).toHaveTitle(/Clixen/i);
    
    // Wait for any animations to complete
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to and capture modern auth page', async ({ page }) => {
    await page.goto('/auth');
    
    // Wait for the modern auth page to load completely
    await page.waitForSelector('.glassmorphism', { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow animations to complete
    
    // Take screenshots of the modern auth interface
    await page.screenshot({ 
      path: 'test-results/modern-02-auth-page-full.png',
      fullPage: true 
    });
    
    await page.screenshot({ 
      path: 'test-results/modern-02-auth-page-viewport.png',
      fullPage: false 
    });
    
    // Verify modern auth elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Check for glassmorphism effects
    const glassmorphismElements = await page.locator('.glassmorphism').count();
    expect(glassmorphismElements).toBeGreaterThan(0);
  });

  test('should capture form interactions and validation', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    const emailField = page.locator('input[type="email"]');
    const passwordField = page.locator('input[type="password"]');
    
    // Test email validation
    await emailField.fill('invalid-email');
    await emailField.blur();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/modern-03-email-validation.png',
      fullPage: false 
    });
    
    // Fill valid email
    await emailField.fill('jayveedz19@gmail.com');
    await page.waitForTimeout(500);
    
    // Test password field interaction
    await passwordField.fill('weak');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/modern-04-password-weak.png',
      fullPage: false 
    });
    
    // Fill strong password
    await passwordField.fill('Goldyear2023#');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/modern-05-form-filled.png',
      fullPage: false 
    });
  });

  test('should authenticate and capture dashboard', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill authentication form
    await page.locator('input[type="email"]').fill('jayveedz19@gmail.com');
    await page.locator('input[type="password"]').fill('Goldyear2023#');
    
    await page.screenshot({ 
      path: 'test-results/modern-06-before-login.png',
      fullPage: false 
    });
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Wait for authentication to complete
    await page.waitForTimeout(5000);
    
    await page.screenshot({ 
      path: 'test-results/modern-07-after-login-attempt.png',
      fullPage: true 
    });
    
    // Check if we're redirected to dashboard or if auth was successful
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // Look for dashboard elements or continue in auth page
    const isDashboard = currentUrl.includes('dashboard') || currentUrl.includes('chat');
    
    if (isDashboard) {
      // We're in dashboard - take comprehensive screenshots
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000); // Allow animations to complete
      
      await page.screenshot({ 
        path: 'test-results/modern-08-dashboard-full.png',
        fullPage: true 
      });
      
      await page.screenshot({ 
        path: 'test-results/modern-08-dashboard-viewport.png',
        fullPage: false 
      });
      
      // Test responsive design on mobile
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'test-results/modern-09-dashboard-mobile.png',
        fullPage: true 
      });
      
    } else {
      // Still on auth page - check for errors or success messages
      await page.screenshot({ 
        path: 'test-results/modern-08-auth-result.png',
        fullPage: true 
      });
    }
  });

  test('should capture chat interface if accessible', async ({ page }) => {
    // Try to navigate directly to chat
    await page.goto('/chat');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    
    if (currentUrl.includes('chat')) {
      // We're in chat interface
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'test-results/modern-10-chat-interface.png',
        fullPage: true 
      });
      
      // Test chat input if available
      const chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[placeholder*="chat"], textarea[placeholder*="chat"]');
      
      if (await chatInput.isVisible({ timeout: 5000 })) {
        await chatInput.fill('Hello, this is a test message for the modern chat interface!');
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: 'test-results/modern-11-chat-with-message.png',
          fullPage: false 
        });
      }
    } else {
      // Redirected to auth - capture that
      await page.screenshot({ 
        path: 'test-results/modern-10-chat-redirect-to-auth.png',
        fullPage: true 
      });
    }
  });

  test('should test responsive design across breakpoints', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Desktop breakpoint (already tested above)
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'test-results/modern-12-responsive-desktop.png',
      fullPage: false 
    });
    
    // Tablet breakpoint
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'test-results/modern-13-responsive-tablet.png',
      fullPage: false 
    });
    
    // Mobile breakpoint
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'test-results/modern-14-responsive-mobile.png',
      fullPage: false 
    });
    
    // Large mobile breakpoint
    await page.setViewportSize({ width: 414, height: 896 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'test-results/modern-15-responsive-large-mobile.png',
      fullPage: false 
    });
  });

  test('should capture dark mode and theme variations', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Check if there's a theme toggle
    const themeToggle = page.locator('[data-testid="theme-toggle"], .theme-toggle, button:has-text("Dark"), button:has-text("Light")');
    
    if (await themeToggle.isVisible({ timeout: 3000 })) {
      // Capture current theme
      await page.screenshot({ 
        path: 'test-results/modern-16-theme-default.png',
        fullPage: false 
      });
      
      // Toggle theme
      await themeToggle.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'test-results/modern-17-theme-toggled.png',
        fullPage: false 
      });
    } else {
      // No theme toggle found - just capture current appearance
      await page.screenshot({ 
        path: 'test-results/modern-16-current-theme.png',
        fullPage: false 
      });
    }
  });

  test('should capture loading and animation states', async ({ page }) => {
    await page.goto('/auth');
    
    // Capture page during initial load
    await page.screenshot({ 
      path: 'test-results/modern-18-loading-state.png',
      fullPage: false 
    });
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill form and capture loading state during submission
    await page.locator('input[type="email"]').fill('jayveedz19@gmail.com');
    await page.locator('input[type="password"]').fill('Goldyear2023#');
    
    const submitButton = page.locator('button[type="submit"]');
    
    // Click and immediately capture loading state
    await submitButton.click();
    await page.waitForTimeout(500); // Capture mid-loading
    
    await page.screenshot({ 
      path: 'test-results/modern-19-form-submitting.png',
      fullPage: false 
    });
    
    // Wait a bit more and capture again
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/modern-20-post-submission.png',
      fullPage: false 
    });
  });
});
