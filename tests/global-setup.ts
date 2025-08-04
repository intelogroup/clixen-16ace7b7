import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright global setup for Clixen testing...');
  
  // Create a browser instance to verify the app is accessible
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('📡 Checking if clixen.netlify.app is accessible...');
    await page.goto('https://clixen.netlify.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Take a screenshot to verify the app loaded
    await page.screenshot({ 
      path: 'test-results/global-setup-verification.png',
      fullPage: true 
    });
    
    console.log('✅ App is accessible and responding');
  } catch (error) {
    console.error('❌ Failed to access app during setup:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ Global setup completed successfully');
}

export default globalSetup;