const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testAuthForm(page, screenshotsDir) {
  console.log('\n🔐 Testing authentication form...');
  
  // Find email and password inputs
  const emailInput = await page.$('input[type="email"], input[placeholder*="email" i], input[name="email"]');
  const passwordInput = await page.$('input[type="password"], input[placeholder*="password" i], input[name="password"]');
  
  if (emailInput && passwordInput) {
    console.log('📧 Found email and password inputs - filling credentials');
    
    // Clear and fill email
    await emailInput.click({ clickCount: 3 });
    await emailInput.fill('jayveedz19@gmail.com');
    
    // Clear and fill password
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.fill('Jimkali90#');
    
    // Take screenshot after filling
    await page.screenshot({ 
      path: path.join(screenshotsDir, '09-credentials-filled.png'),
      fullPage: true 
    });
    
    // Look for submit button
    const submitButton = await page.$('button[type="submit"], button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log In"), .auth-submit, .login-button');
    
    if (submitButton) {
      console.log('🔘 Found submit button - attempting login');
      
      // Click submit and wait for response
      await Promise.all([
        page.waitForLoadState('networkidle'),
        submitButton.click()
      ]);
      
      // Wait for potential redirect or response
      await page.waitForTimeout(5000);
      
      // Take screenshot after login attempt
      await page.screenshot({ 
        path: path.join(screenshotsDir, '10-after-login-attempt.png'),
        fullPage: true 
      });
      
      // Check URL change and page content
      const currentUrl = page.url();
      console.log(`URL after login attempt: ${currentUrl}`);
      
      // Look for success indicators
      const successIndicators = [
        'dashboard',
        'welcome',
        'workspace',
        'workflows',
        'profile',
        'logout',
        'settings'
      ];
      
      let loginSuccess = false;
      for (const indicator of successIndicators) {
        const element = await page.$(`text=${indicator}`);
        if (element) {
          console.log(`✅ Found success indicator: ${indicator}`);
          loginSuccess = true;
          break;
        }
      }
      
      // Check for error messages
      const errorSelectors = [
        '.error',
        '.alert-error',
        '[data-testid*="error"]',
        '.notification.error',
        '.toast.error'
      ];
      
      for (const selector of errorSelectors) {
        const errorEl = await page.$(selector);
        if (errorEl) {
          const errorText = await errorEl.textContent();
          console.log(`❌ Error found: ${errorText}`);
        }
      }
      
      if (loginSuccess) {
        console.log('🎉 Login appears successful!');
        await page.screenshot({ 
          path: path.join(screenshotsDir, '11-login-success.png'),
          fullPage: true 
        });
      } else {
        console.log('⚠️ Login result unclear - checking for any changes');
        const bodyText = await page.textContent('body');
        console.log(`Page content after login: ${bodyText.substring(0, 200)}...`);
      }
      
      return loginSuccess;
      
    } else {
      console.log('❌ No submit button found');
      
      // List all buttons to help debug
      const buttons = await page.$$('button');
      console.log(`Found ${buttons.length} buttons on the form`);
      
      for (let i = 0; i < Math.min(buttons.length, 5); i++) {
        const buttonText = await buttons[i].textContent();
        const buttonType = await buttons[i].getAttribute('type');
        console.log(`Button ${i + 1}: "${buttonText}" (type: ${buttonType})`);
      }
      
      return false;
    }
    
  } else {
    console.log('❌ Could not find email and/or password inputs');
    
    // Debug: show all inputs on the page
    const allInputs = await page.$$('input');
    console.log(`Found ${allInputs.length} input fields:`);
    
    for (let i = 0; i < allInputs.length; i++) {
      const inputType = await allInputs[i].getAttribute('type');
      const inputPlaceholder = await allInputs[i].getAttribute('placeholder');
      const inputName = await allInputs[i].getAttribute('name');
      console.log(`Input ${i + 1}: type="${inputType}", placeholder="${inputPlaceholder}", name="${inputName}"`);
    }
    
    return false;
  }
}

