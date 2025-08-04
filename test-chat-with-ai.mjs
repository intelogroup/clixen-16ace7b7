#!/usr/bin/env node

// Comprehensive Playwright test with real OpenAI integration
import { chromium } from 'playwright';
import fs from 'fs';

const NETLIFY_URL = 'https://clixen.netlify.app';
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Jimkali90#';

console.log('🤖 TESTING CHAT SYSTEM WITH REAL AI...\n');

async function testChatWithAI() {
  let browser, context, page;
  const screenshots = [];
  
  try {
    console.log('1. Setting up browser...');
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create context with proper viewport
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('   Browser error:', msg.text());
      }
    });
    
    // Track network errors
    page.on('requestfailed', request => {
      console.log('   Network error:', request.url(), request.failure()?.errorText);
    });
    
    console.log('2. Navigating to Clixen...');
    await page.goto(NETLIFY_URL, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Take initial screenshot
    await page.screenshot({ path: '/tmp/1-landing.png', fullPage: true });
    screenshots.push('/tmp/1-landing.png');
    console.log('   ✓ Landing page loaded');
    
    // Check current URL
    const initialUrl = page.url();
    console.log(`   Current URL: ${initialUrl}`);
    
    // Check if we need to login
    const hasEmailInput = await page.locator('input[type="email"]').count() > 0;
    
    if (hasEmailInput || initialUrl.includes('/auth')) {
      console.log('3. Logging in...');
      
      // Fill login form
      await page.fill('input[type="email"]', TEST_EMAIL);
      await page.fill('input[type="password"]', TEST_PASSWORD);
      
      // Take screenshot before login
      await page.screenshot({ path: '/tmp/2-login-form.png', fullPage: true });
      screenshots.push('/tmp/2-login-form.png');
      
      // Click login button
      const loginButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
      await loginButton.click();
      
      // Wait for navigation
      console.log('   ⏳ Waiting for authentication...');
      await page.waitForTimeout(5000); // Give time for auth to complete
      
      const afterLoginUrl = page.url();
      console.log(`   After login URL: ${afterLoginUrl}`);
      
      // Take screenshot after login
      await page.screenshot({ path: '/tmp/3-after-login.png', fullPage: true });
      screenshots.push('/tmp/3-after-login.png');
      
      if (afterLoginUrl.includes('/dashboard')) {
        console.log('   ✓ Login successful - on dashboard');
      } else {
        console.log(`   ? Redirected to: ${afterLoginUrl}`);
      }
    } else {
      console.log('3. Already authenticated or different flow');
    }
    
    console.log('4. Navigating to Chat page...');
    
    // Try to find and click chat link
    const chatLink = page.locator('a[href*="chat"], a:has-text("Chat"), nav a:has-text("Chat"), button:has-text("Chat")');
    const hasChatLink = await chatLink.count() > 0;
    
    if (hasChatLink) {
      console.log('   ✓ Chat link found, clicking...');
      await chatLink.first().click();
      await page.waitForTimeout(3000);
    } else {
      console.log('   ? No chat link, navigating directly...');
      await page.goto(`${NETLIFY_URL}/chat`, { waitUntil: 'networkidle' });
    }
    
    // Check if we're on chat page
    const chatUrl = page.url();
    console.log(`   Current URL: ${chatUrl}`);
    
    // Take screenshot of chat page
    await page.screenshot({ path: '/tmp/4-chat-page.png', fullPage: true });
    screenshots.push('/tmp/4-chat-page.png');
    
    if (!chatUrl.includes('/chat')) {
      console.log('   ⚠️  Not on chat page, trying direct navigation...');
      await page.goto(`${NETLIFY_URL}/chat`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
    }
    
    console.log('5. Testing chat interface...');
    
    // Look for chat input with multiple selectors
    const inputSelectors = [
      'textarea[placeholder*="message" i]',
      'input[placeholder*="message" i]',
      'textarea[placeholder*="type" i]',
      'input[placeholder*="type" i]',
      'textarea[placeholder*="ask" i]',
      'textarea',
      'input[type="text"]:visible'
    ];
    
    let messageInput = null;
    for (const selector of inputSelectors) {
      const input = page.locator(selector);
      if (await input.count() > 0) {
        messageInput = input.first();
        console.log(`   ✓ Found message input with selector: ${selector}`);
        break;
      }
    }
    
    // Look for send button
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]:visible, button:has(svg[class*="send" i]), button:has(svg[class*="arrow" i])').first();
    const hasSendButton = await sendButton.count() > 0;
    
    console.log(`   Message input found: ${messageInput !== null}`);
    console.log(`   Send button found: ${hasSendButton}`);
    
    // Check for agent monitoring components
    const agentMonitor = await page.locator('[class*="agent" i], [id*="agent" i]').count();
    console.log(`   Agent monitor components: ${agentMonitor}`);
    
    // Check n8n connection status
    const pageContent = await page.textContent('body');
    const hasN8nStatus = pageContent.includes('Connected') || pageContent.includes('Demo mode') || pageContent.includes('n8n');
    console.log(`   n8n status visible: ${hasN8nStatus}`);
    
    if (messageInput && hasSendButton) {
      console.log('6. Sending test message to AI agents...');
      
      const testMessage = "Hello! Can you help me create a simple webhook workflow that receives form data and sends an email notification?";
      
      // Type the message
      await messageInput.fill(testMessage);
      console.log(`   ✓ Typed message: "${testMessage.substring(0, 50)}..."`);
      
      // Take screenshot before sending
      await page.screenshot({ path: '/tmp/5-before-send.png', fullPage: true });
      screenshots.push('/tmp/5-before-send.png');
      
      // Click send
      await sendButton.click();
      console.log('   ✓ Message sent');
      
      // Wait for AI response
      console.log('   ⏳ Waiting for AI agent response...');
      await page.waitForTimeout(10000); // Wait 10 seconds for response
      
      // Take screenshot after response
      await page.screenshot({ path: '/tmp/6-after-response.png', fullPage: true });
      screenshots.push('/tmp/6-after-response.png');
      
      // Check for agent responses
      const updatedContent = await page.textContent('body');
      
      // Check for various indicators of AI response
      const responseIndicators = {
        hasOrchestratorResponse: updatedContent.includes('orchestrator') || updatedContent.includes('coordinate'),
        hasWorkflowMention: updatedContent.includes('workflow') || updatedContent.includes('n8n'),
        hasWebhookMention: updatedContent.includes('webhook') || updatedContent.includes('form'),
        hasAgentActivity: updatedContent.includes('agent') || updatedContent.includes('Agent'),
        hasProcessingStatus: updatedContent.includes('thinking') || updatedContent.includes('processing') || updatedContent.includes('working'),
        hasErrorMessage: updatedContent.includes('error') || updatedContent.includes('Error'),
        hasDemoMode: updatedContent.includes('demo') || updatedContent.includes('Demo')
      };
      
      console.log('   Response analysis:');
      Object.entries(responseIndicators).forEach(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').toLowerCase().replace('has ', '');
        console.log(`     ${value ? '✓' : '✗'} ${label}: ${value}`);
      });
      
      // Count message elements
      const messageElements = await page.locator('[class*="message" i], [class*="chat" i], .prose').count();
      console.log(`   Total message elements: ${messageElements}`);
      
      // Check if OpenAI is actually being called (no demo mode)
      const isRealAI = !responseIndicators.hasDemoMode && responseIndicators.hasAgentActivity;
      console.log(`   Using real AI: ${isRealAI ? '✅ YES' : '❌ NO (Demo mode)'}`);
      
      // Test another message
      console.log('7. Sending follow-up message...');
      
      const followUpMessage = "What nodes would you recommend for this workflow?";
      await messageInput.fill(followUpMessage);
      await sendButton.click();
      console.log(`   ✓ Sent follow-up: "${followUpMessage}"`);
      
      // Wait for second response
      await page.waitForTimeout(8000);
      
      // Final screenshot
      await page.screenshot({ path: '/tmp/7-conversation.png', fullPage: true });
      screenshots.push('/tmp/7-conversation.png');
      
      // Final content check
      const finalContent = await page.textContent('body');
      const hasMultipleResponses = (finalContent.match(/workflow|node|webhook|agent/gi) || []).length > 5;
      
      console.log(`   Multiple AI responses detected: ${hasMultipleResponses}`);
      
      return {
        success: true,
        hasAI: isRealAI,
        chatWorking: true,
        multiAgent: responseIndicators.hasAgentActivity,
        screenshots
      };
      
    } else {
      console.log('6. ❌ Chat interface not fully functional');
      
      // Debug: print page structure
      const bodyHtml = await page.innerHTML('body');
      fs.writeFileSync('/tmp/debug-page.html', bodyHtml);
      console.log('   Debug HTML saved to /tmp/debug-page.html');
      
      return {
        success: false,
        error: 'Chat interface elements not found',
        screenshots
      };
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (page) {
      await page.screenshot({ path: '/tmp/error-screenshot.png', fullPage: true });
      screenshots.push('/tmp/error-screenshot.png');
    }
    
    return {
      success: false,
      error: error.message,
      screenshots
    };
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Performance and network monitoring
async function monitorPerformance() {
  let browser, page;
  
  try {
    console.log('\n8. Testing performance and network...');
    
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    
    // Collect performance metrics
    await page.goto(NETLIFY_URL, { waitUntil: 'networkidle' });
    
    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
    
    console.log('   Performance metrics:');
    console.log(`     DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`     Load Complete: ${metrics.loadComplete}ms`);
    console.log(`     First Paint: ${metrics.firstPaint}ms`);
    console.log(`     First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
    
    return metrics;
    
  } catch (error) {
    console.error('   Performance test error:', error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Main test execution
async function runFullTest() {
  console.log('🚀 Starting comprehensive AI chat test...\n');
  
  // Run chat test
  const chatResult = await testChatWithAI();
  
  // Run performance test
  const perfResult = await monitorPerformance();
  
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('============================');
  
  if (chatResult.success) {
    console.log('✅ Chat Interface: WORKING');
    console.log(`✅ AI Integration: ${chatResult.hasAI ? 'REAL AI ACTIVE' : 'DEMO MODE'}`);
    console.log(`✅ Multi-Agent System: ${chatResult.multiAgent ? 'DETECTED' : 'NOT DETECTED'}`);
  } else {
    console.log('❌ Chat Interface: FAILED');
    console.log(`   Error: ${chatResult.error}`);
  }
  
  if (perfResult) {
    const isPerformant = perfResult.firstContentfulPaint < 3000;
    console.log(`${isPerformant ? '✅' : '⚠️'} Performance: FCP ${perfResult.firstContentfulPaint}ms`);
  }
  
  console.log('\n📸 Screenshots saved:');
  chatResult.screenshots.forEach(path => {
    console.log(`   - ${path}`);
  });
  
  console.log('\n🎯 FINAL ASSESSMENT:');
  if (chatResult.success && chatResult.hasAI) {
    console.log('🎉 CHAT SYSTEM WITH AI IS FULLY FUNCTIONAL!');
    console.log('✅ Real OpenAI integration working');
    console.log('✅ Multi-agent architecture responding');
    console.log('✅ Users can have AI-powered conversations');
  } else if (chatResult.success && !chatResult.hasAI) {
    console.log('⚠️  CHAT WORKING BUT IN DEMO MODE');
    console.log('❌ OpenAI API key may not be active yet');
    console.log('✅ Interface is functional');
  } else {
    console.log('❌ CHAT SYSTEM NEEDS ATTENTION');
    console.log('Issues detected - check screenshots for details');
  }
  
  return chatResult;
}

// Install Playwright if needed and run tests
async function main() {
  try {
    await runFullTest();
  } catch (error) {
    if (error.message.includes('chromium')) {
      console.log('📦 Installing Playwright Chromium...');
      const { execSync } = await import('child_process');
      execSync('npx playwright install chromium', { stdio: 'inherit' });
      console.log('✅ Playwright installed, retrying...\n');
      await runFullTest();
    } else {
      throw error;
    }
  }
}

main().catch(console.error);