const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('response', response => console.log('RESPONSE:', response.status(), response.url()));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
  
  try {
    console.log('Navigating to http://18.221.12.50/auth...');
    await page.goto('http://18.221.12.50/auth', { waitUntil: 'networkidle' });
    
    // Take screenshot
    await page.screenshot({ path: '/root/repo/auth_page.png' });
    console.log('Screenshot saved to /root/repo/auth_page.png');
    
    // Get page title and content
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check if login form exists
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitButton = await page.$('button[type="submit"]') || await page.$('button:has-text("Sign in")') || await page.$('button:has-text("Login")');
    
    console.log('Email input found:', !!emailInput);
    console.log('Password input found:', !!passwordInput);
    console.log('Submit button found:', !!submitButton);
    
    // Get page content
    const bodyText = await page.textContent('body');
    console.log('Page contains "login" text:', bodyText.toLowerCase().includes('login'));
    console.log('Page contains "sign in" text:', bodyText.toLowerCase().includes('sign in'));
    console.log('Page contains "email" text:', bodyText.toLowerCase().includes('email'));
    
    // Check for any error messages
    const errorElements = await page.$$('[class*="error"], [class*="alert"], .text-red-500, .text-danger');
    console.log('Error elements found:', errorElements.length);
    
  } catch (error) {
    console.error('Error navigating to page:', error.message);
  }
  
  await browser.close();
})();