async function testAuthenticationFlow() {
  console.log('🚀 Starting authentication flow test for http://18.221.12.50');
  
  // Create screenshots directory
  const screenshotsDir = '/root/repo/auth-test-screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Linux; x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // Collect console messages and errors
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
    console.log(`Console ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    console.error(`Page Error: ${error.message}`);
  });
  
  try {
    console.log('\n📍 Step 1: Navigating to http://18.221.12.50');
    
    // Navigate to the production URL
    await page.goto('http://18.221.12.50', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Take initial screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-initial-page-load.png'),
      fullPage: true 
    });
    
    console.log('✅ Successfully loaded the page');
    
    // Wait for the page to fully load and check for auth forms
    await page.waitForTimeout(3000);
    
    // Check what's visible on the page
    const pageTitle = await page.title();
    const url = page.url();
    console.log(`Page Title: ${pageTitle}`);
    console.log(`Current URL: ${url}`);
    
    // Look for authentication elements
    const loginForm = await page.$('form, [data-testid*="login"], [data-testid*="auth"], input[type="email"]');
    const emailInput = await page.$('input[type="email"], input[placeholder*="email" i], input[name="email"]');
    const passwordInput = await page.$('input[type="password"], input[placeholder*="password" i], input[name="password"]');
    
    if (loginForm || emailInput || passwordInput) {
      console.log('\n🔐 Step 2: Authentication form detected - Testing login flow');
      
      // Take screenshot of auth form
      await page.screenshot({ 
        path: path.join(screenshotsDir, '02-auth-form-detected.png'),
        fullPage: true 
      });
      
      if (emailInput && passwordInput) {
        console.log('📧 Found email and password inputs - attempting login');
        
        // Fill in the credentials
        await emailInput.fill('jayveedz19@gmail.com');
        await passwordInput.fill('Jimkali90#');
        
        // Take screenshot after filling credentials
        await page.screenshot({ 
          path: path.join(screenshotsDir, '03-credentials-filled.png'),
          fullPage: true 
        });
        
        // Look for submit button
        const submitButton = await page.$('button[type="submit"], button:has-text("sign in" i), button:has-text("login" i), button:has-text("log in" i)');
        
        if (submitButton) {
          console.log('🔘 Found submit button - clicking to login');
          
          // Click submit and wait for response
          await Promise.all([
            page.waitForLoadState('networkidle'),
            submitButton.click()
          ]);
          
          // Wait for potential redirect or response
          await page.waitForTimeout(5000);
          
          // Take screenshot after login attempt
          await page.screenshot({ 
            path: path.join(screenshotsDir, '04-after-login-attempt.png'),
            fullPage: true 
          });
          
          // Check if we're on a dashboard or success page
          const currentUrl = page.url();
          console.log(`URL after login attempt: ${currentUrl}`);
          
          // Look for success indicators
          const dashboardElements = await page.$$('nav, [data-testid*="dashboard"], .dashboard, #dashboard');
          const errorMessages = await page.$$('.error, [data-testid*="error"], .alert-error');
          
          if (dashboardElements.length > 0) {
            console.log('✅ Login appears successful - dashboard elements detected');
            await page.screenshot({ 
              path: path.join(screenshotsDir, '05-login-success-dashboard.png'),
              fullPage: true 
            });
          } else if (errorMessages.length > 0) {
            console.log('❌ Login failed - error messages detected');
            for (const errorEl of errorMessages) {
              const errorText = await errorEl.textContent();
              console.log(`Error: ${errorText}`);
            }
          } else {
            console.log('⚠️ Login result unclear - checking page content');
            const bodyText = await page.textContent('body');
            console.log(`Page content preview: ${bodyText.substring(0, 200)}...`);
          }
          
        } else {
          console.log('❌ No submit button found');
          
          // Try to find any clickable elements that might be the submit
          const buttons = await page.$$('button, input[type="submit"], .btn, [role="button"]');
          console.log(`Found ${buttons.length} potential buttons/clickable elements`);
          
          for (let i = 0; i < Math.min(buttons.length, 3); i++) {
            const buttonText = await buttons[i].textContent();
            console.log(`Button ${i + 1}: "${buttonText}"`);
          }
        }
        
      } else {
        console.log('❌ Could not find email/password inputs');
        
        // Try to find any input fields
        const allInputs = await page.$$('input');
        console.log(`Found ${allInputs.length} input fields total`);
        
        for (let i = 0; i < Math.min(allInputs.length, 5); i++) {
          const inputType = await allInputs[i].getAttribute('type');
          const inputPlaceholder = await allInputs[i].getAttribute('placeholder');
          const inputName = await allInputs[i].getAttribute('name');
          console.log(`Input ${i + 1}: type="${inputType}", placeholder="${inputPlaceholder}", name="${inputName}"`);
        }
      }
      
    } else {
      console.log('\n🤔 No obvious authentication form detected');
      console.log('📄 Checking if this might be a different type of page...');
      
      // Check for common elements that might indicate the page type
      const bodyText = await page.textContent('body');
      const hasClixen = bodyText.toLowerCase().includes('clixen');
      const hasAuth = bodyText.toLowerCase().includes('auth') || bodyText.toLowerCase().includes('login') || bodyText.toLowerCase().includes('sign');
      
      console.log(`Page contains "clixen": ${hasClixen}`);
      console.log(`Page contains auth-related text: ${hasAuth}`);
      console.log(`Page content preview: ${bodyText.substring(0, 300)}...`);
      
      // Take a screenshot of whatever we found
      await page.screenshot({ 
        path: path.join(screenshotsDir, '02-no-auth-form-page-content.png'),
        fullPage: true 
      });
    }
    
    // Test CTA buttons to find authentication
    console.log('\n🔘 Step 3: Testing CTA buttons to find authentication');
    
    // Try "Get Started" button
    const getStartedBtn = await page.$('text=Get Started');
    if (getStartedBtn) {
      console.log('🎯 Found "Get Started" button - clicking');
      await getStartedBtn.click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: path.join(screenshotsDir, '06-get-started-clicked.png'),
        fullPage: true 
      });
      
      // Check if this leads to auth
      const authCheck1 = await page.$('input[type="email"], input[type="password"]');
      if (authCheck1) {
        console.log('✅ Found auth form after Get Started');
        await testAuthForm(page, screenshotsDir);
      } else {
        console.log('ℹ️ Get Started did not lead to auth form');
        
        // Go back and try other buttons
        await page.goBack();
        await page.waitForTimeout(2000);
      }
    }
    
    // Try "Start Building" button
    const startBuildingBtn = await page.$('text=Start Building');
    if (startBuildingBtn) {
      console.log('🎯 Found "Start Building" button - clicking');
      await startBuildingBtn.click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: path.join(screenshotsDir, '07-start-building-clicked.png'),
        fullPage: true 
      });
      
      // Check if this leads to auth
      const authCheck2 = await page.$('input[type="email"], input[type="password"]');
      if (authCheck2) {
        console.log('✅ Found auth form after Start Building');
        await testAuthForm(page, screenshotsDir);
      } else {
        console.log('ℹ️ Start Building did not lead to auth form');
        
        // Go back and try other buttons
        await page.goBack();
        await page.waitForTimeout(2000);
      }
    }
    
    // Try "Start Free Trial" button
    const startTrialBtn = await page.$('text=Start Free Trial');
    if (startTrialBtn) {
      console.log('🎯 Found "Start Free Trial" button - clicking');
      await startTrialBtn.click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: path.join(screenshotsDir, '08-start-trial-clicked.png'),
        fullPage: true 
      });
      
      // Check if this leads to auth
      const authCheck3 = await page.$('input[type="email"], input[type="password"]');
      if (authCheck3) {
        console.log('✅ Found auth form after Start Free Trial');
        await testAuthForm(page, screenshotsDir);
      } else {
        console.log('ℹ️ Start Free Trial did not lead to auth form');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      type: 'test_error'
    });
    
    // Take error screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, '99-error-state.png'),
      fullPage: true 
    });
  }
  
  // Generate test report
  const report = {
    timestamp: new Date().toISOString(),
    url: 'http://18.221.12.50',
    testCredentials: {
      email: 'jayveedz19@gmail.com',
      password: '[REDACTED]'
    },
    consoleMessages: consoleMessages,
    errors: errors,
    screenshotsPath: screenshotsDir,
    summary: {
      pageLoaded: true,
      authFormDetected: !!await page.$('form, input[type="email"]'),
      errorsFound: errors.length > 0,
      totalConsoleMessages: consoleMessages.length
    }
  };
  
  // Save report
  fs.writeFileSync(
    path.join(screenshotsDir, 'test-report.json'), 
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📊 Test Summary:');
  console.log(`- Page loaded: ${report.summary.pageLoaded}`);
  console.log(`- Auth form detected: ${report.summary.authFormDetected}`);
  console.log(`- Errors found: ${report.summary.errorsFound}`);
  console.log(`- Console messages: ${report.summary.totalConsoleMessages}`);
  console.log(`- Screenshots saved to: ${screenshotsDir}`);
  
  await browser.close();
  
  return report;
}

// Run the test
testAuthenticationFlow()
  .then(report => {
    console.log('\n✅ Authentication test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });