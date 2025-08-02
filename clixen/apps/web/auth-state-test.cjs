const { chromium } = require('playwright');

async function testAuthStateManagement() {
  console.log('Testing Authentication State Management...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Test 1: Inject authentication token directly and see what happens
    console.log('\n=== Testing Direct Token Injection ===');
    
    await page.goto('http://18.221.12.50', { waitUntil: 'networkidle' });
    
    // Inject Supabase authentication token
    await page.evaluate(() => {
      // Simulate successful authentication by setting localStorage
      const authData = {
        access_token: "eyJhbGciOiJIUzI1NiIsImtpZCI6InVBWXpuNkZ5Z0xVeHJwczYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3pmYmdkaXhiemV6cHhsbGtveWZjLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIwNTBkNjQ5Yy03Y2NhLTQzMzUtOTUwOC1jMzk0ODM2NzgzZjkiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0MTc4NjkzLCJpYXQiOjE3NTQxNzUwOTMsImVtYWlsIjoiamF5dmVlZHoxOUBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoiamF5dmVlZHoxOUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiIwNTBkNjQ5Yy03Y2NhLTQzMzUtOTUwOC1jMzk0ODM2NzgzZjkifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc1NDE3NTA5M31dLCJzZXNzaW9uX2lkIjoiYWU5Y2ZmOGUtZDQxYS00YTU0LWIzMmEtYzVlYTMxMzhjYzFjIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.YNGtMyEgE7fblJicNm4VW1rFXGEXE-mXszzcv3nXwG4",
        refresh_token: "txgv3sajzwnm",
        expires_at: 1754178693,
        user: {
          id: "050d649c-7cca-4335-9508-c394836783f9",
          email: "jayveedz19@gmail.com"
        }
      };
      
      // Set the Supabase session in localStorage
      localStorage.setItem('sb-zfbgdixbzezpxllkoyfc-auth-token', JSON.stringify(authData));
      
      console.log('Auth token injected');
    });
    
    // Refresh the page to see if it recognizes the auth state
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: '/tmp/clixen-with-auth-token.png', 
      fullPage: true 
    });
    
    console.log('Current URL after token injection:', page.url());
    
    // Test 2: Try to navigate directly to protected routes
    console.log('\n=== Testing Protected Route Access ===');
    
    const protectedRoutes = ['/dashboard', '/chat', '/app'];
    
    for (const route of protectedRoutes) {
      console.log(`Testing route: ${route}`);
      try {
        await page.goto(`http://18.221.12.50${route}`, { 
          waitUntil: 'networkidle',
          timeout: 10000 
        });
        
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: `/tmp/clixen-route-${route.replace('/', '')}.png`, 
          fullPage: true 
        });
        
        console.log(`${route} - URL:`, page.url());
        
        // Check if we got redirected back to auth
        if (page.url().includes('/auth')) {
          console.log(`${route} - Redirected to auth (protected)`);
        } else if (page.url().includes(route)) {
          console.log(`${route} - Successfully accessed!`);
        } else {
          console.log(`${route} - Unexpected redirect to:`, page.url());
        }
        
      } catch (error) {
        console.log(`${route} - Error or not found:`, error.message);
      }
    }
    
    // Test 3: Check what components are rendered
    console.log('\n=== Testing Component Rendering ===');
    
    await page.goto('http://18.221.12.50', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check for various UI elements that indicate auth state
    const getStartedBtn = await page.$('text=Get Started');
    const signInBtn = await page.$('text=Sign In');
    const logoutBtn = await page.$('text=Logout') || await page.$('text=Sign Out');
    const userProfile = await page.$('[data-testid="user-profile"]') || await page.$('.user-menu');
    const chatInterface = await page.$('.chat-container') || await page.$('[data-testid="chat"]');
    
    console.log('UI Elements Found:');
    console.log('- Get Started button:', !!getStartedBtn);
    console.log('- Sign In button:', !!signInBtn);
    console.log('- Logout button:', !!logoutBtn);
    console.log('- User profile:', !!userProfile);
    console.log('- Chat interface:', !!chatInterface);
    
    // Test 4: Try to perform authenticated actions
    console.log('\n=== Testing Authenticated Actions ===');
    
    // Check if there are any authenticated-only buttons or links
    const createWorkflowBtn = await page.$('text=Create Workflow');
    const myWorkflowsBtn = await page.$('text=My Workflows');
    const settingsBtn = await page.$('text=Settings');
    
    console.log('Authenticated Actions Available:');
    console.log('- Create Workflow:', !!createWorkflowBtn);
    console.log('- My Workflows:', !!myWorkflowsBtn);
    console.log('- Settings:', !!settingsBtn);
    
    await page.screenshot({ 
      path: '/tmp/clixen-final-auth-state.png', 
      fullPage: true 
    });
    
    console.log('\n=== Authentication State Test Completed ===');
    
  } catch (error) {
    console.error('❌ Auth state test failed:', error.message);
    await page.screenshot({ 
      path: '/tmp/clixen-auth-state-error.png', 
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

// Run the auth state test
testAuthStateManagement().catch(console.error);