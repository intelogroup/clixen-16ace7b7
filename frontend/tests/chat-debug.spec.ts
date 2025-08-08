import { test, expect } from '@playwright/test';

test.describe('Chat Debugging', () => {
  test.beforeEach(async ({ page }) => {
    // Add console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('🔴 BROWSER ERROR:', msg.text());
      } else if (msg.text().includes('[MODERN-CHAT]') || msg.text().includes('[CHAT]') || msg.text().includes('[EDGE-FUNCTION]')) {
        console.log('📱 CHAT LOG:', msg.text());
      }
    });
    
    // Add network logging
    page.on('requestfailed', request => {
      console.error('🌐 REQUEST FAILED:', request.url(), request.failure()?.errorText);
    });
    
    page.on('response', response => {
      if (response.url().includes('ai-chat-simple') || response.url().includes('auth')) {
        console.log('📡 API RESPONSE:', response.status(), response.url());
      }
    });
  });

  test('debug chat typing and errors', async ({ page }) => {
    console.log('🧪 Starting chat debugging test...');
    
    // Navigate to the app
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Check current state
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    
    // Try to get to chat page
    if (currentUrl.includes('/auth') || await page.locator('text=Sign in').isVisible({ timeout: 5000 })) {
      console.log('🔑 On auth page, trying to authenticate...');
      
      try {
        // Try to fill auth form
        const emailInput = page.locator('input[type="email"]').first();
        const passwordInput = page.locator('input[type="password"]').first();
        
        if (await emailInput.isVisible({ timeout: 5000 })) {
          await emailInput.fill('test@clixen.dev');
          await passwordInput.fill('testpassword123');
          
          const signInButton = page.locator('button:has-text("Sign in")').first();
          await signInButton.click();
          
          await page.waitForTimeout(3000);
        }
      } catch (error) {
        console.log('⚠️ Auth failed, trying direct navigation:', error);
      }
    }
    
    // Try to navigate to chat
    console.log('💬 Navigating to chat...');
    
    try {
      // Try clicking navigation
      const chatButton = page.locator('a[href="/chat"], button:has-text("New Workflow")').first();
      if (await chatButton.isVisible({ timeout: 5000 })) {
        await chatButton.click();
        await page.waitForTimeout(2000);
      } else {
        // Direct navigation
        await page.goto('/chat');
      }
    } catch (error) {
      console.log('⚠️ Navigation error:', error);
      await page.goto('/chat');
    }
    
    // Wait for chat interface
    await page.waitForTimeout(2000);
    
    // Look for input field
    const messageInput = page.locator('input[placeholder*="workflow"], textarea[placeholder*="workflow"], input[type="text"]').first();
    
    if (await messageInput.isVisible({ timeout: 5000 })) {
      console.log('✅ Found message input');
      
      // Test typing
      console.log('⌨️ Testing typing...');
      await messageInput.clear();
      await messageInput.focus();
      
      const testMessage = "Hi";
      
      // Type slowly to capture all events
      for (const char of testMessage) {
        await messageInput.type(char);
        await page.waitForTimeout(200);
      }
      
      console.log(`📝 Typed: "${testMessage}"`);
      
      // Try to send
      const sendButton = page.locator('button[type="submit"], button:has-text("Send")').first();
      
      if (await sendButton.isVisible({ timeout: 3000 })) {
        console.log('📤 Found send button, clicking...');
        
        const isEnabled = await sendButton.isEnabled();
        console.log('🔘 Send button enabled:', isEnabled);
        
        if (isEnabled) {
          await sendButton.click();
          console.log('✅ Message sent, waiting for response...');
          
          // Wait and see what happens
          await page.waitForTimeout(10000);
          
          // Check for any AI response
          const responses = await page.locator('.bg-gray-50, [role="assistant"]').count();
          console.log('💬 AI responses found:', responses);
          
          // Check for error messages
          const errorMessages = await page.locator('text="apologize", text="error", text="try again"').count();
          console.log('🔴 Error messages found:', errorMessages);
        }
      } else {
        console.log('❌ Send button not found');
      }
    } else {
      console.log('❌ Message input not found');
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'debug-chat-no-input.png', fullPage: true });
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'debug-chat-final.png', fullPage: true });
    
    console.log('🏁 Chat debugging test completed');
  });

  test('network error capture', async ({ page }) => {
    console.log('🔍 Starting network error capture...');
    
    const errors: string[] = [];
    const networkErrors: string[] = [];
    const apiCalls: Array<{ url: string; status: number; method: string }> = [];
    
    // Capture all issues
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('requestfailed', request => {
      networkErrors.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    page.on('response', response => {
      apiCalls.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method()
      });
    });
    
    // Navigate and test
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Try to get to chat
    await page.goto('/chat');
    await page.waitForTimeout(3000);
    
    // Try to send a message
    const messageInput = page.locator('input[placeholder*="workflow"]').first();
    if (await messageInput.isVisible({ timeout: 5000 })) {
      await messageInput.fill('Test message for error debugging');
      
      const sendButton = page.locator('button[type="submit"]').first();
      if (await sendButton.isEnabled()) {
        await sendButton.click();
        await page.waitForTimeout(15000); // Wait for response or timeout
      }
    }
    
    // Report findings
    console.log('\n📊 ERROR SUMMARY:');
    console.log('Console Errors:', errors.length);
    console.log('Network Errors:', networkErrors.length);
    console.log('Total API Calls:', apiCalls.length);
    
    if (errors.length > 0) {
      console.log('\n🔴 CONSOLE ERRORS:');
      errors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
    }
    
    if (networkErrors.length > 0) {
      console.log('\n🌐 NETWORK ERRORS:');
      networkErrors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
    }
    
    // Show important API calls
    const importantCalls = apiCalls.filter(call => 
      call.url.includes('ai-chat-simple') || 
      call.url.includes('auth') || 
      call.status >= 400
    );
    
    if (importantCalls.length > 0) {
      console.log('\n📡 IMPORTANT API CALLS:');
      importantCalls.forEach((call, i) => 
        console.log(`${i + 1}. ${call.method} ${call.url} - ${call.status}`)
      );
    }
  });
});
