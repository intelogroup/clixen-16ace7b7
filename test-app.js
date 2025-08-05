import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('Navigating to searchmatic.netlify.app...');
  await page.goto('https://searchmatic.netlify.app');
  
  // Take initial screenshot
  await page.screenshot({ path: 'screenshots/01-landing.png', fullPage: true });
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Check if we need to login
  const loginButton = await page.$('button:has-text("Sign in"), button:has-text("Login")');
  if (loginButton) {
    console.log('Login form detected, entering credentials...');
    
    // Look for email/username field
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', 'jimkalinov@gmail.com');
    
    // Look for password field
    await page.fill('input[type="password"], input[name="password"], input[placeholder*="password" i]', 'Jimkali90#');
    
    // Take screenshot before login
    await page.screenshot({ path: 'screenshots/02-login-form.png', fullPage: true });
    
    // Click login button
    await loginButton.click();
    
    // Wait for navigation
    await page.waitForTimeout(5000);
  }
  
  // Take screenshot after login
  await page.screenshot({ path: 'screenshots/03-after-login.png', fullPage: true });
  
  // Test responsiveness - Mobile
  await context.setViewportSize({ width: 375, height: 667 });
  await page.screenshot({ path: 'screenshots/04-mobile-view.png', fullPage: true });
  
  // Test responsiveness - Tablet
  await context.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: 'screenshots/05-tablet-view.png', fullPage: true });
  
  // Back to desktop
  await context.setViewportSize({ width: 1920, height: 1080 });
  
  // Try to find and test chat functionality
  const chatLink = await page.$('a[href*="chat"], button:has-text("Chat"), [class*="chat" i]');
  if (chatLink) {
    console.log('Found chat link, clicking...');
    await chatLink.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/06-chat-interface.png', fullPage: true });
    
    // Try to send a test message
    const chatInput = await page.$('textarea, input[type="text"][placeholder*="message" i], input[placeholder*="chat" i]');
    if (chatInput) {
      console.log('Testing chat functionality...');
      await chatInput.fill('Hello AI agents! Can you help me create a simple workflow?');
      
      const sendButton = await page.$('button:has-text("Send"), button[type="submit"]');
      if (sendButton) {
        await sendButton.click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'screenshots/07-chat-response.png', fullPage: true });
      }
    }
  }
  
  // Test navigation
  const navLinks = await page.$$('nav a, header a');
  console.log(`Found ${navLinks.length} navigation links`);
  
  // Measure page load performance
  const performanceTiming = JSON.parse(
    await page.evaluate(() => JSON.stringify(window.performance.timing))
  );
  const loadTime = performanceTiming.loadEventEnd - performanceTiming.navigationStart;
  console.log(`Page load time: ${loadTime}ms`);
  
  await browser.close();
})();