import { test, expect, type Page } from '@playwright/test';

test.describe('Chat Real-time Typing Test', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Use headed mode for debugging
    page = await browser.newPage();
    
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
    
    // Navigate to the app
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should handle authentication and navigate to chat', async () => {
    console.log('🧪 Starting authentication test...');
    
    // Wait for the page to load
    await page.waitForSelector('h1, .auth-container, [data-testid="auth"]', { timeout: 10000 });
    
    // Check if we're on the auth page or already authenticated
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    
    if (currentUrl.includes('/auth') || await page.locator('text=Sign in').isVisible({ timeout: 2000 })) {
      console.log('🔑 Need to authenticate...');
      
      // Fill in test credentials
      const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[placeholder*="password"]').first();
      
      await emailInput.fill('test@clixen.dev');
      await passwordInput.fill('testpassword123');
      
      // Click sign in button
      const signInButton = page.locator('button:has-text("Sign in"), button:has-text("Sign In")').first();
      await signInButton.click();
      
      // Wait for auth to complete
      await page.waitForURL(/dashboard|chat/, { timeout: 15000 });
    }
    
    // Navigate to chat
    console.log('💬 Navigating to chat...');
    
    if (!page.url().includes('/chat')) {
      // Look for chat navigation button
      const chatButton = page.locator('a[href="/chat"], button:has-text("Chat"), button:has-text("New Workflow"), a:has-text("Create Workflow")').first();
      
      if (await chatButton.isVisible({ timeout: 5000 })) {
        await chatButton.click();
        await page.waitForURL('**/chat', { timeout: 10000 });
      } else {
        // Direct navigation
        await page.goto('http://localhost:5173/chat');
      }
    }
    
    // Verify we're on the chat page
    await expect(page.locator('h1:has-text("AI Workflow Chat"), h1:has-text("Chat")')).toBeVisible({ timeout: 10000 });
    console.log('✅ Successfully navigated to chat');
  });

  test('should simulate real-time typing and message sending', async () => {
    console.log('🧪 Starting real-time typing test...');
    
    // First authenticate and navigate to chat
    await test.step('Navigate to chat', async () => {
      await page.goto('http://localhost:5173');
      
      // Handle auth if needed
      if (await page.locator('text=Sign in').isVisible({ timeout: 5000 })) {
        await page.locator('input[type="email"]').fill('test@clixen.dev');
        await page.locator('input[type="password"]').fill('testpassword123');
        await page.locator('button:has-text("Sign in")').click();
        await page.waitForURL(/dashboard|chat/, { timeout: 15000 });
      }
      
      // Navigate to chat
      if (!page.url().includes('/chat')) {
        const chatButton = page.locator('a[href="/chat"], button:has-text("New Workflow")').first();
        if (await chatButton.isVisible({ timeout: 5000 })) {
          await chatButton.click();
        } else {
          await page.goto('http://localhost:5173/chat');
        }
      }
      
      await expect(page.locator('h1:has-text("AI Workflow Chat")')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Test real-time typing with short message', async () => {
      console.log('⌨️ Testing short message typing...');
      
      const messageInput = page.locator('input[placeholder*="workflow"], textarea[placeholder*="workflow"]').first();
      await expect(messageInput).toBeVisible({ timeout: 5000 });
      
      const shortMessage = "Hi";
      
      // Clear input and simulate typing
      await messageInput.clear();
      await messageInput.focus();
      
      // Type character by character with realistic delays
      for (let i = 0; i < shortMessage.length; i++) {
        await messageInput.type(shortMessage[i]);
        await page.waitForTimeout(100 + Math.random() * 100); // 100-200ms delay
      }
      
      console.log(`📝 Typed: "${shortMessage}"`);
      
      // Send the message
      const sendButton = page.locator('button[type="submit"], button:has-text("Send")').first();
      await expect(sendButton).toBeEnabled();
      
      console.log('📤 Sending message...');
      await sendButton.click();
      
      // Wait for response
      console.log('⏳ Waiting for AI response...');
      await expect(page.locator('.text-gray-600:has-text("AI is thinking")')).toBeVisible({ timeout: 5000 });
      
      // Wait for the response to appear (up to 30 seconds)
      await expect(page.locator('[role="assistant"]:last-of-type, .bg-gray-50:has-text("I"):last-of-type')).toBeVisible({ timeout: 30000 });
      
      console.log('✅ AI response received');
    });

    await test.step('Test real-time typing with complex workflow message', async () => {
      console.log('⌨️ Testing complex workflow message typing...');
      
      const messageInput = page.locator('input[placeholder*="workflow"], textarea[placeholder*="workflow"]').first();
      
      const complexMessage = "I want to automate sending Slack notifications when someone fills out a contact form on my website";
      
      // Clear input and simulate realistic typing
      await messageInput.clear();
      await messageInput.focus();
      
      console.log('📝 Starting to type complex message...');
      
      // Type with realistic human-like patterns
      for (let i = 0; i < complexMessage.length; i++) {
        await messageInput.type(complexMessage[i]);
        
        // Realistic typing patterns
        if (complexMessage[i] === ' ') {
          await page.waitForTimeout(150 + Math.random() * 100); // Longer pause at spaces
        } else if (complexMessage[i] === ',') {
          await page.waitForTimeout(200 + Math.random() * 100); // Pause at punctuation
        } else {
          await page.waitForTimeout(50 + Math.random() * 100); // Normal typing
        }
        
        // Occasional longer pauses (thinking)
        if (Math.random() < 0.1) {
          await page.waitForTimeout(300 + Math.random() * 500);
        }
      }
      
      console.log(`📝 Completed typing: "${complexMessage}"`);
      
      // Send the message
      const sendButton = page.locator('button[type="submit"], button:has-text("Send")').first();
      await expect(sendButton).toBeEnabled();
      
      console.log('📤 Sending complex message...');
      await sendButton.click();
      
      // Wait for AI thinking indicator
      await expect(page.locator('.text-gray-600:has-text("AI is thinking")')).toBeVisible({ timeout: 5000 });
      
      // Wait for response (longer timeout for complex queries)
      await expect(page.locator('[role="assistant"]:last-of-type, .bg-gray-50:last-of-type')).toBeVisible({ timeout: 45000 });
      
      console.log('✅ Complex message response received');
    });

    await test.step('Verify workflow status updates', async () => {
      console.log('🔍 Checking workflow status...');
      
      // Check if workflow status badge is visible
      const statusBadge = page.locator('.badge-clean, [class*="badge"]').first();
      if (await statusBadge.isVisible({ timeout: 5000 })) {
        const statusText = await statusBadge.textContent();
        console.log('📊 Workflow Status:', statusText);
      }
      
      // Check if workflow actions are available
      const saveButton = page.locator('button:has-text("Save Workflow")');
      const deployButton = page.locator('button:has-text("Deploy")');
      
      if (await saveButton.isVisible({ timeout: 2000 })) {
        const isEnabled = await saveButton.isEnabled();
        console.log('💾 Save button enabled:', isEnabled);
      }
      
      if (await deployButton.isVisible({ timeout: 2000 })) {
        const isEnabled = await deployButton.isEnabled();
        console.log('🚀 Deploy button enabled:', isEnabled);
      }
    });
  });

  test('should test error scenarios and fallback behavior', async () => {
    console.log('🧪 Testing error scenarios...');
    
    // Navigate to chat
    await page.goto('http://localhost:5173/chat');
    
    // Test empty message
    await test.step('Test empty message handling', async () => {
      const messageInput = page.locator('input[placeholder*="workflow"]').first();
      const sendButton = page.locator('button[type="submit"]').first();
      
      await messageInput.clear();
      await expect(sendButton).toBeDisabled();
      console.log('✅ Empty message properly disabled send button');
    });
    
    // Test very long message
    await test.step('Test very long message', async () => {
      const messageInput = page.locator('input[placeholder*="workflow"]').first();
      const sendButton = page.locator('button[type="submit"]').first();
      
      const longMessage = 'A'.repeat(1000) + ' automation workflow';
      
      await messageInput.clear();
      await messageInput.fill(longMessage);
      
      console.log('📝 Sending very long message...');
      await sendButton.click();
      
      // Should still get a response (or error)
      await expect(page.locator('[role="assistant"]:last-of-type, .bg-gray-50:last-of-type')).toBeVisible({ timeout: 30000 });
      console.log('✅ Long message handled');
    });
    
    // Test rapid message sending
    await test.step('Test rapid message sending', async () => {
      const messageInput = page.locator('input[placeholder*="workflow"]').first();
      const sendButton = page.locator('button[type="submit"]').first();
      
      // Send first message
      await messageInput.clear();
      await messageInput.fill('First message');
      await sendButton.click();
      
      // Try to send second message immediately
      await messageInput.fill('Second message');
      
      // Send button should be disabled while first message is processing
      const isDisabled = await sendButton.isDisabled();
      console.log('🚫 Send button disabled during processing:', isDisabled);
      
      // Wait for first response
      await expect(page.locator('[role="assistant"]:last-of-type')).toBeVisible({ timeout: 30000 });
      
      // Now send button should be enabled again
      await expect(sendButton).toBeEnabled({ timeout: 5000 });
      console.log('✅ Send button re-enabled after response');
    });
  });
});

