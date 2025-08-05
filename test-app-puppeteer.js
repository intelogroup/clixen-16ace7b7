import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Navigating to searchmatic.netlify.app...');
    await page.goto('https://searchmatic.netlify.app', { waitUntil: 'networkidle2' });
    
    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/01-landing.png', fullPage: true });
    console.log('Landing page screenshot taken');
    
    // Wait for any redirects or loading
    await page.waitForTimeout(3000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Try to find login elements
    try {
      // Look for email input
      const emailSelector = 'input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="Email" i]';
      await page.waitForSelector(emailSelector, { timeout: 5000 });
      
      console.log('Found login form, entering credentials...');
      await page.type(emailSelector, 'jimkalinov@gmail.com');
      
      // Look for password input
      const passwordSelector = 'input[type="password"], input[name="password"], input[placeholder*="password" i], input[placeholder*="Password" i]';
      await page.type(passwordSelector, 'Jimkali90#');
      
      // Take screenshot before login
      await page.screenshot({ path: 'screenshots/02-login-form.png', fullPage: true });
      console.log('Login form screenshot taken');
      
      // Find and click login button
      const loginButton = await page.$('button:contains("Sign in"), button:contains("Login"), button:contains("Sign In"), button[type="submit"]');
      if (loginButton) {
        await loginButton.click();
      } else {
        // Try submitting the form
        await page.keyboard.press('Enter');
      }
      
      // Wait for navigation
      await page.waitForTimeout(5000);
      console.log('Login attempted');
    } catch (e) {
      console.log('No login form found or already logged in');
    }
    
    // Take screenshot after login
    await page.screenshot({ path: 'screenshots/03-after-login.png', fullPage: true });
    console.log('After login screenshot taken');
    
    // Get page content for analysis
    const pageContent = await page.content();
    fs.writeFileSync('screenshots/page-content.html', pageContent);
    
    // Test responsiveness - Mobile
    await page.setViewport({ width: 375, height: 667 });
    await page.screenshot({ path: 'screenshots/04-mobile-view.png', fullPage: true });
    console.log('Mobile view screenshot taken');
    
    // Test responsiveness - Tablet
    await page.setViewport({ width: 768, height: 1024 });
    await page.screenshot({ path: 'screenshots/05-tablet-view.png', fullPage: true });
    console.log('Tablet view screenshot taken');
    
    // Back to desktop
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Try to find chat or other navigation elements
    const navElements = await page.$$eval('a, button', elements => 
      elements.map(el => ({
        text: el.textContent?.trim(),
        href: el.href || el.getAttribute('onclick') || '',
        className: el.className
      }))
    );
    
    console.log('Navigation elements found:', navElements.filter(el => el.text).slice(0, 10));
    
    // Try to find chat functionality
    const chatLink = navElements.find(el => 
      el.text && (el.text.toLowerCase().includes('chat') || 
                  el.text.toLowerCase().includes('conversation') ||
                  el.text.toLowerCase().includes('workflow'))
    );
    
    if (chatLink) {
      console.log('Found chat-related link:', chatLink);
      // Try to click it
      const chatElement = await page.$(`a:contains("${chatLink.text}"), button:contains("${chatLink.text}")`);
      if (chatElement) {
        await chatElement.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'screenshots/06-chat-interface.png', fullPage: true });
        console.log('Chat interface screenshot taken');
      }
    }
    
    // Measure performance
    const performanceMetrics = await page.evaluate(() => {
      const timing = window.performance.timing;
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0
      };
    });
    
    console.log('Performance metrics:', performanceMetrics);
    
    // Get all text content for UI evaluation
    const textContent = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync('screenshots/page-text.txt', textContent);
    
    await browser.close();
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error during testing:', error);
  }
})();