import { chromium } from 'playwright';

async function testFrontend() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('🧪 Starting frontend tests...');
    
    // Test 1: Navigate to the app
    console.log('\n📍 Test 1: Navigate to clixen.netlify.app');
    await page.goto('https://clixen.netlify.app', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'screenshots/01-homepage.png' });
    console.log('✅ Homepage loaded');
    
    // Test 2: Check if login form is visible
    console.log('\n📍 Test 2: Check login form');
    const loginForm = await page.locator('form').first();
    if (await loginForm.isVisible()) {
      console.log('✅ Login form is visible');
      await page.screenshot({ path: 'screenshots/02-login-form.png' });
    } else {
      // Check if already logged in
      const logoutButton = await page.locator('text=Logout').first();
      if (await logoutButton.isVisible()) {
        console.log('✅ Already logged in, logging out first');
        await logoutButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Test 3: Login with test credentials
    console.log('\n📍 Test 3: Login with test credentials');
    
    // Wait for email input to be visible
    try {
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      await page.fill('input[type="email"]', 'jimkalinov@gmail.com');
      await page.fill('input[type="password"]', 'Jimkali90#');
      await page.screenshot({ path: 'screenshots/03-credentials-entered.png' });
    } catch (e) {
      console.log('⚠️ Login form not found, checking current page...');
      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.log('Current page:', { title: pageTitle, url: pageUrl });
      await page.screenshot({ path: 'screenshots/03-current-page.png' });
      
      // Check if already on chat page
      if (pageUrl.includes('/chat')) {
        console.log('✅ Already on chat page, skipping login');
        return;
      }
    }
    
    await page.click('button[type="submit"]');
    console.log('⏳ Logging in...');
    
    // Wait for navigation or error
    try {
      await page.waitForURL('**/chat', { timeout: 10000 });
      console.log('✅ Successfully logged in and redirected to chat');
      await page.screenshot({ path: 'screenshots/04-chat-page.png' });
    } catch (e) {
      // Check for error message
      const errorMessage = await page.locator('.text-red-500, .text-red-600, [role="alert"]').first();
      if (await errorMessage.isVisible()) {
        console.log('❌ Login failed:', await errorMessage.textContent());
        await page.screenshot({ path: 'screenshots/04-login-error.png' });
      } else {
        console.log('⚠️ Login may have succeeded but no redirect');
        await page.screenshot({ path: 'screenshots/04-post-login.png' });
      }
    }
    
    // Test 4: Check chat interface
    console.log('\n📍 Test 4: Check chat interface');
    const chatInput = await page.locator('textarea[placeholder*="Describe your workflow"]').first();
    if (await chatInput.isVisible()) {
      console.log('✅ Chat input is visible');
      
      // Check for greeting message
      const messages = await page.locator('.text-white').all();
      console.log(`✅ Found ${messages.length} messages in chat`);
      
      // Test 5: Send a test message
      console.log('\n📍 Test 5: Send a test message');
      await chatInput.fill('Hello, can you help me create a simple workflow?');
      await page.screenshot({ path: 'screenshots/05-message-typed.png' });
      
      // Press Enter to send
      await chatInput.press('Enter');
      console.log('⏳ Waiting for response...');
      
      // Wait for loading indicator
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/06-message-sent.png' });
      
      // Check for response or error
      const loadingIndicator = await page.locator('.animate-spin').first();
      if (await loadingIndicator.isVisible()) {
        console.log('✅ AI is processing the message');
        
        // Wait for response (max 30 seconds)
        try {
          await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 30000 });
          console.log('✅ Response received');
          await page.screenshot({ path: 'screenshots/07-response-received.png' });
          
          // Check for API key error
          const apiKeyError = await page.locator('text=OpenAI API Key Required').first();
          if (await apiKeyError.isVisible()) {
            console.log('⚠️ User needs to configure OpenAI API key');
            await page.screenshot({ path: 'screenshots/08-api-key-required.png' });
          }
        } catch (e) {
          console.log('⚠️ Response timeout or still loading');
          await page.screenshot({ path: 'screenshots/07-response-timeout.png' });
        }
      }
      
      // Test 6: Check agent panel
      console.log('\n📍 Test 6: Check agent panel');
      const agentButton = await page.locator('button:has-text("Show Agents")').first();
      if (await agentButton.isVisible()) {
        await agentButton.click();
        await page.waitForTimeout(1000);
        console.log('✅ Agent panel toggled');
        await page.screenshot({ path: 'screenshots/09-agent-panel.png' });
      }
      
    } else {
      console.log('❌ Chat interface not found');
      await page.screenshot({ path: 'screenshots/04-no-chat.png' });
    }
    
    // Test 7: Check for error logger functionality
    console.log('\n📍 Test 7: Check error logging');
    const logs = await page.evaluate(() => {
      return window.ErrorLogger ? window.ErrorLogger.getLogs() : null;
    });
    
    if (logs) {
      console.log(`✅ Error logger is active with ${logs.length} logs`);
    } else {
      console.log('⚠️ Error logger not accessible from console');
    }
    
    console.log('\n🎉 Frontend tests completed!');
    console.log('📸 Screenshots saved in screenshots/ directory');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'screenshots/error-state.png' });
  } finally {
    await browser.close();
  }
}

// Create screenshots directory
import { mkdir } from 'fs/promises';
await mkdir('screenshots', { recursive: true });

// Run tests
testFrontend().catch(console.error);