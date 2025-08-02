const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function detailedAuthTest() {
  console.log('🔍 Running detailed authentication analysis...');
  
  const screenshotsDir = '/root/repo/detailed-auth-screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Capture all network activity
  const networkLogs = [];
  page.on('request', request => {
    networkLogs.push({
      type: 'request',
      url: request.url(),
      method: request.method(),
      timestamp: new Date().toISOString()
    });
  });
  
  page.on('response', response => {
    networkLogs.push({
      type: 'response',
      url: response.url(),
      status: response.status(),
      timestamp: new Date().toISOString()
    });
  });
  
  // Capture console logs
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
  });
  
  try {
    // Step 1: Load the main page
    console.log('📍 Loading main page...');
    await page.goto('http://18.221.12.50', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotsDir, '01-main-page.png'), fullPage: true });
    
    // Step 2: Click Get Started
    console.log('🎯 Clicking Get Started...');
    await page.click('text=Get Started');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotsDir, '02-auth-form.png'), fullPage: true });
    
    console.log(`Current URL: ${page.url()}`);
    
    // Step 3: Fill credentials
    console.log('📧 Filling credentials...');
    await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
    await page.fill('input[type="password"]', 'Jimkali90#');
    await page.screenshot({ path: path.join(screenshotsDir, '03-credentials-filled.png'), fullPage: true });
    
    // Step 4: Submit and track everything
    console.log('🔘 Submitting login...');
    
    // Clear previous network logs to focus on login request
    networkLogs.length = 0;
    
    await page.click('button[type="submit"], button:has-text("Sign In")');
    
    // Wait and see what happens
    await page.waitForTimeout(8000);
    
    console.log(`URL after login: ${page.url()}`);
    await page.screenshot({ path: path.join(screenshotsDir, '04-after-submit.png'), fullPage: true });
    
    // Step 5: Check page content carefully
    const pageContent = await page.textContent('body');
    console.log(`Page content length: ${pageContent.length}`);
    console.log(`Page content preview: ${pageContent.substring(0, 300)}...`);
    
    // Check for specific elements
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    
    // Look for any elements that might indicate success or failure
    const allText = await page.$$eval('*', elements => 
      elements.map(el => el.textContent).filter(text => text && text.trim().length > 0)
    );
    
    const uniqueTexts = [...new Set(allText.slice(0, 20))];
    console.log('Page text elements:', uniqueTexts);
    
    // Check if URL changed
    if (page.url().includes('/auth')) {
      console.log('✅ URL indicates we\'re in auth flow');
    }
    
    // Look for dashboard indicators
    const dashboardIndicators = ['dashboard', 'workspace', 'workflows', 'profile', 'logout'];
    let foundIndicators = [];
    
    for (const indicator of dashboardIndicators) {
      const element = await page.$(`text=${indicator}`);
      if (element) {
        foundIndicators.push(indicator);
      }
    }
    
    console.log(`Dashboard indicators found: ${foundIndicators.join(', ')}`);
    
    // Step 6: Try manual navigation to potential dashboard
    console.log('🔄 Trying to navigate to potential dashboard URLs...');
    
    const potentialUrls = [
      'http://18.221.12.50/dashboard',
      'http://18.221.12.50/workspace',
      'http://18.221.12.50/app',
      'http://18.221.12.50/workflows'
    ];
    
    for (const url of potentialUrls) {
      try {
        console.log(`Trying: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(2000);
        
        const currentContent = await page.textContent('body');
        console.log(`Content at ${url}: ${currentContent.substring(0, 100)}...`);
        
        await page.screenshot({ 
          path: path.join(screenshotsDir, `05-test-${url.split('/').pop()}.png`), 
          fullPage: true 
        });
        
        if (!currentContent.toLowerCase().includes('welcome back')) {
          console.log(`✅ ${url} shows different content - might be authenticated area`);
          break;
        }
      } catch (error) {
        console.log(`❌ ${url} failed: ${error.message}`);
      }
    }
    
    // Generate detailed report
    const report = {
      timestamp: new Date().toISOString(),
      finalUrl: page.url(),
      pageTitle: await page.title(),
      networkRequests: networkLogs.length,
      consoleMessages: consoleMessages.length,
      authFormFound: true,
      credentialsFilled: true,
      loginSubmitted: true,
      dashboardIndicators: foundIndicators,
      detailedLogs: {
        network: networkLogs.slice(-10), // Last 10 network events
        console: consoleMessages.slice(-5) // Last 5 console messages
      }
    };
    
    fs.writeFileSync(
      path.join(screenshotsDir, 'detailed-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📊 Detailed Analysis Summary:');
    console.log(`- Final URL: ${report.finalUrl}`);
    console.log(`- Page Title: ${report.pageTitle}`);
    console.log(`- Network Requests: ${report.networkRequests}`);
    console.log(`- Console Messages: ${report.consoleMessages}`);
    console.log(`- Dashboard Indicators: ${report.dashboardIndicators.join(', ') || 'None'}`);
    
  } catch (error) {
    console.error('❌ Detailed test failed:', error.message);
  }
  
  await browser.close();
}

detailedAuthTest()
  .then(() => {
    console.log('\n✅ Detailed authentication analysis completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  });