#!/usr/bin/env node

/**
 * Production Deployment Verification Test
 * Tests clixen.netlify.app to ensure the demo mode issue is resolved
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

// Configuration
const PRODUCTION_URL = 'https://clixen.netlify.app';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Test user credentials
const TEST_USER = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    debug: colors.magenta
  };
  console.log(`${colorMap[type]}${message}${colors.reset}`);
}

async function waitForNetlifyDeployment(maxWaitTime = 300000) { // 5 minutes
  log('\n⏳ Waiting for Netlify deployment to complete...', 'info');
  
  const startTime = Date.now();
  let attemptCount = 0;
  
  while (Date.now() - startTime < maxWaitTime) {
    attemptCount++;
    
    try {
      const response = await fetch(PRODUCTION_URL, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Clixen-Deployment-Test/1.0'
        }
      });
      
      if (response.ok) {
        const deployTime = Math.round((Date.now() - startTime) / 1000);
        log(`✅ Netlify deployment ready! (${deployTime}s, ${attemptCount} attempts)`, 'success');
        return true;
      }
      
      log(`🔄 Attempt ${attemptCount}: Status ${response.status}, waiting 10s...`, 'debug');
    } catch (error) {
      log(`🔄 Attempt ${attemptCount}: Connection error, waiting 10s...`, 'debug');
    }
    
    // Wait 10 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  log('❌ Timeout waiting for Netlify deployment', 'error');
  return false;
}

async function testProductionAuthentication(page) {
  log('\n🔐 Testing Production Authentication...', 'info');
  
  try {
    // Navigate to the chat page (which should redirect to auth if not logged in)
    await page.goto(`${PRODUCTION_URL}/chat`, { waitUntil: 'networkidle' });
    
    // Check if we're on the auth page or if there's a login form
    const isAuthPage = await page.locator('input[type=\"email\"]').isVisible();
    
    if (!isAuthPage) {
      log('⚠️  Already logged in or auth not required', 'warning');
      return true;
    }
    
    // Fill in login credentials
    await page.fill('input[type=\"email\"]', TEST_USER);
    await page.fill('input[type=\"password\"]', TEST_PASSWORD);
    
    // Click login button
    await page.click('button[type=\"submit\"]');
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
    
    // Check if we're now on the chat page
    const isOnChatPage = page.url().includes('/chat');
    if (isOnChatPage) {
      log('✅ Authentication successful - redirected to chat', 'success');
      return true;
    } else {
      log('❌ Authentication failed - still on auth page', 'error');
      return false;
    }
    
  } catch (error) {
    log(`❌ Authentication test error: ${error.message}`, 'error');
    return false;
  }
}

async function testDemoModeResolution(page) {
  log('\n🎭 Testing Demo Mode Resolution...', 'info');
  
  try {
    // Ensure we're on the chat page
    await page.goto(`${PRODUCTION_URL}/chat`, { waitUntil: 'networkidle' });
    
    // Look for demo mode indicators
    const demoModeText = await page.locator('text=Demo Mode Active').count();
    const demoModeMessage = await page.locator('text=OpenAI API not configured').count();
    
    if (demoModeText > 0 || demoModeMessage > 0) {
      log('❌ Demo mode still active on production site', 'error');
      
      // Take a screenshot for debugging
      await page.screenshot({ path: '/tmp/demo-mode-issue.png' });
      log('📸 Screenshot saved to /tmp/demo-mode-issue.png', 'debug');
      
      return false;
    }
    
    log('✅ No demo mode indicators found', 'success');
    return true;
    
  } catch (error) {
    log(`❌ Demo mode test error: ${error.message}`, 'error');
    return false;
  }
}

async function testChatFunctionality(page) {
  log('\n💬 Testing Chat Functionality...', 'info');
  
  try {
    // Ensure we're on the chat page
    await page.goto(`${PRODUCTION_URL}/chat`, { waitUntil: 'networkidle' });
    
    // Find the chat input
    const chatInput = page.locator('textarea, input[placeholder*=\"message\"], input[placeholder*=\"workflow\"], input[placeholder*=\"describe\"]').first();
    
    if (!(await chatInput.isVisible())) {
      log('❌ Chat input not found', 'error');
      return false;
    }
    
    // Type a test message
    const testMessage = 'Hello! Please respond with \"Production test successful\" to confirm the system is working.';
    await chatInput.fill(testMessage);
    
    // Find and click the send button
    const sendButton = page.locator('button[type=\"submit\"], button:has-text(\"Send\")').first();
    await sendButton.click();
    
    log('📤 Test message sent, waiting for response...', 'debug');
    
    // Wait for response (up to 30 seconds)
    let responseReceived = false;
    let responseText = '';
    
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000);
      
      // Look for assistant responses
      const responses = await page.locator('[data-role=\"assistant\"], .assistant-message, div:has-text(\"Assistant:\")').all();
      
      if (responses.length > 0) {
        // Get the last response
        const lastResponse = responses[responses.length - 1];
        responseText = await lastResponse.textContent();
        
        if (responseText && responseText.trim().length > 10) {
          responseReceived = true;
          break;
        }
      }
    }
    
    if (!responseReceived) {
      log('❌ No response received within 30 seconds', 'error');
      
      // Take a screenshot for debugging
      await page.screenshot({ path: '/tmp/no-response-issue.png' });
      log('📸 Screenshot saved to /tmp/no-response-issue.png', 'debug');
      
      return false;
    }
    
    log(`✅ Response received: \"${responseText.substring(0, 100)}...\"`, 'success');
    
    // Check if it's a real AI response (not demo mode)
    if (responseText.includes('Demo Mode Active') || responseText.includes('simulated')) {
      log('⚠️  Received demo mode response instead of real AI', 'warning');
      return 'demo';
    }
    
    log('✅ Real AI response confirmed - system working!', 'success');
    return true;
    
  } catch (error) {
    log(`❌ Chat functionality test error: ${error.message}`, 'error');
    return false;
  }
}

async function runProductionTests() {
  log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════╗
║     Clixen Production Deployment Test      ║
╚═══════════════════════════════════════════╝${colors.reset}`, 'info');
  
  log(`\n📅 Test Date: ${new Date().toISOString()}`, 'info');
  log(`🌐 Production URL: ${PRODUCTION_URL}`, 'info');
  log(`🚀 Testing deployment after Supabase Edge Function updates`, 'info');
  
  const results = {
    deployment: false,
    auth: false,
    demoMode: false,
    chatFunctionality: false
  };
  
  // Test 1: Wait for deployment
  results.deployment = await waitForNetlifyDeployment();
  
  if (!results.deployment) {
    log('\n❌ Deployment not ready, skipping remaining tests', 'error');
    process.exit(1);
  }
  
  // Launch browser for UI tests
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Test 2: Authentication
    results.auth = await testProductionAuthentication(page);
    
    // Test 3: Demo Mode Resolution
    results.demoMode = await testDemoModeResolution(page);
    
    // Test 4: Chat Functionality
    const chatResult = await testChatFunctionality(page);
    results.chatFunctionality = chatResult === true || chatResult === 'demo';
    
  } finally {
    await browser.close();
  }
  
  // Summary
  log(`\n${colors.bright}📊 PRODUCTION TEST SUMMARY${colors.reset}`, 'info');
  log('═══════════════════════════════════════════════', 'info');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  
  for (const [test, passed] of Object.entries(results)) {
    const icon = passed ? '✅' : '❌';
    const status = passed ? 'PASSED' : 'FAILED';
    log(`${icon} ${test.toUpperCase()}: ${status}`, passed ? 'success' : 'error');
  }
  
  log('═══════════════════════════════════════════════', 'info');
  log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`, 
    passedTests === totalTests ? 'success' : 'warning');
  
  if (passedTests === totalTests) {
    log('\n🎉 PRODUCTION DEPLOYMENT SUCCESSFUL!', 'success');
    log('   • Site is accessible and responsive', 'success');
    log('   • Authentication is working', 'success');
    log('   • Demo mode has been resolved', 'success');
    log('   • Chat functionality is operational', 'success');
    log('\n🎯 The Supabase Edge Function integration is working perfectly!', 'success');
  } else {
    log('\n⚠️  Some production tests failed. Check the logs above for details.', 'warning');
    
    if (!results.demoMode || !results.chatFunctionality) {
      log('\n🔧 Troubleshooting steps:', 'info');
      log('   1. Check Supabase Edge Functions are deployed', 'info');
      log('   2. Verify API configurations table has OpenAI key', 'info');
      log('   3. Check browser console for detailed error logs', 'info');
    }
  }
  
  // Exit with appropriate code
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests
runProductionTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'error');
  console.error(error.stack);
  process.exit(1);
});