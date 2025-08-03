const { chromium } = require('playwright');

async function enhancedAuthDebug() {
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
    console.log('=== ENHANCED AUTH DEBUG SESSION ===');
    
    // Navigate to the application
    console.log('Navigating to http://18.221.12.50...');
    await page.goto('http://18.221.12.50', { waitUntil: 'networkidle' });
    
    // Take initial screenshot
    await page.screenshot({ path: 'enhanced-debug-initial.png', fullPage: true });
    console.log('Initial screenshot taken');
    
    // Get page content and analyze
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        html: document.documentElement.outerHTML.substring(0, 5000),
        allText: document.body?.textContent?.substring(0, 2000),
        allButtons: Array.from(document.querySelectorAll('button, a[role="button"], input[type="submit"]')).map(el => ({
          text: el.textContent?.trim(),
          href: el.href,
          className: el.className,
          id: el.id,
          type: el.type
        })),
        allLinks: Array.from(document.querySelectorAll('a')).map(el => ({
          text: el.textContent?.trim(),
          href: el.href,
          className: el.className
        })),
        allInputs: Array.from(document.querySelectorAll('input')).map(el => ({
          type: el.type,
          name: el.name,
          placeholder: el.placeholder,
          className: el.className,
          id: el.id
        }))
      };
    });
    
    console.log('Page Title:', pageContent.title);
    console.log('Page URL:', pageContent.url);
    console.log('Page Text Preview:', pageContent.allText?.substring(0, 500));
    console.log('All Buttons:', JSON.stringify(pageContent.allButtons, null, 2));
    console.log('All Links:', JSON.stringify(pageContent.allLinks, null, 2));
    console.log('All Inputs:', JSON.stringify(pageContent.allInputs, null, 2));
    
    // Look for "View Demo" button and click it
    const viewDemoButton = await page.$('button:has-text("View Demo")');
    if (viewDemoButton) {
      console.log('=== CLICKING VIEW DEMO BUTTON ===');
      await viewDemoButton.click();
      await page.waitForTimeout(3000);
      
      // Take screenshot after clicking
      await page.screenshot({ path: 'enhanced-debug-after-demo-click.png', fullPage: true });
      
      // Check what happened after clicking
      const postClickContent = await page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          allText: document.body?.textContent?.substring(0, 2000),
          authElements: {
            emailInputs: Array.from(document.querySelectorAll('input[type="email"], input[name*="email"], input[placeholder*="email" i]')).length,
            passwordInputs: Array.from(document.querySelectorAll('input[type="password"], input[name*="password"]')).length,
            signInButtons: Array.from(document.querySelectorAll('button, a')).filter(el => 
              el.textContent?.toLowerCase().includes('sign in') ||
              el.textContent?.toLowerCase().includes('login') ||
              el.textContent?.toLowerCase().includes('log in')
            ).map(el => ({
              text: el.textContent?.trim(),
              href: el.href,
              className: el.className
            }))
          }
        };
      });
      
      console.log('Post-click URL:', postClickContent.url);
      console.log('Post-click Title:', postClickContent.title);
      console.log('Post-click Auth Elements:', JSON.stringify(postClickContent.authElements, null, 2));
    }
    
    // Try to find any authentication-related URLs or patterns
    const potentialAuthUrls = [
      'http://18.221.12.50/auth',
      'http://18.221.12.50/login',
      'http://18.221.12.50/signin',
      'http://18.221.12.50/sign-in'
    ];
    
    for (const url of potentialAuthUrls) {
      console.log(`=== TESTING URL: ${url} ===`);
      try {
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
        console.log(`Response status for ${url}: ${response.status()}`);
        
        if (response.status() === 200) {
          await page.screenshot({ path: `enhanced-debug-${url.split('/').pop()}.png`, fullPage: true });
          
          const authPageContent = await page.evaluate(() => {
            return {
              title: document.title,
              authElements: {
                emailInputs: Array.from(document.querySelectorAll('input[type="email"], input[name*="email"], input[placeholder*="email" i]')).map(el => ({
                  type: el.type,
                  name: el.name,
                  placeholder: el.placeholder,
                  id: el.id,
                  className: el.className
                })),
                passwordInputs: Array.from(document.querySelectorAll('input[type="password"], input[name*="password"]')).map(el => ({
                  type: el.type,
                  name: el.name,
                  placeholder: el.placeholder,
                  id: el.id,
                  className: el.className
                })),
                submitButtons: Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"], button:has-text("Sign"), button:has-text("Login")')).map(el => ({
                  text: el.textContent?.trim(),
                  type: el.type,
                  className: el.className
                }))
              }
            };
          });
          
          console.log(`Auth elements on ${url}:`, JSON.stringify(authPageContent.authElements, null, 2));
          
          // If we found auth elements, try to authenticate
          if (authPageContent.authElements.emailInputs.length > 0 && authPageContent.authElements.passwordInputs.length > 0) {
            console.log(`=== ATTEMPTING AUTHENTICATION ON ${url} ===`);
            
            // Clear network logs to focus on auth requests
            networkLogs.length = 0;
            consoleLogs.length = 0;
            
            const emailInput = await page.$('input[type="email"], input[name*="email"], input[placeholder*="email" i]');
            const passwordInput = await page.$('input[type="password"], input[name*="password"]');
            const submitButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("Sign"), button:has-text("Login")');
            
            if (emailInput && passwordInput) {
              await emailInput.fill('jayveedz19@gmail.com');
              await passwordInput.fill('Jimkali90#');
              
              await page.screenshot({ path: `enhanced-debug-${url.split('/').pop()}-filled.png`, fullPage: true });
              
              if (submitButton) {
                await submitButton.click();
              } else {
                await passwordInput.press('Enter');
              }
              
              // Wait for authentication response
              await page.waitForTimeout(5000);
              
              await page.screenshot({ path: `enhanced-debug-${url.split('/').pop()}-submitted.png`, fullPage: true });
              
              console.log('Authentication attempted, checking results...');
              break; // Found and attempted auth, no need to try other URLs
            }
          }
        }
      } catch (error) {
        console.log(`Error accessing ${url}:`, error.message);
      }
    }
    
    // Check for any React Router or SPA auth handling
    console.log('=== CHECKING FOR SPA AUTH PATTERNS ===');
    
    // Go back to main page and look for JavaScript-based auth
    await page.goto('http://18.221.12.50', { waitUntil: 'networkidle' });
    
    const jsAuthCheck = await page.evaluate(() => {
      return {
        // Check for common auth libraries
        hasSupabase: typeof window.supabase !== 'undefined',
        hasAuth0: typeof window.auth0 !== 'undefined',
        hasFirebase: typeof window.firebase !== 'undefined',
        
        // Check for environment variables or config
        envVars: Object.keys(window).filter(key => key.includes('env') || key.includes('config')),
        
        // Check for auth-related global variables
        authVars: Object.keys(window).filter(key => 
          key.toLowerCase().includes('auth') || 
          key.toLowerCase().includes('user') ||
          key.toLowerCase().includes('session')
        ),
        
        // Look for React components or auth state
        reactFiber: !!document.querySelector('[data-reactroot]'),
        
        // Check localStorage for auth tokens
        localStorage: Object.keys(localStorage).filter(key =>
          key.includes('auth') || 
          key.includes('token') || 
          key.includes('session') ||
          key.includes('supabase')
        )
      };
    });
    
    console.log('JavaScript Auth Check:', JSON.stringify(jsAuthCheck, null, 2));
    
    // Wait for any delayed requests
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('Error during enhanced auth debug:', error);
    await page.screenshot({ path: 'enhanced-debug-error.png', fullPage: true });
  }
  
  // Output detailed summary
  console.log('\n=== ENHANCED DEBUG SUMMARY ===');
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
  
  console.log('\n=== SUPABASE/AUTH REQUESTS ===');
  networkLogs.filter(log => 
    log.url?.includes('supabase') || 
    log.url?.includes('auth') ||
    log.url?.includes('login') ||
    log.url?.includes('session') ||
    log.url?.includes('token')
  ).forEach(log => {
    console.log(`[${log.timestamp}] ${log.type.toUpperCase()} ${log.method || ''} ${log.url}`);
    if (log.status) console.log(`  Status: ${log.status} ${log.statusText}`);
    if (log.headers && (log.headers.authorization || log.headers.apikey)) {
      console.log(`  Auth Headers: ${JSON.stringify({
        authorization: log.headers.authorization ? '[REDACTED]' : undefined,
        apikey: log.headers.apikey ? '[REDACTED]' : undefined
      })}`);
    }
    if (log.failure) console.log(`  Failure: ${log.failure.errorText}`);
  });
  
  // Save detailed logs
  require('fs').writeFileSync('enhanced-console-logs.json', JSON.stringify(consoleLogs, null, 2));
  require('fs').writeFileSync('enhanced-network-logs.json', JSON.stringify(networkLogs, null, 2));
  
  await browser.close();
  
  return { consoleLogs, networkLogs };
}

// Run the enhanced debug session
enhancedAuthDebug().then(() => {
  console.log('\n=== ENHANCED AUTH DEBUG COMPLETE ===');
  console.log('Check the generated files:');
  console.log('- enhanced-debug-*.png (screenshots)');
  console.log('- enhanced-console-logs.json (all console output)');
  console.log('- enhanced-network-logs.json (all network activity)');
}).catch(console.error);