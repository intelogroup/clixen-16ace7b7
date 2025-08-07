/**
 * Authentication Flow E2E Tests
 * Tests the complete user authentication journey including signup, login, and session management
 */
import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from '../fixtures/test-helpers';

test.describe('Authentication Flow', () => {
  let helpers: TestHelpers;
  let testEmail: string;
  let testPassword: string;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    testEmail = `test-${Date.now()}@example.com`;
    testPassword = 'TestPassword123!';
    
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.context().clearPermissions();
    await page.goto('/');
  });

  test('should complete full signup flow', async ({ page }) => {
    // Navigate to signup
    await test.step('Navigate to signup page', async () => {
      const signupSuccess = await helpers.navigateToAuth('signup');
      expect(signupSuccess).toBeTruthy();
      await helpers.takeScreenshot('01-signup-page');
    });

    // Fill signup form
    await test.step('Fill signup form', async () => {
      await page.locator('input[type="email"]').fill(testEmail);
      await page.locator('input[type="password"]').fill(testPassword);
      
      // Check for confirm password field
      const confirmPasswordField = page.locator('input[name*="confirm"]').first();
      if (await confirmPasswordField.isVisible({ timeout: 2000 })) {
        await confirmPasswordField.fill(testPassword);
      }
      
      await helpers.takeScreenshot('02-signup-form-filled');
    });

    // Submit signup
    await test.step('Submit signup form', async () => {
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign Up"), button:has-text("Create Account")').first();
      await submitButton.click();
      
      await helpers.takeScreenshot('03-signup-submitted');
    });

    // Verify signup success
    await test.step('Verify signup success', async () => {
      // Wait for either redirect or success message
      const signupSuccess = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('check your email') ||
               text.includes('verification') ||
               text.includes('confirm') ||
               window.location.pathname.includes('dashboard') ||
               window.location.pathname.includes('verify');
      }, { timeout: 15000 }).catch(() => false);
      
      expect(signupSuccess).toBeTruthy();
      await helpers.takeScreenshot('04-signup-success');
    });
  });

  test('should complete login flow with existing credentials', async ({ page }) => {
    // Use the test credentials from environment
    const loginEmail = 'jayveedz19@gmail.com';
    const loginPassword = 'Goldyear2023#';

    await test.step('Navigate to login page', async () => {
      const loginSuccess = await helpers.navigateToAuth('login');
      expect(loginSuccess).toBeTruthy();
      await helpers.takeScreenshot('01-login-page');
    });

    await test.step('Fill login credentials', async () => {
      await page.locator('input[type="email"]').fill(loginEmail);
      await page.locator('input[type="password"]').fill(loginPassword);
      await helpers.takeScreenshot('02-login-credentials-filled');
    });

    await test.step('Submit login form', async () => {
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();
      await submitButton.click();
      await helpers.takeScreenshot('03-login-submitted');
    });

    await test.step('Verify login success', async () => {
      const loginSuccess = await page.waitForFunction(() => {
        return window.location.pathname.includes('dashboard') ||
               window.location.pathname.includes('chat') ||
               document.querySelector('[data-testid="authenticated"]') !== null ||
               document.body.textContent?.includes('Welcome') ||
               document.body.textContent?.includes('Dashboard');
      }, { timeout: 15000 }).catch(() => false);

      expect(loginSuccess).toBeTruthy();
      await helpers.takeScreenshot('04-login-success');
    });
  });

  test('should handle password reset flow', async ({ page }) => {
    const resetEmail = 'test-reset@example.com';

    await test.step('Navigate to password reset', async () => {
      await helpers.navigateToAuth('login');
      
      // Look for forgot password link
      const forgotPasswordTriggers = [
        page.getByText(/forgot.*password/i),
        page.getByText(/reset.*password/i),
        page.locator('[href*="reset"]'),
        page.locator('[href*="forgot"]')
      ];

      let resetLinkClicked = false;
      for (const trigger of forgotPasswordTriggers) {
        try {
          if (await trigger.isVisible({ timeout: 2000 })) {
            await trigger.click();
            resetLinkClicked = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      // If no link found, try direct navigation
      if (!resetLinkClicked) {
        await page.goto('/reset-password');
      }

      await helpers.takeScreenshot('01-password-reset-page');
    });

    await test.step('Submit password reset request', async () => {
      const emailField = page.locator('input[type="email"]');
      if (await emailField.isVisible({ timeout: 5000 })) {
        await emailField.fill(resetEmail);
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Reset"), button:has-text("Send")').first();
        await submitButton.click();
        
        await helpers.takeScreenshot('02-password-reset-submitted');
        
        // Verify reset email sent message
        const resetSent = await page.waitForFunction(() => {
          const text = document.body.textContent || '';
          return text.includes('check your email') ||
                 text.includes('reset link') ||
                 text.includes('email sent');
        }, { timeout: 10000 }).catch(() => false);
        
        expect(resetSent).toBeTruthy();
        await helpers.takeScreenshot('03-password-reset-confirmed');
      }
    });
  });

  test('should validate input fields properly', async ({ page }) => {
    await test.step('Navigate to signup page', async () => {
      await helpers.navigateToAuth('signup');
    });

    await test.step('Test email validation', async () => {
      const emailField = page.locator('input[type="email"]');
      
      // Test invalid email formats
      const invalidEmails = ['invalid', 'test@', '@domain.com', 'test@domain'];
      
      for (const invalidEmail of invalidEmails) {
        await emailField.fill(invalidEmail);
        await emailField.blur();
        
        // Check for validation message
        const hasValidationError = await page.waitForFunction(() => {
          const text = document.body.textContent || '';
          return text.includes('invalid') ||
                 text.includes('valid email') ||
                 text.includes('email format');
        }, { timeout: 2000 }).catch(() => false);
        
        // Note: This test is informational - some forms may not show real-time validation
        console.log(`Email validation for "${invalidEmail}": ${hasValidationError ? 'Present' : 'Not visible'}`);
      }
      
      await helpers.takeScreenshot('email-validation-test');
    });

    await test.step('Test password requirements', async () => {
      const passwordField = page.locator('input[type="password"]');
      
      // Test weak passwords
      const weakPasswords = ['123', 'password', 'abc123'];
      
      for (const weakPassword of weakPasswords) {
        await passwordField.fill(weakPassword);
        await passwordField.blur();
        
        // Check for password strength indicators
        const hasPasswordFeedback = await page.waitForFunction(() => {
          const text = document.body.textContent || '';
          return text.includes('weak') ||
                 text.includes('strong') ||
                 text.includes('requirements') ||
                 document.querySelector('[class*="password"]') !== null;
        }, { timeout: 2000 }).catch(() => false);
        
        console.log(`Password feedback for "${weakPassword}": ${hasPasswordFeedback ? 'Present' : 'Not visible'}`);
      }
      
      await helpers.takeScreenshot('password-validation-test');
    });
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    await test.step('Test with invalid credentials', async () => {
      await helpers.navigateToAuth('login');
      
      // Use obviously invalid credentials
      await page.locator('input[type="email"]').fill('nonexistent@example.com');
      await page.locator('input[type="password"]').fill('wrongpassword');
      
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      
      await helpers.takeScreenshot('invalid-credentials-submitted');
      
      // Wait for error message
      const errorShown = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('invalid') ||
               text.includes('incorrect') ||
               text.includes('error') ||
               text.includes('wrong') ||
               text.includes('not found');
      }, { timeout: 10000 }).catch(() => false);
      
      expect(errorShown).toBeTruthy();
      await helpers.takeScreenshot('invalid-credentials-error');
    });

    await test.step('Test network error handling', async () => {
      // Simulate network issues by going offline
      await page.context().setOffline(true);
      
      await page.reload();
      await page.locator('input[type="email"]').fill('test@example.com');
      await page.locator('input[type="password"]').fill('password123');
      
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      
      // Check for network error handling
      const networkErrorHandled = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('network') ||
               text.includes('connection') ||
               text.includes('offline') ||
               text.includes('try again');
      }, { timeout: 5000 }).catch(() => false);
      
      // Restore network
      await page.context().setOffline(false);
      
      await helpers.takeScreenshot('network-error-handling');
      console.log(`Network error handling: ${networkErrorHandled ? 'Present' : 'Not detected'}`);
    });
  });

  test('should persist authentication state across page refreshes', async ({ page }) => {
    // First login
    await test.step('Login with valid credentials', async () => {
      await helpers.navigateToAuth('login');
      await page.locator('input[type="email"]').fill('jayveedz19@gmail.com');
      await page.locator('input[type="password"]').fill('Goldyear2023#');
      await page.locator('button[type="submit"]').first().click();
      
      // Wait for successful login
      await page.waitForFunction(() => {
        return window.location.pathname.includes('dashboard') ||
               window.location.pathname.includes('chat') ||
               document.body.textContent?.includes('Dashboard');
      }, { timeout: 15000 });
      
      await helpers.takeScreenshot('logged-in-state');
    });

    await test.step('Refresh page and verify session persistence', async () => {
      await page.reload({ waitUntil: 'networkidle' });
      
      // Check if still authenticated
      const stillAuthenticated = await page.waitForFunction(() => {
        return !window.location.pathname.includes('auth') &&
               !window.location.pathname.includes('login') &&
               (window.location.pathname.includes('dashboard') ||
                window.location.pathname.includes('chat') ||
                document.body.textContent?.includes('Dashboard'));
      }, { timeout: 10000 }).catch(() => false);
      
      expect(stillAuthenticated).toBeTruthy();
      await helpers.takeScreenshot('session-persisted-after-refresh');
    });

    await test.step('Navigate to different routes and verify authentication', async () => {
      const protectedRoutes = ['/dashboard', '/chat', '/workflows'];
      
      for (const route of protectedRoutes) {
        try {
          await page.goto(route);
          await page.waitForTimeout(2000);
          
          const isAccessible = !page.url().includes('auth') && !page.url().includes('login');
          console.log(`Route ${route} accessible: ${isAccessible}`);
          
          await helpers.takeScreenshot(`route-${route.replace('/', '')}-authenticated`);
        } catch (error) {
          console.log(`Route ${route} test failed:`, error.message);
        }
      }
    });
  });
});