const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    console.log('🔄 Navigating to http://localhost:3002/...');
    await page.goto('http://localhost:3002/', { waitUntil: 'networkidle2' });
    
    const title = await page.title();
    console.log('📄 Page Title:', title);
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'clixen-landing.png', fullPage: true });
    console.log('📸 Landing page screenshot saved as clixen-landing.png');
    
    // Check for the Get Started button
    const getStartedButtons = await page.$$('a[href="/auth"], button:contains("Get Started")');
    console.log('🔍 Found', getStartedButtons.length, 'Get Started buttons');
    
    if (getStartedButtons.length > 0) {
      console.log('🚀 Clicking Get Started button...');
      await getStartedButtons[0].click();
      
      // Wait for navigation
      await page.waitForTimeout(3000);
      
      // Take auth page screenshot
      await page.screenshot({ path: 'clixen-auth.png', fullPage: true });
      console.log('📸 Auth page screenshot saved as clixen-auth.png');
      
      const authUrl = await page.url();
      console.log('🔗 Auth page URL:', authUrl);
    }
    
    await browser.close();
    console.log('✅ Screenshots completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();