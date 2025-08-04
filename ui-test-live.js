import { chromium } from '@playwright/test';
import { promises as fs } from 'fs';

async function testLiveVersion() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const screenshotsDir = '/root/repo/screenshots/live-version';
  await fs.mkdir(screenshotsDir, { recursive: true });
  
  console.log('🌐 Testing Live Clixen Version (Netlify)...');
  
  try {
    // Test live version
    await page.goto('https://clixen.netlify.app', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    console.log('📸 Capturing live landing page...');
    await page.screenshot({ 
      path: `${screenshotsDir}/01-live-landing.png`,
      fullPage: true 
    });
    
    // Check if auth is needed
    const needsAuth = await page.locator('input[type="email"]').count() > 0;
    
    if (needsAuth) {
      console.log('🔐 Authenticating on live version...');
      await page.fill('input[type="email"]', 'jimkalinov@gmail.com');
      await page.fill('input[type="password"]', 'Jimkali90#');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
    }
    
    // Desktop Dashboard
    console.log('🖥️  Testing live desktop dashboard...');
    await page.goto('https://clixen.netlify.app/dashboard');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: `${screenshotsDir}/02-live-dashboard-desktop.png`,
      fullPage: true 
    });
    
    // Mobile Dashboard
    console.log('📱 Testing live mobile dashboard...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: `${screenshotsDir}/03-live-dashboard-mobile.png`,
      fullPage: true 
    });
    
    // Check for UI elements
    const liveElements = await page.evaluate(() => {
      // Safer element checking
      const sidebar = document.querySelector('[class*="lg:fixed"]');
      const bottomNav = document.querySelector('[class*="bottom-0"]');
      const gradients = document.querySelectorAll('[class*="gradient"]');
      const cards = document.querySelectorAll('[class*="bg-zinc"], [class*="bg-gradient"]');
      
      return {
        hasSidebar: !!sidebar,
        hasBottomNav: !!bottomNav,
        gradientElements: gradients.length,
        styledCards: cards.length,
        totalElements: document.querySelectorAll('*').length,
        pageTitle: document.title,
        url: window.location.href
      };
    });
    
    console.log('✅ Live Version Analysis:', liveElements);
    
    // Chat page
    console.log('💬 Testing live chat interface...');
    await page.goto('https://clixen.netlify.app/chat');
    await page.waitForTimeout(2000);
    
    // Desktop chat
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ 
      path: `${screenshotsDir}/04-live-chat-desktop.png`,
      fullPage: true 
    });
    
    // Mobile chat
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ 
      path: `${screenshotsDir}/05-live-chat-mobile.png`,
      fullPage: true 
    });
    
    console.log('✅ Live version testing completed!');
    
    return liveElements;
    
  } catch (error) {
    console.error('❌ Live version error:', error.message);
    return null;
  } finally {
    await browser.close();
  }
}

testLiveVersion().then(result => {
  if (result) {
    console.log('🎉 Live version analysis complete:', result);
  }
}).catch(console.error);