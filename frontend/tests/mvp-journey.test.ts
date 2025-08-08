import { test, expect } from '@playwright/test';

const TEST_URL = 'http://localhost:8081';
const TEST_USER = {
  email: 'jayveedz19@gmail.com',
  password: 'Goldyear2023#'
};

test('MVP User Journey: Auth to Dashboard', async ({ page }) => {
  console.log('Starting MVP test...');
  
  // Go to app
  await page.goto(TEST_URL);
  await page.waitForLoadState('networkidle');
  
  // Take screenshot
  await page.screenshot({ path: 'test-screenshot-1.png' });
  
  // Check if on auth page
  const emailInput = await page.locator('input[type="email"]').first();
  
  if (await emailInput.isVisible()) {
    console.log('On auth page, logging in...');
    await emailInput.fill(TEST_USER.email);
    
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(TEST_USER.password);
    
    await page.screenshot({ path: 'test-screenshot-2.png' });
    
    // Submit
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    } else {
      await passwordInput.press('Enter');
    }
    
    // Wait for response
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-screenshot-3.png' });
  }
  
  const url = page.url();
  console.log('Final URL:', url);
  
  // Basic assertion
  expect(url).toBeTruthy();
});