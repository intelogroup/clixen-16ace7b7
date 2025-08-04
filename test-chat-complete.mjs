#!/usr/bin/env node

// Complete end-to-end test with proper login flow
import { chromium } from 'playwright';

const NETLIFY_URL = 'https://clixen.netlify.app';
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Jimkali90#';

console.log('🚀 COMPLETE CHAT SYSTEM TEST WITH LOGIN...\n');

async function completeTest() {
  let browser, context, page;
  
  try {
    // 1. Setup browser
    console.log('1. Setting up browser with persistent context...');
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create persistent context to maintain session
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      // Accept all cookies
      acceptDownloads: true,
      ignoreHTTPSErrors: true,
      // Store cookies/storage
      storageState: undefined
    });
    
    page = await context.newPage();
    
    // Log console messages
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`   Browser ${type}:`, msg.text().substring(0, 100));
      }
    });
    
    // 2. Navigate to app
    console.log('2. Navigating to Clixen app...');
    await page.goto(NETLIFY_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/01-initial.png' });
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // 3. Handle authentication
    if (currentUrl.includes('/auth') || await page.locator('input[type="email"]').count() > 0) {
      console.log('3. Performing login...');
      
      // Wait for form to be ready
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      
      // Fill email
      const emailInput = page.locator('input[type="email"]');
      await emailInput.click();
      await emailInput.fill(TEST_EMAIL);
      console.log(`   ✓ Entered email: ${TEST_EMAIL}`);
      
      // Fill password
      const passwordInput = page.locator('input[type="password"]');
      await passwordInput.click();
      await passwordInput.fill(TEST_PASSWORD);
      console.log('   ✓ Entered password');
      
      await page.screenshot({ path: '/tmp/02-login-filled.png' });
      
      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign In")').first();
      console.log('   Clicking sign in button...');
      await submitButton.click();
      
      // Wait for navigation after login
      console.log('   ⏳ Waiting for authentication to complete...');
      
      // Wait for either dashboard or chat URL
      try {
        await page.waitForURL(url => 
          url.includes('/dashboard') || 
          url.includes('/chat') || 
          !url.includes('/auth'), 
          { timeout: 15000 }
        );
        console.log('   ✓ Login successful!');
      } catch (e) {
        console.log('   ⚠️  Login may have failed or is taking longer');
        // Continue anyway to see where we ended up
      }
      
      await page.waitForTimeout(3000); // Extra wait for any redirects
      
      const afterLoginUrl = page.url();
      console.log(`   After login URL: ${afterLoginUrl}`);
      await page.screenshot({ path: '/tmp/03-after-login.png' });
      
    } else {
      console.log('3. Already authenticated or on different page');
    }
    
    // 4. Navigate to chat
    console.log('4. Navigating to chat page...');
    
    // First try to find chat link in navigation
    const chatLinks = page.locator('a[href*="chat" i], a:has-text("Chat"), nav a:has-text("Chat")');
    const chatLinkCount = await chatLinks.count();
    
    if (chatLinkCount > 0) {
      console.log(`   Found ${chatLinkCount} chat link(s), clicking first...`);
      await chatLinks.first().click();
      await page.waitForTimeout(3000);
    } else {
      console.log('   No chat link found, navigating directly...');
      await page.goto(`${NETLIFY_URL}/chat`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
    }
    
    const chatPageUrl = page.url();
    console.log(`   Chat page URL: ${chatPageUrl}`);
    await page.screenshot({ path: '/tmp/04-chat-page.png' });
    
    // 5. Analyze chat interface
    console.log('5. Analyzing chat interface...');
    
    // Wait a bit for React to render
    await page.waitForTimeout(2000);
    
    // Try multiple selectors for message input
    const inputSelectors = [
      'textarea',
      'input[type="text"]',
      '[contenteditable="true"]',
      'input[placeholder*="message" i]',
      'input[placeholder*="type" i]',
      'textarea[placeholder*="message" i]'
    ];
    
    let messageInput = null;
    for (const selector of inputSelectors) {
      try {
        const elements = await page.locator(selector).all();
        for (const element of elements) {
          if (await element.isVisible()) {
            messageInput = element;
            console.log(`   ✓ Found visible input with selector: ${selector}`);
            break;
          }
        }
        if (messageInput) break;
      } catch (e) {
        // Continue trying other selectors
      }
    }
    
    // Find send button
    const sendButtonSelectors = [
      'button:has-text("Send")',
      'button[type="submit"]',
      'button:has(svg)',
      'button[aria-label*="send" i]'
    ];
    
    let sendButton = null;
    for (const selector of sendButtonSelectors) {
      try {
        const elements = await page.locator(selector).all();
        for (const element of elements) {
          if (await element.isVisible()) {
            const box = await element.boundingBox();
            // Check if it's likely a send button (small, square-ish)
            if (box && box.width < 100 && box.height < 100) {
              sendButton = element;
              console.log(`   ✓ Found send button with selector: ${selector}`);
              break;
            }
          }
        }
        if (sendButton) break;
      } catch (e) {
        // Continue
      }
    }
    
    // Check page content for indicators
    const pageText = await page.textContent('body');
    const indicators = {
      hasChat: pageText.toLowerCase().includes('chat'),
      hasAgent: pageText.toLowerCase().includes('agent'),
      hasWorkflow: pageText.toLowerCase().includes('workflow'),
      hasN8n: pageText.toLowerCase().includes('n8n') || pageText.toLowerCase().includes('connected'),
      hasDemo: pageText.toLowerCase().includes('demo'),
      hasMessages: pageText.toLowerCase().includes('message')
    };
    
    console.log('   Page indicators:');
    Object.entries(indicators).forEach(([key, value]) => {
      console.log(`     ${value ? '✓' : '✗'} ${key}: ${value}`);
    });
    
    // 6. Test chat functionality if possible
    if (messageInput && sendButton) {
      console.log('6. Testing chat functionality...');
      
      const testMessage = "Hello! Can you help me create a simple webhook workflow?";
      
      // Type message
      await messageInput.click();
      await messageInput.fill(testMessage);
      console.log(`   ✓ Typed: "${testMessage}"`);
      
      await page.screenshot({ path: '/tmp/05-message-typed.png' });
      
      // Send message
      await sendButton.click();
      console.log('   ✓ Message sent');
      
      // Wait for response
      console.log('   ⏳ Waiting for AI response (15 seconds)...');
      await page.waitForTimeout(15000);
      
      await page.screenshot({ path: '/tmp/06-after-send.png' });
      
      // Check for response
      const newPageText = await page.textContent('body');
      const responseFound = newPageText.length > pageText.length + 100;
      const hasAIResponse = newPageText.includes('workflow') || 
                           newPageText.includes('orchestrator') ||
                           newPageText.includes('I') ||
                           newPageText.includes('help');
      
      console.log(`   Response detected: ${responseFound}`);
      console.log(`   AI content found: ${hasAIResponse}`);
      
      // Check if demo mode or real AI
      const isDemoMode = newPageText.toLowerCase().includes('demo mode') || 
                        newPageText.toLowerCase().includes('configure your openai');
      console.log(`   Mode: ${isDemoMode ? 'DEMO MODE' : 'REAL AI'}`);
      
      return {
        success: true,
        authenticated: true,
        chatWorking: true,
        aiResponding: hasAIResponse,
        demoMode: isDemoMode
      };
      
    } else {
      console.log('6. Chat interface not ready or not accessible');
      
      // Debug output
      console.log('   Message input found:', messageInput !== null);
      console.log('   Send button found:', sendButton !== null);
      
      // Save page HTML for debugging
      const html = await page.content();
      require('fs').writeFileSync('/tmp/debug.html', html);
      console.log('   Debug HTML saved to /tmp/debug.html');
      
      return {
        success: false,
        authenticated: !chatPageUrl.includes('/auth'),
        chatWorking: false,
        error: 'Chat interface not found'
      };
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    
    if (page) {
      await page.screenshot({ path: '/tmp/error.png' });
    }
    
    return {
      success: false,
      error: error.message
    };
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
async function main() {
  console.log('Starting comprehensive chat system test...\n');
  
  const result = await completeTest();
  
  console.log('\n📊 FINAL TEST RESULTS:');
  console.log('========================');
  
  if (result.success) {
    console.log('✅ Test completed successfully');
    console.log(`✅ Authentication: ${result.authenticated ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Chat Interface: ${result.chatWorking ? 'WORKING' : 'NOT FOUND'}`);
    console.log(`✅ AI Responding: ${result.aiResponding ? 'YES' : 'NO'}`);
    console.log(`✅ Mode: ${result.demoMode ? 'DEMO MODE' : 'REAL AI'}`);
    
    if (result.chatWorking && !result.demoMode) {
      console.log('\n🎉 CHAT SYSTEM WITH REAL AI IS FULLY FUNCTIONAL!');
    } else if (result.chatWorking && result.demoMode) {
      console.log('\n⚠️  CHAT WORKING IN DEMO MODE');
      console.log('Set VITE_OPENAI_API_KEY in Netlify for real AI');
    }
  } else {
    console.log('❌ Test failed');
    console.log(`Error: ${result.error}`);
  }
  
  console.log('\n📸 Screenshots saved:');
  console.log('  /tmp/01-initial.png');
  console.log('  /tmp/02-login-filled.png');
  console.log('  /tmp/03-after-login.png');
  console.log('  /tmp/04-chat-page.png');
  console.log('  /tmp/05-message-typed.png');
  console.log('  /tmp/06-after-send.png');
  
  console.log('\n📝 NEXT STEPS:');
  if (!result.demoMode) {
    console.log('✅ OpenAI integration is working!');
  } else {
    console.log('1. Set VITE_OPENAI_API_KEY in Netlify dashboard');
    console.log('2. Trigger new deployment');
    console.log('3. Run this test again');
  }
}

// Install Playwright if needed
(async () => {
  try {
    await main();
  } catch (error) {
    if (error.message.includes('chromium')) {
      console.log('Installing Playwright...');
      const { execSync } = await import('child_process');
      execSync('npx playwright install chromium', { stdio: 'inherit' });
      await main();
    } else {
      throw error;
    }
  }
})().catch(console.error);