test.describe('Chat Error Debugging', () => {
  test('should capture all network and console errors during chat interaction', async ({ page }) => {
    console.log('🔍 Starting comprehensive error capture test...');
    
    const errors: string[] = [];
    const networkErrors: string[] = [];
    const apiCalls: { url: string; status: number; method: string }[] = [];
    
    // Capture all console messages
    page.on('console', msg => {
      const text = msg.text();
      console.log(`📱 [${msg.type().toUpperCase()}]`, text);
      
      if (msg.type() === 'error') {
        errors.push(text);
      }
    });
    
    // Capture network events
    page.on('requestfailed', request => {
      const error = `${request.method()} ${request.url()} - ${request.failure()?.errorText}`;
      networkErrors.push(error);
      console.error('🌐 NETWORK ERROR:', error);
    });
    
    page.on('response', response => {
      const call = {
        url: response.url(),
        status: response.status(),
        method: response.request().method()
      };
      apiCalls.push(call);
      
      if (response.status() >= 400) {
        console.error(`🔴 HTTP ERROR: ${call.method} ${call.url} - ${call.status}`);
      } else if (call.url.includes('ai-chat-simple') || call.url.includes('auth')) {
        console.log(`📡 API CALL: ${call.method} ${call.url} - ${call.status}`);
      }
    });
    
    // Navigate and test
    await page.goto('http://localhost:5173');
    
    // Try to navigate to chat and send a message
    try {
      // Handle auth
      if (await page.locator('text=Sign in').isVisible({ timeout: 5000 })) {
        await page.locator('input[type="email"]').fill('test@clixen.dev');
        await page.locator('input[type="password"]').fill('testpassword123');
        await page.locator('button:has-text("Sign in")').click();
        await page.waitForTimeout(3000);
      }
      
      // Navigate to chat
      await page.goto('http://localhost:5173/chat');
      await page.waitForTimeout(2000);
      
      // Send a test message
      const messageInput = page.locator('input[placeholder*="workflow"]').first();
      if (await messageInput.isVisible({ timeout: 5000 })) {
        await messageInput.fill('Test error debugging message');
        
        const sendButton = page.locator('button[type="submit"]').first();
        await sendButton.click();
        
        // Wait for response or error
        await page.waitForTimeout(10000);
      }
      
    } catch (error) {
      console.error('🔴 TEST ERROR:', error);
    }
    
    // Report all captured issues
    console.log('\n📊 ERROR SUMMARY:');
    console.log('Console Errors:', errors.length);
    console.log('Network Errors:', networkErrors.length);
    console.log('API Calls:', apiCalls.length);
    
    if (errors.length > 0) {
      console.log('\n🔴 CONSOLE ERRORS:');
      errors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
    }
    
    if (networkErrors.length > 0) {
      console.log('\n🌐 NETWORK ERRORS:');
      networkErrors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
    }
    
    console.log('\n📡 API CALLS:');
    apiCalls.forEach((call, i) => {
      if (call.url.includes('ai-chat-simple') || call.url.includes('auth') || call.status >= 400) {
        console.log(`${i + 1}. ${call.method} ${call.url} - ${call.status}`);
      }
    });
  });
});
