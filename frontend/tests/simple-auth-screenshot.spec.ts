import { test, expect } from '@playwright/test';

test('capture modern UI screenshots with authentication', async ({ page }) => {
  // Clear any existing auth state
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Navigate to homepage
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ 
    path: 'test-results/screenshot-01-homepage.png',
    fullPage: true 
  });

  // Navigate to auth page
  await page.goto('/auth');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.waitForTimeout(2000);
  
  await page.screenshot({ 
    path: 'test-results/screenshot-02-auth-page.png',
    fullPage: true 
  });

  // Fill authentication form
  const emailField = page.locator('input[type="email"]');
  const passwordField = page.locator('input[type="password"]');
  
  await emailField.fill('jayveedz19@gmail.com');
  await passwordField.fill('Goldyear2023#');
  
  await page.screenshot({ 
    path: 'test-results/screenshot-03-form-filled.png',
    fullPage: false 
  });

  // Submit the form
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();
  
  // Wait for authentication response
  await page.waitForTimeout(5000);
  
  await page.screenshot({ 
    path: 'test-results/screenshot-04-after-login.png',
    fullPage: true 
  });

  // Check current URL and capture appropriate page
  const currentUrl = page.url();
  console.log('Current URL after login:', currentUrl);
  
  if (currentUrl.includes('dashboard') || currentUrl.includes('chat')) {
    // Successfully authenticated - capture dashboard
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/screenshot-05-dashboard.png',
      fullPage: true 
    });
  }

  // Test mobile responsiveness
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1000);
  
  await page.screenshot({ 
    path: 'test-results/screenshot-06-mobile-view.png',
    fullPage: true 
  });
});

test('capture chat interface if accessible', async ({ page }) => {
  await page.goto('/chat');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ 
    path: 'test-results/screenshot-07-chat-interface.png',
    fullPage: true 
  });
  
  // If there's a chat input, test it
  const chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
  
  if (await chatInput.isVisible({ timeout: 5000 })) {
    await chatInput.fill('Hello, this is a test message!');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/screenshot-08-chat-with-message.png',
      fullPage: false 
    });
  }
});
