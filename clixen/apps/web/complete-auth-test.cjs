const { chromium } = require('playwright');

async function completeAuthTest() {
  console.log('Starting Complete Clixen Authentication Test...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Test Signup Flow
    console.log('\n========== TESTING SIGNUP FLOW ==========');
    
    await page.goto('http://18.221.12.50', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Navigate to auth
    await page.click('text=Get Started');
    await page.waitForTimeout(2000);
    
    // Click signup link
    console.log('Clicking "Sign up" link...');
    const signupLink = await page.$('text=Sign up');
    if (signupLink) {
      await signupLink.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: '/tmp/clixen-signup-page.png', 
        fullPage: true 
      });
      
      console.log('✅ Navigated to signup page');
      console.log('Current URL:', page.url());
    } else {
      console.log('ℹ️ No separate signup link found, continuing with current form');
    }
    
    // Fill signup form
    console.log('Testing signup with credentials...');
    
    const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
    const passwordInput = await page.$('input[type="password"]') || await page.$('input[name="password"]');
    
    if (emailInput && passwordInput) {
      await emailInput.fill('jayveedz19@gmail.com');
      await passwordInput.fill('Jimkali90#');
      
      await page.screenshot({ 
        path: '/tmp/clixen-signup-filled.png', 
        fullPage: true 
      });
      
      // Look for signup-specific submit button
      const signupButton = await page.$('button:has-text("Sign Up")') || 
                          await page.$('button:has-text("Create Account")') ||
                          await page.$('button[type="submit"]');
      
      if (signupButton) {
        console.log('Submitting signup form...');
        await signupButton.click();
        await page.waitForTimeout(5000);
        
        await page.screenshot({ 
          path: '/tmp/clixen-signup-result.png', 
          fullPage: true 
        });
        
        console.log('Current URL after signup:', page.url());
        
        // Check for messages
        const bodyText = await page.textContent('body');
        if (bodyText.includes('Check your email') || bodyText.includes('verification')) {
          console.log('📧 Email verification required');
        } else if (bodyText.includes('already exists') || bodyText.includes('already registered')) {
          console.log('ℹ️ Account already exists');
        } else if (page.url().includes('dashboard') || page.url().includes('app')) {
          console.log('🎉 Signup successful - redirected to app');
        }
      }
    }
    
    // Test Login Flow
    console.log('\n========== TESTING LOGIN FLOW ==========');
    
    // Navigate back to auth page for login
    await page.goto('http://18.221.12.50/auth', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: '/tmp/clixen-login-page.png', 
      fullPage: true 
    });
    
    // Fill login form
    console.log('Testing login with same credentials...');
    
    const loginEmailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
    const loginPasswordInput = await page.$('input[type="password"]') || await page.$('input[name="password"]');
    
    if (loginEmailInput && loginPasswordInput) {
      await loginEmailInput.fill('jayveedz19@gmail.com');
      await loginPasswordInput.fill('Jimkali90#');
      
      await page.screenshot({ 
        path: '/tmp/clixen-login-filled.png', 
        fullPage: true 
      });
      
      // Submit login
      const loginButton = await page.$('button:has-text("Sign In")') || 
                         await page.$('button:has-text("Login")') ||
                         await page.$('button[type="submit"]');
      
      if (loginButton) {
        console.log('Submitting login form...');
        await loginButton.click();
        await page.waitForTimeout(5000);
        
        await page.screenshot({ 
          path: '/tmp/clixen-login-result.png', 
          fullPage: true 
        });
        
        console.log('Current URL after login:', page.url());
        
        // Check for successful login
        if (page.url().includes('dashboard') || page.url().includes('app') || page.url().includes('chat')) {
          console.log('🎉 Login successful - redirected to authenticated area');
          
          // Take screenshot of authenticated page
          await page.screenshot({ 
            path: '/tmp/clixen-authenticated-dashboard.png', 
            fullPage: true 
          });
          
          // Test logout if possible
          const logoutButton = await page.$('text=Logout') || 
                              await page.$('text=Sign Out') ||
                              await page.$('button:has-text("Logout")');
          
          if (logoutButton) {
            console.log('Testing logout...');
            await logoutButton.click();
            await page.waitForTimeout(2000);
            
            await page.screenshot({ 
              path: '/tmp/clixen-after-logout.png', 
              fullPage: true 
            });
            
            console.log('URL after logout:', page.url());
          }
        } else {
          console.log('❌ Login failed or user not verified');
          
          // Check for error messages
          const errorElements = await page.$$('.error, .alert-error, [class*="error"], .text-red');
          if (errorElements.length > 0) {
            for (let element of errorElements) {
              const text = await element.textContent();
              if (text && text.trim()) {
                console.log('Error message:', text.trim());
              }
            }
          }
        }
      }
    }
    
    // Test Error Validation
    console.log('\n========== TESTING ERROR VALIDATION ==========');
    
    await page.goto('http://18.221.12.50/auth', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Test invalid email
    console.log('Testing invalid email validation...');
    const testEmailInput = await page.$('input[type="email"]');
    const testPasswordInput = await page.$('input[type="password"]');
    
    if (testEmailInput && testPasswordInput) {
      await testEmailInput.fill('invalid-email');
      await testPasswordInput.fill('weak');
      
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: '/tmp/clixen-validation-errors.png', 
          fullPage: true 
        });
        
        console.log('✅ Validation test completed');
      }
    }
    
    console.log('\n========== AUTHENTICATION TEST COMPLETED ==========');
    
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

// Run the complete test
completeAuthTest().catch(console.error);