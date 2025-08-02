const { chromium } = require('playwright');

async function freshAuthTest() {
  console.log('Starting Fresh Authentication Test (No Cache)...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  
  // Create a fresh context with no cache
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    // Force no cache
    extraHTTPHeaders: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
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

  // Monitor successful network requests
  page.on('response', response => {
    if (response.url().includes('supabase') || response.url().includes('auth')) {
      console.log(`📡 Response: ${response.status()} ${response.url()}`);
    }
  });

  try {
    // Navigate with cache-busting
    console.log('\n========== FRESH AUTHENTICATION TEST ==========');
    
    const timestamp = Date.now();
    await page.goto(`http://18.221.12.50?_cb=${timestamp}`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.screenshot({ 
      path: '/tmp/clixen-fresh-01-landing.png', 
      fullPage: true 
    });
    
    console.log('✅ Fresh landing page loaded');
    console.log('Current URL:', page.url());

    // Navigate to auth
    const getStartedButton = await page.$('text=Get Started');
    if (getStartedButton) {
      await getStartedButton.click();
      await page.waitForTimeout(3000);
      console.log('✅ Navigated to auth page');
    }
    
    await page.screenshot({ 
      path: '/tmp/clixen-fresh-02-auth.png', 
      fullPage: true 
    });

    // Switch to login if needed
    const pageText = await page.textContent('body');
    if (pageText.includes('Create Account')) {
      const signInLink = await page.$('text=Already have an account? Sign in');
      if (signInLink) {
        await signInLink.click();
        await page.waitForTimeout(2000);
        console.log('✅ Switched to login form');
      }
    }

    await page.screenshot({ 
      path: '/tmp/clixen-fresh-03-login-form.png', 
      fullPage: true 
    });

    // Fill and submit login
    console.log('Filling login credentials...');
    
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    
    if (emailInput && passwordInput) {
      await emailInput.fill('jayveedz19@gmail.com');
      await passwordInput.fill('Jimkali90#');
      
      await page.screenshot({ 
        path: '/tmp/clixen-fresh-04-credentials.png', 
        fullPage: true 
    });
      
      console.log('✅ Credentials filled, submitting...');

      const loginButton = await page.$('button:has-text("Sign In")') || 
                         await page.$('button[type="submit"]');
      
      if (loginButton) {
        await loginButton.click();
        
        // Wait for auth response
        await page.waitForTimeout(5000);
        
        await page.screenshot({ 
          path: '/tmp/clixen-fresh-05-after-submit.png', 
          fullPage: true 
        });
        
        console.log('Current URL after login:', page.url());
        
        // Check for success
        if (page.url().includes('dashboard') || page.url().includes('chat') || page.url().includes('app')) {
          console.log('🎉 LOGIN SUCCESSFUL! Redirected to authenticated area');
          
          await page.screenshot({ 
            path: '/tmp/clixen-fresh-06-success.png', 
            fullPage: true 
          });
          
          // Test logout
          const logoutButton = await page.$('text=Logout') || 
                              await page.$('text=Sign Out') ||
                              await page.$('button:has-text("Logout")');
          
          if (logoutButton) {
            console.log('Testing logout...');
            await logoutButton.click();
            await page.waitForTimeout(2000);
            
            await page.screenshot({ 
              path: '/tmp/clixen-fresh-07-logout.png', 
              fullPage: true 
            });
            
            console.log('URL after logout:', page.url());
          }
          
        } else {
          console.log('Login form submitted, checking for errors...');
          
          // Check for auth token in storage
          const authCheck = await page.evaluate(() => {
            const items = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key.includes('auth') || key.includes('supabase')) {
                items.push({ key, value: localStorage.getItem(key).substring(0, 100) + '...' });
              }
            }
            return items;
          });
          
          if (authCheck.length > 0) {
            console.log('🎉 Authentication successful - found auth tokens in localStorage:');
            authCheck.forEach(item => {
              console.log(`- ${item.key}: ${item.value}`);
            });
          } else {
            console.log('❌ No authentication tokens found');
          }
        }

      } else {
        console.log('❌ Login button not found');
      }
    } else {
      console.log('❌ Login form inputs not found');
    }

    // Summary of console errors
    const errors = consoleMessages.filter(msg => msg.type === 'error');
    if (errors.length > 0) {
      console.log('\n========== CONSOLE ERRORS ==========');
      errors.forEach(error => {
        console.log(`❌ ${error.text}`);
      });
    } else {
      console.log('\n✅ No console errors detected');
    }

    console.log('\n========== FRESH AUTHENTICATION TEST COMPLETED ==========');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ 
      path: '/tmp/clixen-fresh-error.png', 
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

// Run the fresh test
freshAuthTest().catch(console.error);