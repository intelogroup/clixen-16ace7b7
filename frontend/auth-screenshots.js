const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function captureScreenshots() {
  // Create screenshots directory
  const screenshotDir = './test-results';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('🚀 Starting authentication and screenshot capture...');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  try {
    // Clear any existing auth state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    console.log('���� Capturing homepage...');
    // Navigate to homepage
    await page.goto('http://localhost:8081/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'modern-01-homepage.png'),
      fullPage: true 
    });
    
    console.log('📸 Capturing auth page...');
    // Navigate to auth page
    await page.goto('http://localhost:8081/auth', { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'modern-02-auth-page-full.png'),
      fullPage: true 
    });
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'modern-02-auth-page-viewport.png'),
      fullPage: false 
    });
    
    console.log('📝 Filling authentication form...');
    // Fill authentication form
    await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
    await page.fill('input[type="password"]', 'Goldyear2023#');
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'modern-03-form-filled.png'),
      fullPage: false 
    });
    
    console.log('🔐 Submitting authentication...');
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for authentication response
    await page.waitForTimeout(5000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'modern-04-after-login.png'),
      fullPage: true 
    });
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    if (currentUrl.includes('dashboard') || currentUrl.includes('chat')) {
      console.log('📊 Capturing dashboard...');
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: path.join(screenshotDir, 'modern-05-dashboard.png'),
        fullPage: true 
      });
    }
    
    console.log('📱 Testing mobile responsiveness...');
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'modern-06-mobile-view.png'),
      fullPage: true 
    });
    
    console.log('💬 Testing chat interface...');
    // Try chat interface
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:8081/chat', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'modern-07-chat-interface.png'),
      fullPage: true 
    });
    
    // Test chat input if available
    const chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
    if (await chatInput.isVisible({ timeout: 3000 })) {
      await chatInput.fill('Hello, this is a test message for the modern UI!');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: path.join(screenshotDir, 'modern-08-chat-with-message.png'),
        fullPage: false 
      });
    }
    
    console.log('✅ Screenshot capture completed successfully!');
    console.log('📁 Screenshots saved to:', screenshotDir);
    
  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
