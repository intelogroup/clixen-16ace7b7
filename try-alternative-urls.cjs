const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(__dirname, 'searchmatic-screenshots');

async function tryUrls() {
  console.log('Trying alternative URLs for Searchmatic app...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  // Potential URLs to try
  const urls = [
    'https://searchmatic.netlify.app',
    'https://search-matic.netlify.app', 
    'https://searchmatic-app.netlify.app',
    'https://searchmatic.app',
    'https://searchmatic.vercel.app',
    'https://searchmatic-demo.netlify.app',
    'http://searchmatic.netlify.app' // HTTP version
  ];
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`${i + 1}. Trying: ${url}`);
    
    const page = await context.newPage();
    
    try {
      const response = await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
      
      const title = await page.title();
      const statusCode = response.status();
      
      console.log(`   Status: ${statusCode}`);
      console.log(`   Title: "${title}"`);
      
      if (statusCode === 200 && !title.includes('not found') && !title.includes('404')) {
        console.log(`   ✅ FOUND WORKING URL: ${url}`);
        
        // Take screenshot of working site
        await page.screenshot({ 
          path: path.join(screenshotsDir, `working-site-${i + 1}.png`),
          fullPage: true 
        });
        
        console.log(`   Screenshot saved for working site`);
        
        // Check for login functionality
        const hasLoginButton = await page.locator('button:has-text("Login"), button:has-text("Sign In"), a:has-text("Login"), a:has-text("Sign In")').count() > 0;
        const hasEmailField = await page.locator('input[type="email"]').count() > 0;
        
        console.log(`   Has login button: ${hasLoginButton}`);
        console.log(`   Has email field: ${hasEmailField}`);
        
        // If this is the working site, we'll break and use this URL
        if (statusCode === 200) {
          console.log(`\n🎯 Using this URL for detailed testing: ${url}`);
          await page.close();
          break;
        }
      } else {
        console.log(`   ❌ Site not available or error page`);
      }
      
    } catch (error) {
      console.log(`   ❌ Failed to load: ${error.message}`);
    }
    
    await page.close();
  }
  
  await browser.close();
}

tryUrls().catch(console.error);