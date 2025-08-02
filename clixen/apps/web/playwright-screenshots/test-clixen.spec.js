const { test, expect } = require('@playwright/test');

test('Clixen MVP Landing Page', async ({ page }) => {
  // Navigate to the app
  console.log('Navigating to http://localhost:3002/...');
  await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
  
  // Wait for the page to load
  await page.waitForTimeout(2000);
  
  // Take screenshot of landing page
  await page.screenshot({ path: 'landing-page.png', fullPage: true });
  console.log('✅ Landing page screenshot saved');

  // Check page title
  await expect(page).toHaveTitle(/Clixen/);
  
  // Look for key elements
  const pageContent = await page.textContent('body');
  console.log('Page content preview:', pageContent.substring(0, 300));
  
  // Try to find and click "Get Started" button
  try {
    const getStartedButton = page.locator('text="Get Started"').first();
    if (await getStartedButton.isVisible({ timeout: 5000 })) {
      await getStartedButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'auth-page.png', fullPage: true });
      console.log('✅ Auth page screenshot saved');
    }
  } catch (error) {
    console.log('Get Started button not found or not clickable');
  }
});