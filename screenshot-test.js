import { chromium } from 'playwright';

async function takeScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    // Test the main landing page
    console.log('Navigating to application...');
    await page.goto('http://18.221.12.50');
    await page.waitForTimeout(3000); // Wait for page to load
    
    console.log('Taking screenshot of main page...');
    await page.screenshot({ path: '/root/repo/screenshot-main.png', fullPage: true });
    
    // Try to navigate to auth page directly
    console.log('Navigating to auth page...');
    await page.goto('http://18.221.12.50/auth');
    await page.waitForTimeout(3000);
    
    console.log('Taking screenshot of auth page...');
    await page.screenshot({ path: '/root/repo/screenshot-auth-page.png', fullPage: true });
    
    // Try to interact with the page to see authentication
    console.log('Looking for auth elements...');
    const pageContent = await page.content();
    console.log('Page title:', await page.title());
    
    // Check if there are any input fields
    const inputs = await page.$$('input');
    console.log('Found inputs:', inputs.length);
    
    // Check for any forms
    const forms = await page.$$('form');
    console.log('Found forms:', forms.length);
    
    // Try to find email/password fields and screenshot auth page
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    if (emailInput) {
      console.log('Found email input, taking auth screenshot...');
      await page.screenshot({ path: '/root/repo/screenshot-auth.png', fullPage: true });
      
      // Try to test authentication with the test credentials
      await emailInput.fill('jayveedz19@gmail.com');
      const passwordInput = await page.$('input[type="password"], input[name="password"]');
      if (passwordInput) {
        await passwordInput.fill('Goldyear2023#');
        await page.screenshot({ path: '/root/repo/screenshot-auth-filled.png', fullPage: true });
        
        // Try to submit
        const submitButton = await page.$('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          await page.waitForTimeout(5000); // Wait for response
          await page.screenshot({ path: '/root/repo/screenshot-after-auth.png', fullPage: true });
        }
      }
    }
    
  } catch (error) {
    console.error('Error during screenshot:', error);
    await page.screenshot({ path: '/root/repo/screenshot-error.png', fullPage: true });
  }

  await browser.close();
}

takeScreenshots().catch(console.error);