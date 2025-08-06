#!/usr/bin/env node
/**
 * Comprehensive System Test - Test the full Clixen application
 * Tests authentication, database, multi-agent system, and n8n integration
 */

import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuration
const BASE_URL = 'http://localhost:8081';
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test configuration
const testConfig = {
  headless: false,
  slowMo: 100,
  devtools: false,
  defaultViewport: { width: 1280, height: 800 }
};

// Test results
const testResults = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  }
};

// Utility function to log test results
function logTest(name, passed, error = null, screenshot = null) {
  const test = { name, passed, error: error?.message || null, screenshot };
  testResults.tests.push(test);
  testResults.summary.total++;
  if (passed) {
    testResults.summary.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.summary.failed++;
    testResults.summary.errors.push(error?.message || 'Test failed');
    console.log(`❌ ${name}: ${error?.message || 'Test failed'}`);
  }
}

// Utility function to take screenshot
async function takeScreenshot(page, name) {
  const filename = `test-screenshot-${name.replace(/\s+/g, '-').toLowerCase()}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filename;
}

async function testDatabaseConnection() {
  console.log('\n🔍 Testing Database Connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error && !error.message.includes('relation "profiles" does not exist')) {
      throw error;
    }
    logTest('Database Connection', true);
    
    // Test authentication tables
    const { data: authData, error: authError } = await supabase.auth.getSession();
    logTest('Authentication System', !authError);
    
    return true;
  } catch (error) {
    logTest('Database Connection', false, error);
    return false;
  }
}

async function testEdgeFunctions() {
  console.log('\n🔍 Testing Edge Functions...');
  
  const functions = [
    'ai-chat-system',
    'ai-chat-sessions', 
    'ai-chat-stream',
    'api-operations'
  ];
  
  let allPassed = true;
  
  for (const func of functions) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${func}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // We expect 401 or similar auth error, not 500/404
      const passed = response.status !== 500 && response.status !== 404;
      logTest(`Edge Function: ${func}`, passed);
      if (!passed) allPassed = false;
    } catch (error) {
      logTest(`Edge Function: ${func}`, false, error);
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function testN8nConnection() {
  console.log('\n🔍 Testing n8n API Connection...');
  
  try {
    const response = await fetch('http://18.221.12.50:5678/healthz');
    const passed = response.ok;
    logTest('n8n API Health', passed);
    return passed;
  } catch (error) {
    logTest('n8n API Health', false, error);
    return false;
  }
}

async function testAuthenticationFlow(browser) {
  console.log('\n🔍 Testing Authentication Flow...');
  
  const page = await browser.newPage();
  let screenshot;
  
  try {
    // Navigate to app
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    screenshot = await takeScreenshot(page, 'auth-01-landing');
    
    // Check if already authenticated
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/chat')) {
      console.log('Already authenticated, logging out first...');
      
      // Try to find logout button
      const logoutSelector = '[data-testid="logout"], button:contains("Logout"), button:contains("Sign Out")';
      try {
        await page.click(logoutSelector, { timeout: 3000 });
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });
      } catch (e) {
        console.log('Could not find logout button, clearing localStorage...');
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        await page.reload({ waitUntil: 'networkidle2' });
      }
    }
    
    // Navigate to auth page
    const getStartedButton = await page.$('button:contains("Get Started"), a:contains("Get Started"), [data-testid="get-started"]');
    if (getStartedButton) {
      await getStartedButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    } else {
      // Try direct navigation to auth
      await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle2' });
    }
    
    screenshot = await takeScreenshot(page, 'auth-02-auth-page');
    
    // Fill login form
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    await page.type('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.type('input[type="password"], input[name="password"]', TEST_PASSWORD);
    
    screenshot = await takeScreenshot(page, 'auth-03-credentials-filled');
    
    // Submit form
    const submitButton = await page.$('button[type="submit"], button:contains("Sign In"), button:contains("Login")');
    if (submitButton) {
      await submitButton.click();
    } else {
      await page.keyboard.press('Enter');
    }
    
    // Wait for authentication to complete
    await page.waitForTimeout(3000);
    
    // Check if redirected to dashboard/chat
    const finalUrl = page.url();
    const authenticated = finalUrl.includes('/dashboard') || finalUrl.includes('/chat');
    
    screenshot = await takeScreenshot(page, 'auth-04-final-state');
    
    logTest('Authentication Flow', authenticated);
    await page.close();
    return authenticated;
    
  } catch (error) {
    if (screenshot) await takeScreenshot(page, 'auth-error');
    logTest('Authentication Flow', false, error);
    await page.close();
    return false;
  }
}

async function testMultiAgentSystem(browser) {
  console.log('\n🔍 Testing Multi-Agent System...');
  
  const page = await browser.newPage();
  let screenshot;
  
  try {
    // Navigate to chat interface
    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle2' });
    screenshot = await takeScreenshot(page, 'agent-01-chat-interface');
    
    // Check if chat interface is available
    const chatInput = await page.$('textarea, input[type="text"]');
    if (!chatInput) {
      throw new Error('Chat input not found');
    }
    
    // Test sending a message
    const testMessage = 'Create a simple workflow that sends a welcome email';
    await chatInput.type(testMessage);
    
    screenshot = await takeScreenshot(page, 'agent-02-message-entered');
    
    // Send message
    const sendButton = await page.$('button[type="submit"], button:contains("Send")');
    if (sendButton) {
      await sendButton.click();
    } else {
      await page.keyboard.press('Enter');
    }
    
    // Wait for agent response
    await page.waitForTimeout(5000);
    
    // Check for agent activity indicators
    const hasAgentActivity = await page.evaluate(() => {
      // Look for agent status indicators, progress bars, or responses
      const indicators = document.querySelectorAll('[data-testid*="agent"], .agent, .typing, .loading');
      const responses = document.querySelectorAll('.message, .response, .chat-message');
      return indicators.length > 0 || responses.length > 1;
    });
    
    screenshot = await takeScreenshot(page, 'agent-03-response-state');
    
    logTest('Multi-Agent System Interface', hasAgentActivity);
    await page.close();
    return hasAgentActivity;
    
  } catch (error) {
    if (screenshot) await takeScreenshot(page, 'agent-error');
    logTest('Multi-Agent System Interface', false, error);
    await page.close();
    return false;
  }
}

async function testWorkflowCreation(browser) {
  console.log('\n🔍 Testing Workflow Creation...');
  
  const page = await browser.newPage();
  let screenshot;
  
  try {
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
    screenshot = await takeScreenshot(page, 'workflow-01-dashboard');
    
    // Look for create workflow button
    const createButton = await page.$('button:contains("Create"), [data-testid="create-workflow"]');
    const hasCreateInterface = createButton !== null;
    
    screenshot = await takeScreenshot(page, 'workflow-02-create-interface');
    
    logTest('Workflow Creation Interface', hasCreateInterface);
    await page.close();
    return hasCreateInterface;
    
  } catch (error) {
    if (screenshot) await takeScreenshot(page, 'workflow-error');
    logTest('Workflow Creation Interface', false, error);
    await page.close();
    return false;
  }
}

async function runCompleteSystemTest() {
  console.log('🚀 Starting Comprehensive System Test...');
  console.log('=' .repeat(50));
  
  // Test backend systems first
  await testDatabaseConnection();
  await testEdgeFunctions();
  await testN8nConnection();
  
  // Test frontend with browser
  const browser = await puppeteer.launch(testConfig);
  
  try {
    await testAuthenticationFlow(browser);
    await testMultiAgentSystem(browser);
    await testWorkflowCreation(browser);
  } finally {
    await browser.close();
  }
  
  // Generate test report
  const reportFile = `test-report-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results Summary');
  console.log('=' .repeat(50));
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`Passed: ${testResults.summary.passed}`);
  console.log(`Failed: ${testResults.summary.failed}`);
  console.log(`Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
  console.log(`Report saved: ${reportFile}`);
  
  // Log failed tests
  if (testResults.summary.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
  }
  
  return testResults.summary.failed === 0;
}

// Run the test
runCompleteSystemTest()
  .then(success => {
    console.log(`\n🏁 System test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 System test crashed:', error);
    process.exit(1);
  });