const { chromium } = require('playwright');

(async () => {
  try {
    console.log('Starting signup flow test...');
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();
    
    console.log('Navigating to homepage...');
    await page.goto('http://18.221.12.50', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('Looking for Get Started button...');
    await page.waitForSelector('text=Get Started', { timeout: 10000 });
    
    console.log('Clicking Get Started button...');
    await page.click('text=Get Started');
    await page.waitForTimeout(3000);
    
    console.log('Taking screenshot after clicking Get Started...');
    await page.screenshot({ 
      path: '/tmp/clixen-after-get-started.png', 
      fullPage: true 
    });
    
    console.log('Current URL after Get Started:', page.url());
    
    // Look for signup/login form elements
    const signupForm = await page.$('form');
    const emailField = await page.$('input[type="email"]');
    const passwordField = await page.$('input[type="password"]');
    const emailInput = await page.$('input[name="email"]');
    const passwordInput = await page.$('input[name="password"]');
    
    console.log('Form elements found:');
    console.log('- Signup form:', !!signupForm);
    console.log('- Email field (type):', !!emailField);
    console.log('- Password field (type):', !!passwordField);
    console.log('- Email field (name):', !!emailInput);
    console.log('- Password field (name):', !!passwordInput);
    
    // Try to find auth forms
    const authContainer = await page.$('[data-testid="auth-container"]') || 
                          await page.$('.auth-form') || 
                          await page.$('#auth-form');
    
    console.log('- Auth container:', !!authContainer);
    
    // Look for specific text that might indicate auth state
    const signupText = await page.textContent('body');
    console.log('Page contains "sign up":', signupText.toLowerCase().includes('sign up'));
    console.log('Page contains "login":', signupText.toLowerCase().includes('login'));
    console.log('Page contains "email":', signupText.toLowerCase().includes('email'));
    
    if (emailField || emailInput) {
      const targetEmailField = emailField || emailInput;
      const targetPasswordField = passwordField || passwordInput;
      
      console.log('Filling out signup form...');
      await targetEmailField.fill('jayveedz19@gmail.com');
      if (targetPasswordField) {
        await targetPasswordField.fill('Jimkali90#');
      }
      
      console.log('Taking screenshot with filled form...');
      await page.screenshot({ 
        path: '/tmp/clixen-signup-form-filled.png', 
        fullPage: true 
      });
      
      // Look for submit button
      const submitButton = await page.$('button[type="submit"]') || 
                          await page.$('text=Sign Up') || 
                          await page.$('text=Create Account') ||
                          await page.$('text=Submit') ||
                          await page.$('.submit-btn');
      
      if (submitButton) {
        console.log('Found submit button, attempting signup...');
        await submitButton.click();
        await page.waitForTimeout(5000);
        
        console.log('Taking screenshot after signup attempt...');
        await page.screenshot({ 
          path: '/tmp/clixen-signup-result.png', 
          fullPage: true 
        });
        
        console.log('Final URL after signup:', page.url());
        
        // Check for success/error messages
        const successMessage = await page.$('.success-message') || await page.$('.alert-success');
        const errorMessage = await page.$('.error-message') || await page.$('.alert-error');
        
        console.log('Success message found:', !!successMessage);
        console.log('Error message found:', !!errorMessage);
        
        if (successMessage) {
          console.log('Success message text:', await successMessage.textContent());
        }
        if (errorMessage) {
          console.log('Error message text:', await errorMessage.textContent());
        }
      } else {
        console.log('No submit button found');
      }
    } else {
      console.log('Required form fields not found - this might be a different type of page');
    }
    
    await browser.close();
    console.log('Signup test completed');
  } catch (error) {
    console.error('Error during signup test:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
})();