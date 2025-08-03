const { chromium } = require('playwright');

async function finalAuthTest() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor', '--no-sandbox', '--disable-cache']
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    // Force fresh context without cache
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // Capture all console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    };
    consoleLogs.push(logEntry);
    console.log(`[CONSOLE ${msg.type().toUpperCase()}]`, msg.text());
  });
  
  // Capture all network requests
  const networkLogs = [];
  page.on('request', request => {
    const requestLog = {
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData(),
      timestamp: new Date().toISOString()
    };
    networkLogs.push({ type: 'request', ...requestLog });
    console.log(`[REQUEST] ${request.method()} ${request.url()}`);
  });
  
  page.on('response', response => {
    const responseLog = {
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers(),
      timestamp: new Date().toISOString()
    };
    networkLogs.push({ type: 'response', ...responseLog });
    console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
  });
  
  // Capture failed requests
  page.on('requestfailed', request => {
    const failureLog = {
      url: request.url(),
      method: request.method(),
      failure: request.failure(),
      timestamp: new Date().toISOString()
    };
    networkLogs.push({ type: 'failed', ...failureLog });
    console.log(`[REQUEST FAILED] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  });
  
  try {
    console.log('=== FINAL AUTH TEST (CACHE-BUSTED) ===');
    
    // Add cache-busting parameter
    const testUrl = `http://18.221.12.50/auth?t=${Date.now()}`;
    console.log(`Navigating to ${testUrl}...`);
    await page.goto(testUrl, { waitUntil: 'networkidle' });
    
    // Take screenshot
    await page.screenshot({ path: 'final-auth-test.png', fullPage: true });
    console.log('Auth page screenshot taken');
    
    // Wait for dynamic content to load
    await page.waitForTimeout(3000);
    
    // Check what JavaScript files are being loaded
    const jsFiles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[src]')).map(script => script.src);
    });
    
    console.log('JavaScript files loaded:', jsFiles);
    
    // Check the Supabase configuration in the browser
    const supabaseConfig = await page.evaluate(() => {
      // Check if we can find any Supabase configuration
      const scripts = Array.from(document.querySelectorAll('script'));
      for (let script of scripts) {
        if (script.innerHTML.includes('supabase') || script.innerHTML.includes('createClient')) {
          return {
            found: true,
            content: script.innerHTML.substring(0, 1000)
          };
        }
      }
      return { found: false };
    });
    
    console.log('Supabase config found:', supabaseConfig);
    
    // Try to find the auth form elements
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    
    if (emailInput && passwordInput) {
      console.log('\n=== ATTEMPTING AUTHENTICATION ===');
      
      // Clear previous network logs to focus on auth requests
      networkLogs.length = 0;
      consoleLogs.length = 0;
      
      // Fill in the credentials
      await emailInput.fill('jayveedz19@gmail.com');
      await passwordInput.fill('Jimkali90#');
      
      console.log('Credentials filled');
      
      // Take screenshot with filled form
      await page.screenshot({ path: 'final-auth-test-filled.png', fullPage: true });
      
      // Find and click submit button
      const submitButton = await page.$('button[type="submit"]');
      
      if (submitButton) {
        console.log('Clicking submit button...');
        await submitButton.click();
      } else {
        console.log('No submit button found, pressing Enter on password field...');
        await passwordInput.press('Enter');
      }
      
      // Wait for auth response
      console.log('Waiting for authentication response...');
      await page.waitForTimeout(10000);
      
      // Take screenshot after submission
      await page.screenshot({ path: 'final-auth-test-submitted.png', fullPage: true });
      
      // Check current URL and page state
      const postAuthState = await page.evaluate(() => ({
        url: window.location.href,
        title: document.title,
        bodyText: document.body?.textContent?.substring(0, 1000)
      }));
      
      console.log('\n=== POST-AUTH STATE ===');
      console.log('URL:', postAuthState.url);
      console.log('Title:', postAuthState.title);
      
    } else {
      console.log('\n=== NO AUTH FORM FOUND ===');
      console.log('Email input found:', !!emailInput);
      console.log('Password input found:', !!passwordInput);
    }
    
  } catch (error) {
    console.error('Error during final auth test:', error);
    await page.screenshot({ path: 'final-auth-test-error.png', fullPage: true });
  }
  
  // Output network analysis
  console.log('\n=== DETAILED NETWORK ANALYSIS ===');
  
  const authRequests = networkLogs.filter(log => 
    log.url?.includes('supabase') || 
    log.url?.includes('auth') ||
    log.url?.includes('token')
  );
  
  if (authRequests.length > 0) {
    console.log('AUTH-RELATED REQUESTS:');
    authRequests.forEach(log => {
      console.log(`[${log.timestamp}] ${log.type.toUpperCase()} ${log.method || ''} ${log.url}`);
      if (log.status) console.log(`  Status: ${log.status} ${log.statusText}`);
      if (log.postData) console.log(`  Post Data: ${log.postData.substring(0, 200)}`);
      if (log.failure) console.log(`  Failure: ${log.failure.errorText}`);
      if (log.headers && log.headers.authorization) {
        console.log(`  Authorization: ${log.headers.authorization.substring(0, 20)}...`);
      }
      if (log.headers && log.headers.apikey) {
        console.log(`  API Key: ${log.headers.apikey.substring(0, 20)}...`);
      }
    });
  } else {
    console.log('No auth-related requests found');
  }
  
  // Show console errors
  console.log('\n=== CONSOLE ERRORS ===');
  const errors = consoleLogs.filter(log => log.type === 'error');
  if (errors.length > 0) {
    errors.forEach(log => {
      console.log(`[${log.timestamp}] ${log.text}`);
    });
  } else {
    console.log('No console errors found');
  }
  
  await browser.close();
  
  return { consoleLogs, networkLogs };
}

// Run the final auth test
finalAuthTest().then(() => {
  console.log('\n=== FINAL AUTH TEST COMPLETE ===');
}).catch(console.error);