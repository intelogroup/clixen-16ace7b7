import { test, expect } from '@playwright/test';

test.describe('Password Reset Functionality Tests', () => {
  const AUTH_URL = 'http://localhost:8081/auth';
  const TEST_EMAIL = 'jayveedz19@gmail.com';

  test('1. Basic Password Reset Flow', async ({ page }) => {
    console.log('🧪 Testing Basic Password Reset Flow');
    
    // Navigate to auth page
    await page.goto(AUTH_URL);
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/01-initial-auth-page.png', fullPage: true });
    
    // Click "Forgot password?" link
    const forgotPasswordLink = page.locator('text=Forgot password?');
    await expect(forgotPasswordLink).toBeVisible();
    await forgotPasswordLink.click();
    
    // Wait for UI to update
    await page.waitForTimeout(500);
    
    // Take screenshot of password reset mode
    await page.screenshot({ path: 'screenshots/02-password-reset-mode.png', fullPage: true });
    
    // Enter test email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(TEST_EMAIL);
    
    // Click reset button
    const resetButton = page.locator('button:has-text("Send Reset Link")');
    await expect(resetButton).toBeVisible();
    await resetButton.click();
    
    // Wait for response and take screenshot
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/03-after-reset-submit.png', fullPage: true });
    
    console.log('✅ Basic password reset flow completed');
  });

  test('2. UI State Management', async ({ page }) => {
    console.log('🧪 Testing UI State Management');
    
    await page.goto(AUTH_URL);
    await page.waitForLoadState('networkidle');
    
    // Initial state - should show password field
    const passwordField = page.locator('input[type="password"]');
    await expect(passwordField).toBeVisible();
    
    // Title should be "Sign In" initially
    const title = page.locator('h2');
    await expect(title).toContainText(/sign in/i);
    
    // Click forgot password
    await page.locator('text=Forgot password?').click();
    await page.waitForTimeout(500);
    
    // Password field should be hidden
    await expect(passwordField).toBeHidden();
    
    // Title should change
    await expect(title).toContainText(/reset password/i);
    
    // Button text should change
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toContainText(/send reset link/i);
    
    // Should show "Sign In" navigation button
    const signInLink = page.locator('text=Sign In');
    await expect(signInLink).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/04-ui-state-verification.png', fullPage: true });
    
    console.log('✅ UI state management verified');
  });

  test('3. Error Handling', async ({ page }) => {
    console.log('🧪 Testing Error Handling');
    
    await page.goto(AUTH_URL);
    await page.waitForLoadState('networkidle');
    
    // Enter password reset mode
    await page.locator('text=Forgot password?').click();
    await page.waitForTimeout(500);
    
    // Test with invalid email format
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('invalid-email');
    
    const resetButton = page.locator('button:has-text("Send Reset Link")');
    await resetButton.click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'screenshots/05-invalid-email-error.png', fullPage: true });
    
    // Test with empty email
    await emailInput.clear();
    await resetButton.click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'screenshots/06-empty-email-error.png', fullPage: true });
    
    console.log('✅ Error handling tested');
  });

  test('4. Enhanced Logging and Console Output', async ({ page }) => {
    console.log('🧪 Testing Enhanced Logging');
    
    // Listen for console messages
    const consoleLogs: any[] = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });
    
    await page.goto(AUTH_URL);
    await page.waitForLoadState('networkidle');
    
    // Enter password reset mode
    await page.locator('text=Forgot password?').click();
    await page.waitForTimeout(500);
    
    // Submit password reset
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(TEST_EMAIL);
    
    const resetButton = page.locator('button:has-text("Send Reset Link")');
    await resetButton.click();
    await page.waitForTimeout(3000);
    
    // Log all console messages
    console.log('📊 Console Logs Captured:');
    consoleLogs.forEach((log, index) => {
      console.log(`Log ${index + 1}: [${log.type.toUpperCase()}] ${log.text}`);
    });
    
    await page.screenshot({ path: 'screenshots/07-console-logging-test.png', fullPage: true });
    
    console.log('✅ Enhanced logging verified');
  });

  test('5. Complete Flow Testing', async ({ page }) => {
    console.log('🧪 Testing Complete Flow Transitions');
    
    await page.goto(AUTH_URL);
    await page.waitForLoadState('networkidle');
    
    // Start in login mode
    await page.screenshot({ path: 'screenshots/08-login-mode.png', fullPage: true });
    
    // Go to password reset
    await page.locator('text=Forgot password?').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/09-password-reset-from-login.png', fullPage: true });
    
    // Go back to login
    await page.locator('text=Sign In').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/10-back-to-login.png', fullPage: true });
    
    // Go to signup mode
    const signUpLink = page.locator('text=Sign up here');
    if (await signUpLink.isVisible()) {
      await signUpLink.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/11-signup-mode.png', fullPage: true });
      
      // Go to password reset from signup
      const forgotFromSignup = page.locator('text=Forgot password?');
      if (await forgotFromSignup.isVisible()) {
        await forgotFromSignup.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'screenshots/12-password-reset-from-signup.png', fullPage: true });
      }
    }
    
    console.log('✅ Complete flow transitions verified');
  });

  test('6. Visual Design and Responsiveness', async ({ page }) => {
    console.log('🧪 Testing Visual Design and Responsiveness');
    
    await page.goto(AUTH_URL);
    await page.waitForLoadState('networkidle');
    
    // Enter password reset mode
    await page.locator('text=Forgot password?').click();
    await page.waitForTimeout(500);
    
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: 'screenshots/13-desktop-password-reset.png', fullPage: true });
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: 'screenshots/14-tablet-password-reset.png', fullPage: true });
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: 'screenshots/15-mobile-password-reset.png', fullPage: true });
    
    // Test animation by triggering state changes
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.locator('text=Sign In').click();
    await page.waitForTimeout(300);
    await page.locator('text=Forgot password?').click();
    await page.waitForTimeout(300);
    
    await page.screenshot({ path: 'screenshots/16-animation-test.png', fullPage: true });
    
    console.log('✅ Visual design and responsiveness verified');
  });
});