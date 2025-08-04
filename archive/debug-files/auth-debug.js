const { chromium } = require('playwright');

async function debugAuthFlow() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor', '--no-sandbox']
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    recordVideo: { dir: 'videos/' }
  });
  
  const page = await context.newPage();
  
  // Capture all console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
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
    console.log('=== STARTING AUTH DEBUG SESSION ===');
    
    // Navigate to the application
    console.log('Navigating to http://18.221.12.50...');
    await page.goto('http://18.221.12.50', { waitUntil: 'networkidle' });
    
    // Take initial screenshot
    await page.screenshot({ path: 'auth-debug-initial.png', fullPage: true });
    console.log('Initial screenshot taken');
    
    // Wait for page to load and look for auth elements
    await page.waitForTimeout(3000);
    
    // Look for authentication form elements
    const authElements = await page.evaluate(() => {
      const elements = {
        emailInputs: Array.from(document.querySelectorAll('input[type="email"], input[name*="email"], input[placeholder*="email"]')).map(el => ({
          tagName: el.tagName,
          type: el.type,
          name: el.name,
          placeholder: el.placeholder,
          id: el.id,
          className: el.className
        })),
        passwordInputs: Array.from(document.querySelectorAll('input[type="password"], input[name*="password"]')).map(el => ({
          tagName: el.tagName,
          type: el.type,
          name: el.name,
          placeholder: el.placeholder,
          id: el.id,
          className: el.className
        })),
        buttons: Array.from(document.querySelectorAll('button, input[type="submit"]')).map(el => ({
          tagName: el.tagName,
          type: el.type,
          textContent: el.textContent?.trim(),
          id: el.id,
          className: el.className
        })),
        forms: Array.from(document.querySelectorAll('form')).map(el => ({
          action: el.action,
          method: el.method,
          id: el.id,
          className: el.className
        }))
      };
      return elements;
    });
    
    console.log('Auth elements found:', JSON.stringify(authElements, null, 2));
    
    // Try to find and fill authentication form
    let emailInput = null;
    let passwordInput = null;
    let submitButton = null;
    
    // Try different selectors for email input
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="Email" i]',
      'input[id*="email" i]'
    ];
    
    for (const selector of emailSelectors) {
      try {
        emailInput = await page.$(selector);
        if (emailInput) {
          console.log(`Found email input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Try different selectors for password input
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[placeholder*="password" i]',
      'input[placeholder*="Password" i]',
      'input[id*="password" i]'
    ];
    
    for (const selector of passwordSelectors) {
      try {
        passwordInput = await page.$(selector);
        if (passwordInput) {
          console.log(`Found password input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Try different selectors for submit button
    const buttonSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Login")',
      'button:has-text("Log in")',
      'button:has-text("Sign In")',
      'button:has-text("Submit")'
    ];
    
    for (const selector of buttonSelectors) {
      try {
        submitButton = await page.$(selector);
        if (submitButton) {
          console.log(`Found submit button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (emailInput && passwordInput) {
      console.log('=== ATTEMPTING AUTHENTICATION ===');
      
      // Clear and fill email
      await emailInput.click();
      await emailInput.fill('');
      await emailInput.type('jayveedz19@gmail.com');
      console.log('Email entered');
      
      // Clear and fill password
      await passwordInput.click();
      await passwordInput.fill('');
      await passwordInput.type('Jimkali90#');
      console.log('Password entered');
      
      // Take screenshot before submission
      await page.screenshot({ path: 'auth-debug-before-submit.png', fullPage: true });
      
      // Clear network logs to focus on auth request
      networkLogs.length = 0;
      consoleLogs.length = 0;
      
      console.log('=== SUBMITTING FORM ===');
      
      if (submitButton) {
        await submitButton.click();
      } else {
        // Try pressing Enter on password field
        await passwordInput.press('Enter');
      }
      
      // Wait for network requests and responses
      await page.waitForTimeout(5000);
      
      // Take screenshot after submission
      await page.screenshot({ path: 'auth-debug-after-submit.png', fullPage: true });
      
    } else {
      console.log('Could not find authentication form elements');
      console.log('Email input found:', !!emailInput);
      console.log('Password input found:', !!passwordInput);
      
      // Try to find any Supabase auth components
      const supabaseElements = await page.evaluate(() => {
        return {
          supabaseAuthDivs: Array.from(document.querySelectorAll('div')).filter(div => 
            div.className?.includes('supabase') || 
            div.textContent?.includes('supabase') ||
            div.textContent?.includes('Sign in') ||
            div.textContent?.includes('Email')
          ).map(div => ({
            className: div.className,
            textContent: div.textContent?.substring(0, 100),
            innerHTML: div.innerHTML?.substring(0, 200)
          }))
        };
      });
      
      console.log('Supabase-related elements:', JSON.stringify(supabaseElements, null, 2));
    }
    
    // Wait a bit more for any delayed requests
    await page.waitForTimeout(3000);
    
    // Take final screenshot
    await page.screenshot({ path: 'auth-debug-final.png', fullPage: true });
    
  } catch (error) {
    console.error('Error during auth debug:', error);
    await page.screenshot({ path: 'auth-debug-error.png', fullPage: true });
  }
  
  // Output summary
  console.log('\n=== DEBUG SUMMARY ===');
  console.log(`Total console logs: ${consoleLogs.length}`);
  console.log(`Total network logs: ${networkLogs.length}`);
  
  console.log('\n=== CONSOLE ERRORS ===');
  consoleLogs.filter(log => log.type === 'error').forEach(log => {
    console.log(`[${log.timestamp}] ${log.text}`);
    if (log.location) {
      console.log(`  Location: ${log.location.url}:${log.location.lineNumber}`);
    }
  });
  
  console.log('\n=== FAILED REQUESTS ===');
  networkLogs.filter(log => log.type === 'failed').forEach(log => {
    console.log(`[${log.timestamp}] ${log.method} ${log.url}`);
    console.log(`  Failure: ${log.failure?.errorText}`);
  });
  
  console.log('\n=== AUTH-RELATED REQUESTS ===');
  networkLogs.filter(log => 
    log.url?.includes('supabase') || 
    log.url?.includes('auth') ||
    log.url?.includes('login') ||
    log.url?.includes('sign')
  ).forEach(log => {
    console.log(`[${log.timestamp}] ${log.type.toUpperCase()} ${log.method || ''} ${log.url}`);
    if (log.status) console.log(`  Status: ${log.status} ${log.statusText}`);
    if (log.headers) console.log(`  Headers:`, JSON.stringify(log.headers, null, 2));
    if (log.failure) console.log(`  Failure: ${log.failure.errorText}`);
  });
  
  console.log('\n=== ALL NETWORK REQUESTS ===');
  networkLogs.forEach(log => {
    console.log(`[${log.timestamp}] ${log.type.toUpperCase()} ${log.method || ''} ${log.url}`);
    if (log.status) console.log(`  Status: ${log.status} ${log.statusText}`);
    if (log.failure) console.log(`  Failure: ${log.failure.errorText}`);
  });
  
  // Save detailed logs to files
  require('fs').writeFileSync('console-logs.json', JSON.stringify(consoleLogs, null, 2));
  require('fs').writeFileSync('network-logs.json', JSON.stringify(networkLogs, null, 2));
  
  await browser.close();
  
  return {
    consoleLogs,
    networkLogs,
    authElements: authElements || {}
  };
}

// Run the debug session
debugAuthFlow().then(() => {
  console.log('\n=== AUTH DEBUG COMPLETE ===');
  console.log('Check the generated files:');
  console.log('- auth-debug-*.png (screenshots)');
  console.log('- console-logs.json (all console output)');
  console.log('- network-logs.json (all network activity)');
}).catch(console.error);