import { test, expect } from '@playwright/test';

test.describe('Modern UI Components and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should capture all major UI components', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Capture homepage/landing
    await page.screenshot({ 
      path: 'test-results/components-01-homepage.png',
      fullPage: true 
    });

    // Navigate to auth and capture
    await page.goto('/auth');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/components-02-auth-form.png',
      fullPage: true 
    });

    // Try to navigate to dashboard (might redirect to auth)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/components-03-dashboard-or-redirect.png',
      fullPage: true 
    });

    // Try to navigate to chat
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/components-04-chat-or-redirect.png',
      fullPage: true 
    });
  });

  test('should test form interactions and validation states', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    const emailField = page.locator('input[type="email"]');
    const passwordField = page.locator('input[type="password"]');
    
    // Empty state
    await page.screenshot({ 
      path: 'test-results/validation-01-empty-form.png',
      fullPage: false 
    });

    // Focus on email field
    await emailField.focus();
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'test-results/validation-02-email-focused.png',
      fullPage: false 
    });

    // Invalid email
    await emailField.fill('invalid');
    await emailField.blur();
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'test-results/validation-03-invalid-email.png',
      fullPage: false 
    });

    // Valid email
    await emailField.fill('test@example.com');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'test-results/validation-04-valid-email.png',
      fullPage: false 
    });

    // Focus on password field
    await passwordField.focus();
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'test-results/validation-05-password-focused.png',
      fullPage: false 
    });

    // Weak password
    await passwordField.fill('123');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'test-results/validation-06-weak-password.png',
      fullPage: false 
    });

    // Strong password
    await passwordField.fill('StrongPassword123!');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'test-results/validation-07-strong-password.png',
      fullPage: false 
    });

    // Hover over submit button
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.hover();
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'test-results/validation-08-button-hover.png',
      fullPage: false 
    });
  });

  test('should capture glassmorphism and visual effects', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForSelector('.glassmorphism, [class*="glass"], [class*="blur"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Capture glassmorphism effects
    await page.screenshot({ 
      path: 'test-results/effects-01-glassmorphism.png',
      fullPage: true 
    });

    // Check for animated elements
    const animatedElements = await page.locator('[class*="animate"], [class*="motion"], [class*="transition"]').count();
    console.log(`Found ${animatedElements} animated elements`);

    // Capture any floating elements or orbs
    const floatingElements = await page.locator('[class*="float"], [class*="orb"], [class*="particle"]').count();
    console.log(`Found ${floatingElements} floating elements`);

    if (floatingElements > 0) {
      await page.screenshot({ 
        path: 'test-results/effects-02-floating-elements.png',
        fullPage: true 
      });
    }

    // Test hover effects on interactive elements
    const interactiveElements = page.locator('button, input, a, [class*="hover"]');
    const count = await interactiveElements.count();
    
    if (count > 0) {
      await interactiveElements.first().hover();
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: 'test-results/effects-03-hover-states.png',
        fullPage: false 
      });
    }
  });

  test('should capture error states and feedback', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/errors-01-empty-form-submission.png',
      fullPage: false 
    });

    // Try with invalid credentials
    await page.locator('input[type="email"]').fill('invalid@test.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await submitButton.click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/errors-02-invalid-credentials.png',
      fullPage: false 
    });

    // Check for error messages
    const errorElements = page.locator('[class*="error"], [class*="danger"], .text-red, [role="alert"]');
    const errorCount = await errorElements.count();
    
    if (errorCount > 0) {
      await page.screenshot({ 
        path: 'test-results/errors-03-error-messages.png',
        fullPage: false 
      });
    }
  });

  test('should test keyboard navigation and accessibility', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'test-results/accessibility-01-tab-focus.png',
      fullPage: false 
    });

    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'test-results/accessibility-02-next-tab-focus.png',
      fullPage: false 
    });

    // Test Enter key on button
    await page.keyboard.press('Tab'); // Move to submit button
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'test-results/accessibility-03-button-focus.png',
      fullPage: false 
    });

    // Check for ARIA labels and accessibility features
    const ariaElements = await page.locator('[aria-label], [aria-describedby], [role]').count();
    console.log(`Found ${ariaElements} elements with ARIA attributes`);
  });

  test('should capture print and export views', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Emulate print media
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/print-01-auth-page.png',
      fullPage: true 
    });

    // Reset to screen media
    await page.emulateMedia({ media: 'screen' });
    
    // Test high DPI/retina display
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ 
      path: 'test-results/display-01-high-dpi.png',
      fullPage: false,
      clip: { x: 0, y: 0, width: 1920, height: 1080 }
    });
  });

  test('should capture performance and loading states', async ({ page }) => {
    // Monitor network requests
    const responses: any[] = [];
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        timing: response.timing()
      });
    });

    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    
    // Capture during initial load
    await page.screenshot({ 
      path: 'test-results/performance-01-initial-load.png',
      fullPage: false 
    });

    await page.waitForLoadState('networkidle');
    
    // Final loaded state
    await page.screenshot({ 
      path: 'test-results/performance-02-fully-loaded.png',
      fullPage: true 
    });

    // Log network performance
    console.log(`Captured ${responses.length} network requests`);
    const slowRequests = responses.filter(r => r.timing && r.timing.responseEnd > 1000);
    console.log(`Found ${slowRequests.length} slow requests (>1s)`);
  });
});
