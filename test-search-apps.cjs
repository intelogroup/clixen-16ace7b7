const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(__dirname, 'search-app-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

async function testSearchApps() {
  console.log('Testing search-related apps that might be similar to Searchmatic...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  // Search apps found in the web search
  const searchApps = [
    { name: 'Smart Search', url: 'https://smart-search-engine.netlify.app/' },
    { name: 'Search It', url: 'https://search-it.netlify.app/' },
    { name: 'NextSearch', url: 'https://nextsearch.netlify.app/' },
    { name: 'AI Search', url: 'https://ai-search.netlify.app/' }
  ];
  
  for (let i = 0; i < searchApps.length; i++) {
    const app = searchApps[i];
    console.log(`${i + 1}. Testing: ${app.name} (${app.url})`);
    
    const page = await context.newPage();
    
    try {
      const startTime = Date.now();
      const response = await page.goto(app.url, { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
      const loadTime = Date.now() - startTime;
      
      const title = await page.title();
      const statusCode = response.status();
      
      console.log(`   Status: ${statusCode}`);
      console.log(`   Title: "${title}"`);
      console.log(`   Load time: ${loadTime}ms`);
      
      if (statusCode === 200) {
        // Take screenshot
        await page.screenshot({ 
          path: path.join(screenshotsDir, `${app.name.toLowerCase().replace(' ', '-')}-desktop.png`),
          fullPage: true 
        });
        
        // Check for key features
        const hasSearchInput = await page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]').count() > 0;
        const hasSearchButton = await page.locator('button:has-text("Search"), button[type="submit"]').count() > 0;
        const hasLoginFeatures = await page.locator('button:has-text("Login"), button:has-text("Sign In"), input[type="email"]').count() > 0;
        const hasChatFeatures = await page.locator('.chat, .conversation, textarea').count() > 0;
        
        console.log(`   Search input: ${hasSearchInput ? '✅' : '❌'}`);
        console.log(`   Search button: ${hasSearchButton ? '✅' : '❌'}`);
        console.log(`   Login features: ${hasLoginFeatures ? '✅' : '❌'}`);
        console.log(`   Chat features: ${hasChatFeatures ? '✅' : '❌'}`);
        
        // Test responsiveness - Mobile view
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(1000);
        await page.screenshot({ 
          path: path.join(screenshotsDir, `${app.name.toLowerCase().replace(' ', '-')}-mobile.png`),
          fullPage: false 
        });
        
        console.log(`   ✅ Screenshots saved for ${app.name}`);
        
        // If this app has good features, we could do detailed testing
        if (hasSearchInput && (hasLoginFeatures || hasChatFeatures)) {
          console.log(`   🎯 ${app.name} looks promising for detailed testing`);
        }
        
      } else {
        console.log(`   ❌ Failed to load properly`);
      }
      
    } catch (error) {
      console.log(`   ❌ Failed to load: ${error.message}`);
    }
    
    await page.close();
    console.log(''); // Empty line for readability
  }
  
  await browser.close();
  console.log(`✅ Test completed! Screenshots saved to: ${screenshotsDir}`);
}

testSearchApps().catch(console.error);