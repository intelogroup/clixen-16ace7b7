import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Navigating to http://localhost:3002/...');
    await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
    
    // Take screenshot of landing page
    console.log('Taking screenshot of landing page...');
    await page.screenshot({ 
      path: 'landing-page.png', 
      fullPage: true 
    });
    console.log('✅ Landing page screenshot saved as landing-page.png');

    // Check for "Get Started" button and click it
    console.log('Looking for "Get Started" button...');
    const getStartedButton = await page.locator('button:has-text("Get Started"), a:has-text("Get Started")').first();
    
    if (await getStartedButton.isVisible()) {
      console.log('Found "Get Started" button, clicking...');
      await getStartedButton.click();
      
      // Wait for navigation and take auth page screenshot
      await page.waitForTimeout(2000);
      console.log('Taking screenshot of auth page...');
      await page.screenshot({ 
        path: 'auth-page.png', 
        fullPage: true 
      });
      console.log('✅ Auth page screenshot saved as auth-page.png');
    } else {
      console.log('❌ "Get Started" button not found');
    }

    // Get page title and URL
    const title = await page.title();
    const url = await page.url();
    console.log(`Page Title: ${title}`);
    console.log(`Current URL: ${url}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();