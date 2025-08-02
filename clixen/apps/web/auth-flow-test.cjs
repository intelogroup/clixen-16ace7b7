const { chromium } = require('playwright');

async function testAuthFlow() {
  console.log('Starting Clixen Authentication Flow Test...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to the homepage
    console.log('\n=== STEP 1: Loading Homepage ===');
    await page.goto('http://18.221.12.50', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: '/tmp/clixen-01-homepage.png', 
      fullPage: true 
    });
    
    console.log('✅ Homepage loaded successfully');
    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());
    
    // Step 2: Click Get Started to access auth
    console.log('\n=== STEP 2: Accessing Authentication ===');
    
    // Look for any buttons that might lead to auth
    const getStartedBtn = await page.$('text=Get Started');
    const startFreeTrialBtn = await page.$('text=Start Free Trial');
    const signUpBtn = await page.$('text=Sign Up');
    const loginBtn = await page.$('text=Login');
    
    console.log('Available buttons:');
    console.log('- Get Started:', !!getStartedBtn);
    console.log('- Start Free Trial:', !!startFreeTrialBtn);
    console.log('- Sign Up:', !!signUpBtn);
    console.log('- Login:', !!loginBtn);
    
    let authButton = getStartedBtn || startFreeTrialBtn || signUpBtn || loginBtn;
    
    if (authButton) {
      console.log('Clicking authentication button...');
      await authButton.click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: '/tmp/clixen-02-after-auth-click.png', 
        fullPage: true 
      });
      
      console.log('✅ Auth button clicked');
      console.log('New URL:', page.url());
    } else {
      console.log('❌ No authentication button found');
    }
    
    // Step 3: Look for auth form elements
    console.log('\n=== STEP 3: Examining Authentication Form ===');
    
    // Wait a bit more for any dynamic content
    await page.waitForTimeout(2000);
    
    // Look for various auth form elements
    const emailInput = await page.$('input[type="email"]') || 
                      await page.$('input[name="email"]') ||
                      await page.$('input[placeholder*="email" i]');
                      
    const passwordInput = await page.$('input[type="password"]') || 
                         await page.$('input[name="password"]') ||
                         await page.$('input[placeholder*="password" i]');
    
    const submitButton = await page.$('button[type="submit"]') ||
                        await page.$('button:has-text("Sign Up")') ||
                        await page.$('button:has-text("Sign In")') ||
                        await page.$('button:has-text("Login")') ||
                        await page.$('button:has-text("Submit")');
    
    console.log('Form elements found:');
    console.log('- Email input:', !!emailInput);
    console.log('- Password input:', !!passwordInput);
    console.log('- Submit button:', !!submitButton);
    
    // Check page content for auth-related text
    const bodyText = await page.textContent('body');
    const hasSignUp = bodyText.toLowerCase().includes('sign up');
    const hasLogin = bodyText.toLowerCase().includes('login') || bodyText.toLowerCase().includes('sign in');
    const hasAuth = bodyText.toLowerCase().includes('email') && bodyText.toLowerCase().includes('password');
    
    console.log('Page content analysis:');
    console.log('- Contains "sign up":', hasSignUp);
    console.log('- Contains "login/sign in":', hasLogin);
    console.log('- Contains email & password:', hasAuth);
    
    // Step 4: Attempt to fill and submit form (if available)
    if (emailInput && passwordInput && submitButton) {
      console.log('\n=== STEP 4: Testing Form Submission ===');
      
      console.log('Filling email field...');
      await emailInput.fill('jayveedz19@gmail.com');
      
      console.log('Filling password field...');
      await passwordInput.fill('Jimkali90#');
      
      await page.screenshot({ 
        path: '/tmp/clixen-03-form-filled.png', 
        fullPage: true 
      });
      
      console.log('✅ Form filled with test credentials');
      
      console.log('Clicking submit button...');
      await submitButton.click();
      
      // Wait for response
      await page.waitForTimeout(5000);
      
      await page.screenshot({ 
        path: '/tmp/clixen-04-after-submit.png', 
        fullPage: true 
      });
      
      console.log('✅ Form submitted');
      console.log('URL after submit:', page.url());
      
      // Check for success/error messages
      const successElements = await page.$$('.success, .alert-success, [class*="success"]');
      const errorElements = await page.$$('.error, .alert-error, [class*="error"]');
      
      console.log('Post-submit analysis:');
      console.log('- Success elements found:', successElements.length);
      console.log('- Error elements found:', errorElements.length);
      
      if (successElements.length > 0) {
        for (let i = 0; i < successElements.length; i++) {
          const text = await successElements[i].textContent();
          console.log(`  Success message ${i + 1}: "${text}"`);
        }
      }
      
      if (errorElements.length > 0) {
        for (let i = 0; i < errorElements.length; i++) {
          const text = await errorElements[i].textContent();
          console.log(`  Error message ${i + 1}: "${text}"`);
        }
      }
      
      // Check if we're now on a different page (like dashboard)
      const currentUrl = page.url();
      if (currentUrl.includes('dashboard') || currentUrl.includes('app') || currentUrl.includes('home')) {
        console.log('🎉 Successfully redirected to authenticated area!');
        
        await page.screenshot({ 
          path: '/tmp/clixen-05-authenticated-page.png', 
          fullPage: true 
        });
      }
      
    } else {
      console.log('\n❌ Complete auth form not found - this might be a single-page app with different auth flow');
      
      // Look for auth UI components that might be loaded dynamically
      await page.waitForTimeout(3000);
      
      // Check for Supabase Auth UI or other auth components
      const authContainer = await page.$('[data-supabase-auth]') ||
                           await page.$('.supabase-auth') ||
                           await page.$('[class*="auth"]') ||
                           await page.$('#auth');
      
      if (authContainer) {
        console.log('Found auth container, taking screenshot...');
        await page.screenshot({ 
          path: '/tmp/clixen-03-auth-container.png', 
          fullPage: true 
        });
      }
    }
    
    console.log('\n=== TEST COMPLETED ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ 
      path: '/tmp/clixen-error.png', 
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

// Run the test
testAuthFlow().catch(console.error);