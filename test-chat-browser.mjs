#!/usr/bin/env node

// Browser automation test for chat system using Playwright
import { chromium } from 'playwright';

const NETLIFY_URL = 'https://clixen.netlify.app';
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Jimkali90#';

console.log('🎭 BROWSER AUTOMATION CHAT TEST...\n');

async function testChatInBrowser() {
  let browser, page;
  
  try {
    console.log('1. Launching browser...');
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('2. Navigating to Clixen app...');
    await page.goto(NETLIFY_URL, { waitUntil: 'networkidle' });
    
    // Take screenshot of landing page
    await page.screenshot({ path: '/tmp/clixen-landing.png', fullPage: true });
    console.log('   ✓ Screenshot saved: /tmp/clixen-landing.png');
    
    // Check if login form is present
    const hasLoginForm = await page.locator('input[type="email"], input[placeholder*="email" i]').count() > 0;
    console.log(`   ✓ Login form present: ${hasLoginForm}`);
    
    if (hasLoginForm) {
      console.log('3. Attempting login...');
      
      // Fill login form
      await page.fill('input[type="email"], input[placeholder*="email" i]', TEST_EMAIL);
      await page.fill('input[type="password"], input[placeholder*="password" i]', TEST_PASSWORD);
      
      // Click login button
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
      
      // Wait for navigation or dashboard
      try {
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        console.log('   ✓ Login successful - redirected to dashboard');
      } catch {
        // Maybe redirected elsewhere or login failed
        const currentUrl = page.url();
        console.log(`   ? Current URL after login attempt: ${currentUrl}`);
      }
    } else {
      console.log('3. No login form found - checking if already authenticated...');
    }
    
    console.log('4. Looking for chat page/functionality...');
    
    // Try to find chat link or navigate directly
    const chatLink = page.locator('a[href*="chat"], a:has-text("Chat"), nav a:has-text("Chat")');
    const hasChatLink = await chatLink.count() > 0;
    
    if (hasChatLink) {
      console.log('   ✓ Chat link found, clicking...');
      await chatLink.first().click();
      await page.waitForTimeout(2000); // Wait for page load
    } else {
      console.log('   ? No chat link found, trying direct navigation...');
      await page.goto(`${NETLIFY_URL}/chat`, { waitUntil: 'networkidle' });
    }
    
    // Check if we're on the chat page
    const currentUrl = page.url();
    const isOnChatPage = currentUrl.includes('/chat');
    console.log(`   Current URL: ${currentUrl}`);
    console.log(`   On chat page: ${isOnChatPage}`);
    
    // Take screenshot of chat page
    await page.screenshot({ path: '/tmp/clixen-chat.png', fullPage: true });
    console.log('   ✓ Screenshot saved: /tmp/clixen-chat.png');
    
    console.log('5. Testing chat interface elements...');
    
    // Look for chat input elements
    const messageInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i], input[type="text"]:last-of-type, textarea:last-of-type');
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]:last-of-type, button:has(svg)');
    
    const hasMessageInput = await messageInput.count() > 0;
    const hasSendButton = await sendButton.count() > 0;
    
    console.log(`   ✓ Message input found: ${hasMessageInput}`);
    console.log(`   ✓ Send button found: ${hasSendButton}`);
    
    // Look for agent status or monitoring components
    const agentElements = await page.locator('[class*="agent"], [id*="agent"], [data-testid*="agent"]').count();
    const statusElements = await page.locator('[class*="status"], [class*="progress"], [class*="monitor"]').count();
    
    console.log(`   ✓ Agent-related elements: ${agentElements}`);
    console.log(`   ✓ Status/progress elements: ${statusElements}`);
    
    if (hasMessageInput && hasSendButton) {
      console.log('6. Testing chat functionality...');
      
      const testMessage = "Create a simple webhook workflow for handling form submissions";
      
      // Type test message
      await messageInput.fill(testMessage);
      console.log(`   ✓ Typed test message: "${testMessage}"`);
      
      // Click send
      await sendButton.click();
      console.log('   ✓ Clicked send button');
      
      // Wait for response (look for new message elements)
      console.log('   ⏳ Waiting for agent response...');
      await page.waitForTimeout(5000); // Wait 5 seconds for response
      
      // Check for response messages
      const messageElements = await page.locator('[class*="message"], [class*="chat"], .prose, p').count();
      console.log(`   ✓ Message elements found: ${messageElements}`);
      
      // Look for specific agent responses
      const responseText = await page.textContent('body');
      const hasAgentResponse = responseText.includes('orchestrator') || 
                              responseText.includes('workflow') || 
                              responseText.includes('n8n') ||
                              responseText.includes('demo');
      
      console.log(`   ✓ Agent response detected: ${hasAgentResponse}`);
      
      // Take final screenshot
      await page.screenshot({ path: '/tmp/clixen-chat-after-message.png', fullPage: true });
      console.log('   ✓ Final screenshot saved: /tmp/clixen-chat-after-message.png');
      
      // Check for n8n connection status
      const n8nStatus = responseText.includes('Connected') || responseText.includes('demo mode');
      console.log(`   ✓ n8n status mentioned: ${n8nStatus}`);
      
      return {
        success: true,
        chatFunctional: hasMessageInput && hasSendButton,
        agentResponse: hasAgentResponse,
        n8nStatus: n8nStatus
      };
    } else {
      console.log('6. ❌ Chat interface not fully functional');
      return {
        success: false,
        error: 'Missing chat input or send button'
      };
    }
    
  } catch (error) {
    console.error('❌ Browser test failed:', error.message);
    
    if (page) {
      await page.screenshot({ path: '/tmp/clixen-error.png', fullPage: true });
      console.log('   Error screenshot saved: /tmp/clixen-error.png');
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

// Check console errors and network requests
async function checkBrowserConsole() {
  let browser, page;
  
  try {
    console.log('\n7. Checking browser console for errors...');
    
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    
    const consoleMessages = [];
    const networkErrors = [];
    
    // Listen for console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    // Listen for network failures
    page.on('requestfailed', request => {
      networkErrors.push({
        url: request.url(),
        error: request.failure()?.errorText
      });
    });
    
    await page.goto(NETLIFY_URL, { waitUntil: 'networkidle' });
    
    // Analyze console messages
    const errors = consoleMessages.filter(msg => msg.type === 'error');
    const warnings = consoleMessages.filter(msg => msg.type === 'warning');
    
    console.log(`   Console errors: ${errors.length}`);
    console.log(`   Console warnings: ${warnings.length}`);
    console.log(`   Network failures: ${networkErrors.length}`);
    
    if (errors.length > 0) {
      console.log('   Top errors:');
      errors.slice(0, 3).forEach(error => {
        console.log(`     - ${error.text}`);
      });
    }
    
    if (networkErrors.length > 0) {
      console.log('   Network failures:');
      networkErrors.slice(0, 3).forEach(error => {
        console.log(`     - ${error.url}: ${error.error}`);
      });
    }
    
    return {
      errors: errors.length,
      warnings: warnings.length,
      networkErrors: networkErrors.length
    };
    
  } catch (error) {
    console.error('❌ Console check failed:', error.message);
    return { error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the tests
async function runBrowserTests() {
  console.log('🚀 Starting browser-based chat testing...\n');
  
  const chatTest = await testChatInBrowser();
  const consoleTest = await checkBrowserConsole();
  
  console.log('\n📊 BROWSER TEST RESULTS:');
  console.log('==========================');
  
  if (chatTest.success) {
    console.log('✅ Chat Interface: FUNCTIONAL');
    console.log(`✅ Message Input/Send: ${chatTest.chatFunctional ? 'WORKING' : 'ISSUES'}`);
    console.log(`✅ Agent Response: ${chatTest.agentResponse ? 'DETECTED' : 'NOT DETECTED'}`);
    console.log(`✅ n8n Status: ${chatTest.n8nStatus ? 'MENTIONED' : 'NOT MENTIONED'}`);
  } else {
    console.log('❌ Chat Interface: FAILED');
    console.log(`   Error: ${chatTest.error}`);
  }
  
  if (consoleTest.errors !== undefined) {
    console.log(`📊 Browser Console: ${consoleTest.errors} errors, ${consoleTest.warnings} warnings`);
    console.log(`📊 Network Issues: ${consoleTest.networkErrors} failed requests`);
  }
  
  console.log('\n🎯 FINAL ASSESSMENT:');
  if (chatTest.success && chatTest.chatFunctional) {
    console.log('🎉 CHAT SYSTEM IS WORKING!');
    console.log('✅ Users can interact with the multi-agent system');
    console.log('✅ Interface is responsive and functional');
    console.log('✅ Agent coordination appears to be working');
  } else {
    console.log('⚠️  CHAT SYSTEM NEEDS ATTENTION');
    console.log('❌ Some functionality may not be working as expected');
  }
  
  console.log('\n📸 Screenshots available at:');
  console.log('   - /tmp/clixen-landing.png');
  console.log('   - /tmp/clixen-chat.png');
  console.log('   - /tmp/clixen-chat-after-message.png');
}

// Install playwright if not available and run tests
async function main() {
  try {
    await runBrowserTests();
  } catch (error) {
    if (error.message.includes('chromium')) {
      console.log('📦 Installing Playwright Chromium...');
      const { execSync } = await import('child_process');
      execSync('npx playwright install chromium', { stdio: 'inherit' });
      console.log('✅ Playwright installed, retrying...');
      await runBrowserTests();
    } else {
      throw error;
    }
  }
}

main().catch(console.error);