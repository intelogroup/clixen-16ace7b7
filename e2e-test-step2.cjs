const { chromium } = require('playwright');

async function createNewUser() {
  console.log('🚀 Step 2: Creating new user via browser automation');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to local app
    console.log('📍 Navigating to http://127.0.0.1:8081/');
    await page.goto('http://127.0.0.1:8081/');
    await page.waitForLoadState('networkidle');
    
    // Generate unique test user
    const timestamp = Date.now();
    const testEmail = `test-user-${timestamp}@clixen.test`;
    const testPassword = 'TestPassword123!';
    
    console.log(`👤 Creating user: ${testEmail}`);
    
    // Look for auth forms and sign up
    await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email" i]', { timeout: 10000 });
    
    // Fill signup form
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', testEmail);
    await page.fill('input[type="password"], input[name="password"], input[placeholder*="password" i]', testPassword);
    
    // Click signup button
    const signupButton = await page.locator('button:has-text("Sign Up"), button:has-text("Create Account"), button[type="submit"]').first();
    await signupButton.click();
    
    // Wait for successful signup/login
    await page.waitForSelector('.clean-card, .dashboard, [data-testid="dashboard"], h1:has-text("Dashboard"), h1:has-text("Chat")', { timeout: 15000 });
    
    console.log('✅ User created and logged in successfully');
    
    // Get user info from the page
    const currentUrl = page.url();
    console.log(`📄 Current page: ${currentUrl}`);
    
    // Save user credentials for next steps
    const userInfo = {
      email: testEmail,
      password: testPassword,
      timestamp: timestamp,
      userId: `test-${timestamp}` // Will be replaced with actual user ID if we can extract it
    };
    
    console.log('💾 User info saved for next steps');
    
    return { page, browser, userInfo };
    
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    await browser.close();
    throw error;
  }
}

module.exports = { createNewUser };

// Run if called directly
if (require.main === module) {
  createNewUser()
    .then(({ page, browser, userInfo }) => {
      console.log('🎉 User creation completed!');
      console.log('📋 User Info:', userInfo);
      console.log('⏳ Keeping browser open for 10 seconds...');
      
      setTimeout(async () => {
        await browser.close();
        console.log('🔒 Browser closed');
      }, 10000);
    })
    .catch(console.error);
}