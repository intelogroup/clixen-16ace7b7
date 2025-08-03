const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable all logging
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('response', response => console.log('RESPONSE:', response.status(), response.url()));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  try {
    console.log('Navigating to http://18.221.12.50/auth...');
    await page.goto('http://18.221.12.50/auth', { waitUntil: 'networkidle' });
    
    // Wait for form to be ready
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    console.log('Filling in login credentials...');
    await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
    await page.fill('input[type="password"]', 'Jimkali90#');
    
    // Take screenshot before submit
    await page.screenshot({ path: '/root/repo/auth_before_submit.png' });
    console.log('Screenshot before submit saved');
    
    console.log('Clicking submit button...');
    const submitButton = await page.$('button[type="submit"]') || await page.$('button:has-text("Sign in")') || await page.$('button:has-text("Login")');
    
    if (submitButton) {
      await submitButton.click();
      
      // Wait for response and potential redirect
      console.log('Waiting for authentication response...');
      await page.waitForTimeout(5000);
      
      // Check current URL
      const currentUrl = page.url();
      console.log('Current URL after login attempt:', currentUrl);
      
      // Take screenshot after submit
      await page.screenshot({ path: '/root/repo/auth_after_submit.png' });
      console.log('Screenshot after submit saved');
      
      // Check for success indicators
      const bodyText = await page.textContent('body');
      console.log('Page contains "dashboard" text:', bodyText.toLowerCase().includes('dashboard'));
      console.log('Page contains "welcome" text:', bodyText.toLowerCase().includes('welcome'));
      console.log('Page contains "error" text:', bodyText.toLowerCase().includes('error'));
      console.log('Page contains "invalid" text:', bodyText.toLowerCase().includes('invalid'));
      
      // Check for error messages
      const errorElements = await page.$$('[class*="error"], [class*="alert"], .text-red-500, .text-danger');
      if (errorElements.length > 0) {
        console.log('Error messages found:');
        for (const element of errorElements) {
          const text = await element.textContent();
          console.log('  -', text);
        }
      }
      
      // Check if we're still on auth page or redirected
      if (currentUrl.includes('/auth')) {
        console.log('Still on auth page - checking for error messages...');
        const formErrors = await page.$$('text="Invalid email or password"');
        const genericErrors = await page.$$('text*="error"');
        console.log('Form validation errors found:', formErrors.length);
        console.log('Generic error messages found:', genericErrors.length);
      } else {
        console.log('Redirected away from auth page - likely successful login');
      }
      
    } else {
      console.log('Submit button not found!');
    }
    
  } catch (error) {
    console.error('Error during authentication test:', error.message);
    await page.screenshot({ path: '/root/repo/auth_error.png' });
  }
  
  await browser.close();
})();