const { chromium } = require('playwright');

async function testConsoleErrors() {
  console.log('Testing for Console Errors and Auth Issues...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Capture console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
  });
  
  try {
    console.log('\n=== Testing Auth Form with Console Monitoring ===');
    
    await page.goto('http://18.221.12.50/auth', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Fill and submit the form
    await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
    await page.fill('input[type="password"]', 'Jimkali90#');
    
    console.log('Submitting login form and monitoring for errors...');
    await page.click('button[type="submit"]');
    
    // Wait longer to see what happens
    await page.waitForTimeout(10000);
    
    console.log('\n=== Console Messages ===');
    consoleLogs.forEach((log, index) => {
      console.log(`${index + 1}. [${log.type.toUpperCase()}] ${log.text}`);
    });
    
    // Check network requests
    console.log('\n=== Testing Network Requests ===');
    
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('supabase') || response.url().includes('auth')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // Try auth again with network monitoring
    await page.goto('http://18.221.12.50/auth', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
    await page.fill('input[type="password"]', 'Jimkali90#');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    console.log('\n=== Network Responses ===');
    responses.forEach((resp, index) => {
      console.log(`${index + 1}. ${resp.status} ${resp.statusText} - ${resp.url}`);
    });
    
    await page.screenshot({ 
      path: '/tmp/clixen-auth-final-test.png', 
      fullPage: true 
    });
    
    console.log('\nFinal URL:', page.url());
    
  } catch (error) {
    console.error('❌ Console test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testConsoleErrors().catch(console.error);