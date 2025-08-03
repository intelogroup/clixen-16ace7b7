const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Set extra HTTP headers to bypass cache
  await page.setExtraHTTPHeaders({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  // Enable all logging
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('response', response => console.log('RESPONSE:', response.status(), response.url()));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  try {
    console.log('Navigating to http://18.221.12.50/auth with no-cache headers...');
    await page.goto('http://18.221.12.50/auth', { waitUntil: 'networkidle' });
    
    // Wait for form to be ready
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    console.log('Filling in login credentials...');
    await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
    await page.fill('input[type="password"]', 'Jimkali90#');
    
    // Take screenshot before submit
    await page.screenshot({ path: '/root/repo/auth_before_submit_final.png' });
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
      await page.screenshot({ path: '/root/repo/auth_after_submit_final.png' });
      console.log('Screenshot after submit saved');
      
      // Check for success indicators
      const bodyText = await page.textContent('body');
      console.log('Page contains "dashboard" text:', bodyText.toLowerCase().includes('dashboard'));
      console.log('Page contains "welcome" text:', bodyText.toLowerCase().includes('welcome'));
      console.log('Page contains "error" text:', bodyText.toLowerCase().includes('error'));
      console.log('Page contains "invalid" text:', bodyText.toLowerCase().includes('invalid'));
      
      // If still on auth page, check for specific messages
      if (currentUrl.includes('/auth')) {
        console.log('Still on auth page - authentication might have failed');
        
        // Look for any form validation or error messages
        const possibleErrors = await page.$$eval('*', elements => {
          return elements
            .filter(el => el.textContent && (
              el.textContent.toLowerCase().includes('invalid') ||
              el.textContent.toLowerCase().includes('error') ||
              el.textContent.toLowerCase().includes('wrong') ||
              el.textContent.toLowerCase().includes('failed')
            ))
            .map(el => el.textContent.trim())
            .filter(text => text.length > 0);
        });
        
        if (possibleErrors.length > 0) {
          console.log('Found potential error messages:', possibleErrors);
        }
      } else {
        console.log('Redirected to:', currentUrl);
        console.log('Authentication appears successful!');
      }
      
    } else {
      console.log('Submit button not found!');
    }
    
  } catch (error) {
    console.error('Error during authentication test:', error.message);
    await page.screenshot({ path: '/root/repo/auth_error_final.png' });
  }
  
  await browser.close();
})();