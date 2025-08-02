import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Navigating to http://localhost:3002/...');
    await page.goto('http://localhost:3002/', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for the page to fully load
    await page.waitForTimeout(3000);
    
    // Take screenshot of landing page
    console.log('Taking screenshot of landing page...');
    await page.screenshot({ 
      path: 'landing-page.png', 
      fullPage: true 
    });
    console.log('✅ Landing page screenshot saved as landing-page.png');

    // Check for "Get Started" button and click it
    console.log('Looking for "Get Started" button...');
    
    // Try different selectors for the button
    const buttonSelectors = [
      'button:has-text("Get Started")', 
      'a:has-text("Get Started")',
      '[href*="auth"]',
      '[href*="login"]',
      '[href*="signup"]',
      'button:text("Get Started")',
      'a:text("Get Started")'
    ];
    
    let buttonFound = false;
    for (const selector of buttonSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          console.log(`Found button with selector: ${selector}`);
          await button.click();
          buttonFound = true;
          break;
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }
    
    if (buttonFound) {
      // Wait for navigation and take auth page screenshot
      await page.waitForTimeout(3000);
      console.log('Taking screenshot of auth page...');
      await page.screenshot({ 
        path: 'auth-page.png', 
        fullPage: true 
      });
      console.log('✅ Auth page screenshot saved as auth-page.png');
    } else {
      console.log('❌ "Get Started" button not found, checking page content...');
      const pageContent = await page.textContent('body');
      console.log('Page contains:', pageContent.substring(0, 500) + '...');
      
      // Try to find any buttons or links
      const allButtons = await page.locator('button, a').all();
      console.log(`Found ${allButtons.length} interactive elements`);
      
      for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
        const text = await allButtons[i].textContent();
        console.log(`Element ${i}: "${text}"`);
      }
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