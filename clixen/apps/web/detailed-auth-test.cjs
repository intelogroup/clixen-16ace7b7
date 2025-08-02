const { chromium } = require('playwright');

async function detailedAuthTest() {
  console.log('Starting Detailed Clixen Authentication Test with Console Monitoring...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Monitor console for errors
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
    console.log(`Console ${msg.type()}: ${msg.text()}`);
  });

  // Monitor network errors
  page.on('requestfailed', request => {
    console.log(`❌ Network request failed: ${request.url()} - ${request.failure().errorText}`);
  });

  try {
    // Step 1: Navigate to landing page
    console.log('\n========== STEP 1: LANDING PAGE ==========');
    
    await page.goto('http://18.221.12.50', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.screenshot({ 
      path: '/tmp/clixen-01-landing.png', 
      fullPage: true 
    });
    
    console.log('✅ Landing page loaded successfully');
    console.log('Current URL:', page.url());

    // Step 2: Navigate to auth page
    console.log('\n========== STEP 2: NAVIGATE TO AUTH ==========');
    
    const getStartedButton = await page.$('text=Get Started');
    if (getStartedButton) {
      await getStartedButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Clicked "Get Started" button');
    }
    
    await page.screenshot({ 
      path: '/tmp/clixen-02-auth-page.png', 
      fullPage: true 
    });
    
    console.log('Current URL after navigation:', page.url());

    // Step 3: Test Login Process
    console.log('\n========== STEP 3: LOGIN PROCESS ==========');
    
    // Check if we need to switch to login view
    const signInText = await page.textContent('body');
    if (signInText.includes('Create Account') && !signInText.includes('Welcome Back')) {
      console.log('Currently on signup page, switching to login...');
      const signInLink = await page.$('text=Already have an account? Sign in');
      if (signInLink) {
        await signInLink.click();
        await page.waitForTimeout(2000);
        console.log('✅ Switched to login view');
      }
    }

    await page.screenshot({ 
      path: '/tmp/clixen-03-login-form.png', 
      fullPage: true 
    });

    // Fill login credentials
    console.log('Filling login credentials...');
    
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    
    if (emailInput && passwordInput) {
      await emailInput.fill('');
      await emailInput.fill('jayveedz19@gmail.com');
      
      await passwordInput.fill('');
      await passwordInput.fill('Jimkali90#');
      
      await page.screenshot({ 
        path: '/tmp/clixen-04-credentials-filled.png', 
        fullPage: true 
      });
      
      console.log('✅ Credentials filled');

      // Submit the form
      console.log('Submitting login form...');
      
      const loginButton = await page.$('button:has-text("Sign In")') || 
                         await page.$('button[type="submit"]');
      
      if (loginButton) {
        // Monitor network requests during login
        const requests = [];
        page.on('request', request => {
          if (request.url().includes('auth') || request.url().includes('login') || request.url().includes('supabase')) {
            requests.push({
              url: request.url(),
              method: request.method(),
              headers: request.headers()
            });
            console.log(`📡 Request: ${request.method()} ${request.url()}`);
          }
        });

        page.on('response', response => {
          if (response.url().includes('auth') || response.url().includes('login') || response.url().includes('supabase')) {
            console.log(`📡 Response: ${response.status()} ${response.url()}`);
          }
        });

        await loginButton.click();
        
        // Wait for potential navigation or error
        await page.waitForTimeout(5000);
        
        await page.screenshot({ 
          path: '/tmp/clixen-05-after-login-submit.png', 
          fullPage: true 
        });
        
        console.log('Current URL after login attempt:', page.url());
        
        // Check for success indicators
        const currentBody = await page.textContent('body');
        if (page.url().includes('dashboard') || page.url().includes('chat') || page.url().includes('app')) {
          console.log('🎉 Login successful - redirected to authenticated area');
          
          // Take screenshot of authenticated page
          await page.screenshot({ 
            path: '/tmp/clixen-06-authenticated-page.png', 
            fullPage: true 
          });
          
        } else if (currentBody.includes('Invalid') || currentBody.includes('error') || currentBody.includes('failed')) {
          console.log('❌ Login failed with error message');
          
          // Look for specific error messages
          const errorElements = await page.$$('.error, .alert, [class*="error"], .text-red');
          for (let element of errorElements) {
            const text = await element.textContent();
            if (text && text.trim()) {
              console.log('Error message:', text.trim());
            }
          }
        } else {
          console.log('⚠️ Login form submitted but no clear success/error indication');
        }

        // Check local storage for auth tokens
        const authData = await page.evaluate(() => {
          return {
            localStorage: localStorage.getItem('supabase.auth.token') || localStorage.getItem('auth'),
            sessionStorage: sessionStorage.getItem('supabase.auth.token') || sessionStorage.getItem('auth'),
            cookies: document.cookie
          };
        });
        
        console.log('Auth data check:');
        console.log('- localStorage:', authData.localStorage ? 'Has auth data' : 'No auth data');
        console.log('- sessionStorage:', authData.sessionStorage ? 'Has auth data' : 'No auth data');
        console.log('- cookies:', authData.cookies ? 'Has cookies' : 'No cookies');

      } else {
        console.log('❌ No login button found');
      }
    } else {
      console.log('❌ Email or password input not found');
    }

    // Step 4: Test Protected Routes
    console.log('\n========== STEP 4: TEST PROTECTED ROUTES ==========');
    
    const routesToTest = ['/dashboard', '/chat', '/app'];
    
    for (const route of routesToTest) {
      console.log(`Testing route: ${route}`);
      try {
        await page.goto(`http://18.221.12.50${route}`, { 
          waitUntil: 'networkidle',
          timeout: 10000 
        });
        
        await page.screenshot({ 
          path: `/tmp/clixen-route-${route.replace('/', '')}.png`, 
          fullPage: true 
        });
        
        console.log(`✅ Route ${route} accessible, current URL: ${page.url()}`);
      } catch (error) {
        console.log(`❌ Route ${route} failed: ${error.message}`);
      }
    }

    // Summary
    console.log('\n========== CONSOLE MESSAGES SUMMARY ==========');
    consoleMessages.forEach(msg => {
      if (msg.type === 'error') {
        console.log(`❌ Console Error: ${msg.text}`);
      }
    });

    console.log('\n========== DETAILED AUTHENTICATION TEST COMPLETED ==========');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ 
      path: '/tmp/clixen-test-error.png', 
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

// Run the detailed test
detailedAuthTest().catch(console.error);