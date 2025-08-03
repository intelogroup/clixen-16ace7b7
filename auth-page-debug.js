const { chromium } = require('playwright');

async function debugAuthPage() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor', '--no-sandbox']
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
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
    console.log('=== AUTH PAGE DEBUG SESSION ===');
    
    // Navigate directly to auth page
    console.log('Navigating to http://18.221.12.50/auth...');
    await page.goto('http://18.221.12.50/auth', { waitUntil: 'networkidle' });
    
    // Take screenshot
    await page.screenshot({ path: 'auth-page-debug.png', fullPage: true });
    console.log('Auth page screenshot taken');
    
    // Wait for dynamic content to load
    await page.waitForTimeout(5000);
    
    // Get comprehensive page analysis
    const pageAnalysis = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        html: document.documentElement.innerHTML,
        bodyText: document.body?.textContent || '',
        
        // All form elements
        forms: Array.from(document.querySelectorAll('form')).map(form => ({
          action: form.action,
          method: form.method,
          id: form.id,
          className: form.className,
          innerHTML: form.innerHTML.substring(0, 1000)
        })),
        
        // All input elements
        inputs: Array.from(document.querySelectorAll('input')).map(input => ({
          type: input.type,
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
          value: input.value,
          className: input.className,
          required: input.required
        })),
        
        // All buttons
        buttons: Array.from(document.querySelectorAll('button')).map(button => ({
          type: button.type,
          textContent: button.textContent?.trim(),
          id: button.id,
          className: button.className,
          disabled: button.disabled
        })),
        
        // All divs (for React components)
        divs: Array.from(document.querySelectorAll('div')).map(div => ({
          id: div.id,
          className: div.className,
          textContent: div.textContent?.trim().substring(0, 200),
          innerHTML: div.innerHTML.substring(0, 300)
        })).filter(div => div.className || div.id || div.textContent),
        
        // Check for Supabase or auth-related scripts
        scripts: Array.from(document.querySelectorAll('script')).map(script => ({
          src: script.src,
          innerHTML: script.innerHTML?.substring(0, 500)
        })),
        
        // Check for auth-related global variables
        globals: {
          supabase: typeof window.supabase,
          auth: typeof window.auth,
          __NEXT_DATA__: typeof window.__NEXT_DATA__,
          React: typeof window.React,
          ReactDOM: typeof window.ReactDOM
        }
      };
    });
    
    console.log('=== PAGE ANALYSIS ===');
    console.log('Title:', pageAnalysis.title);
    console.log('URL:', pageAnalysis.url);
    console.log('Body Text Preview:', pageAnalysis.bodyText.substring(0, 500));
    console.log('Forms found:', pageAnalysis.forms.length);
    console.log('Inputs found:', pageAnalysis.inputs.length);
    console.log('Buttons found:', pageAnalysis.buttons.length);
    
    console.log('\n=== FORMS ===');
    pageAnalysis.forms.forEach((form, i) => {
      console.log(`Form ${i}:`, JSON.stringify(form, null, 2));
    });
    
    console.log('\n=== INPUTS ===');
    pageAnalysis.inputs.forEach((input, i) => {
      console.log(`Input ${i}:`, JSON.stringify(input, null, 2));
    });
    
    console.log('\n=== BUTTONS ===');
    pageAnalysis.buttons.forEach((button, i) => {
      console.log(`Button ${i}:`, JSON.stringify(button, null, 2));
    });
    
    console.log('\n=== GLOBAL VARIABLES ===');
    console.log(JSON.stringify(pageAnalysis.globals, null, 2));
    
    // Look for email and password inputs specifically
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    
    if (emailInput && passwordInput) {
      console.log('\n=== FOUND AUTH FORM - ATTEMPTING LOGIN ===');
      
      // Clear previous network logs to focus on auth requests
      networkLogs.length = 0;
      consoleLogs.length = 0;
      
      // Fill in the credentials
      await emailInput.fill('jayveedz19@gmail.com');
      await passwordInput.fill('Jimkali90#');
      
      console.log('Credentials filled');
      
      // Take screenshot with filled form
      await page.screenshot({ path: 'auth-page-filled.png', fullPage: true });
      
      // Look for submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Sign")',
        'button:has-text("Login")',
        'button:has-text("Continue")',
        'form button'
      ];
      
      let submitButton = null;
      for (const selector of submitSelectors) {
        try {
          submitButton = await page.$(selector);
          if (submitButton) {
            console.log(`Found submit button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }
      
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
      await page.screenshot({ path: 'auth-page-submitted.png', fullPage: true });
      
      // Check current URL and page state
      const postAuthState = await page.evaluate(() => ({
        url: window.location.href,
        title: document.title,
        bodyText: document.body?.textContent?.substring(0, 1000)
      }));
      
      console.log('\n=== POST-AUTH STATE ===');
      console.log('URL:', postAuthState.url);
      console.log('Title:', postAuthState.title);
      console.log('Body text:', postAuthState.bodyText);
      
    } else {
      console.log('\n=== NO AUTH FORM FOUND ===');
      console.log('Email input found:', !!emailInput);
      console.log('Password input found:', !!passwordInput);
      
      // Save the full HTML for analysis
      require('fs').writeFileSync('auth-page-html.html', pageAnalysis.html);
      console.log('Full HTML saved to auth-page-html.html');
    }
    
  } catch (error) {
    console.error('Error during auth page debug:', error);
    await page.screenshot({ path: 'auth-page-error.png', fullPage: true });
  }
  
  // Output network analysis
  console.log('\n=== NETWORK ANALYSIS ===');
  console.log(`Total requests: ${networkLogs.filter(log => log.type === 'request').length}`);
  console.log(`Total responses: ${networkLogs.filter(log => log.type === 'response').length}`);
  console.log(`Failed requests: ${networkLogs.filter(log => log.type === 'failed').length}`);
  
  // Show all requests
  console.log('\n=== ALL REQUESTS ===');
  networkLogs.forEach(log => {
    if (log.type === 'request') {
      console.log(`REQUEST: ${log.method} ${log.url}`);
      if (log.postData) {
        console.log(`  Post Data: ${log.postData.substring(0, 200)}`);
      }
    } else if (log.type === 'response') {
      console.log(`RESPONSE: ${log.status} ${log.url}`);
      if (log.headers && Object.keys(log.headers).length > 0) {
        console.log(`  Key Headers: ${JSON.stringify({
          'content-type': log.headers['content-type'],
          'access-control-allow-origin': log.headers['access-control-allow-origin']
        })}`);
      }
    } else if (log.type === 'failed') {
      console.log(`FAILED: ${log.method} ${log.url} - ${log.failure?.errorText}`);
    }
  });
  
  // Show console errors
  console.log('\n=== CONSOLE ERRORS ===');
  consoleLogs.filter(log => log.type === 'error').forEach(log => {
    console.log(`ERROR: ${log.text}`);
    if (log.location) {
      console.log(`  Location: ${log.location.url}:${log.location.lineNumber}`);
    }
  });
  
  // Save logs
  require('fs').writeFileSync('auth-page-console-logs.json', JSON.stringify(consoleLogs, null, 2));
  require('fs').writeFileSync('auth-page-network-logs.json', JSON.stringify(networkLogs, null, 2));
  
  await browser.close();
  
  return { consoleLogs, networkLogs };
}

// Run the auth page debug
debugAuthPage().then(() => {
  console.log('\n=== AUTH PAGE DEBUG COMPLETE ===');
}).catch(console.error);