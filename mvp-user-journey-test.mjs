#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://127.0.0.1:8081';
const TEST_USER = {
  email: 'jayveedz19@gmail.com',
  password: 'Goldyear2023#'
};

// Create screenshots directory
const SCREENSHOTS_DIR = path.join(__dirname, 'mvp-test-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Screenshot helper
async function takeScreenshot(page, name) {
  const filename = `${Date.now()}_${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filepath;
}

// Main test function
async function runMVPUserJourneyTest() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 CLIXEN MVP USER JOURNEY TEST');
  console.log('='.repeat(60) + '\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  const testResults = {
    authentication: false,
    dashboard: false,
    projectManagement: false,
    chatInterface: false,
    workflowCreation: false,
    deployment: false,
    monitoring: false
  };

  try {
    const page = await browser.newPage();
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });

    // ============================================
    // STEP 1: AUTHENTICATION
    // ============================================
    console.log('📋 STEP 1: Testing Authentication Flow\n');
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, '01_initial_load');
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Check if we're on auth page
    const hasEmailInput = await page.$('input[type="email"]') !== null;
    const hasPasswordInput = await page.$('input[type="password"]') !== null;
    
    if (hasEmailInput && hasPasswordInput) {
      console.log('✅ Auth page detected');
      
      // Fill credentials
      await page.type('input[type="email"]', TEST_USER.email);
      await page.type('input[type="password"]', TEST_USER.password);
      await takeScreenshot(page, '02_credentials_filled');
      
      // Look for sign in button
      const signInButton = await page.$('button[type="submit"]') || 
                           await page.$('button') && await page.$$eval('button', buttons => 
                             buttons.find(b => b.textContent.toLowerCase().includes('sign in')));
      
      if (signInButton) {
        console.log('Clicking sign in button...');
        await page.click('button[type="submit"]');
      } else {
        console.log('Pressing Enter to submit...');
        await page.keyboard.press('Enter');
      }
      
      // Wait for navigation
      console.log('⏳ Waiting for authentication...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await takeScreenshot(page, '03_after_auth_attempt');
      
      const newUrl = page.url();
      if (newUrl.includes('dashboard')) {
        console.log('✅ Successfully authenticated and redirected to dashboard');
        testResults.authentication = true;
      } else {
        console.log('⚠️ Authentication may have failed or requires verification');
        
        // Check for error messages
        const errorText = await page.evaluate(() => {
          const errorElements = document.querySelectorAll('.error, .alert, [role="alert"]');
          return Array.from(errorElements).map(el => el.textContent).join(' ');
        });
        
        if (errorText) {
          console.log(`Error message: ${errorText}`);
        }
      }
    } else if (currentUrl.includes('dashboard')) {
      console.log('✅ Already authenticated (redirected to dashboard)');
      testResults.authentication = true;
    }
    
    // ============================================
    // STEP 2: DASHBOARD & PROJECT MANAGEMENT
    // ============================================
    console.log('\n📋 STEP 2: Testing Dashboard & Project Management\n');
    
    // Navigate to dashboard if not there
    if (!page.url().includes('dashboard')) {
      console.log('Navigating to dashboard...');
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
    }
    
    await takeScreenshot(page, '04_dashboard');
    
    // Check dashboard elements
    const dashboardContent = await page.evaluate(() => {
      return {
        hasProjects: document.querySelector('[class*="project"], [data-testid*="project"]') !== null,
        hasWorkflows: document.querySelector('[class*="workflow"], [data-testid*="workflow"]') !== null,
        hasNewButton: Array.from(document.querySelectorAll('button')).some(b => 
          b.textContent.toLowerCase().includes('new') || b.textContent.toLowerCase().includes('create')),
        pageText: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log(`Projects section: ${dashboardContent.hasProjects ? '✅' : '❌'}`);
    console.log(`Workflows section: ${dashboardContent.hasWorkflows ? '✅' : '❌'}`);
    console.log(`Action buttons: ${dashboardContent.hasNewButton ? '✅' : '❌'}`);
    
    if (dashboardContent.hasProjects || dashboardContent.hasWorkflows) {
      testResults.dashboard = true;
      testResults.projectManagement = dashboardContent.hasProjects;
    }
    
    // ============================================
    // STEP 3: CHAT INTERFACE
    // ============================================
    console.log('\n📋 STEP 3: Testing Chat Interface\n');
    
    // Look for chat navigation
    const chatLink = await page.$('a[href*="chat"]') || 
                     await page.$$eval('button', buttons => 
                       buttons.find(b => b.textContent.toLowerCase().includes('workflow')));
    
    if (chatLink) {
      console.log('Navigating to chat...');
      const chatSelector = await page.$('a[href*="chat"]') ? 'a[href*="chat"]' : 'button';
      await page.click(chatSelector);
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      console.log('Direct navigation to chat...');
      await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle2' });
    }
    
    await takeScreenshot(page, '05_chat_interface');
    
    // Check for chat elements
    const chatElements = await page.evaluate(() => {
      return {
        hasInput: document.querySelector('textarea, input[type="text"][placeholder*="message" i]') !== null,
        hasMessages: document.querySelector('[class*="message"], [class*="chat"]') !== null,
        hasSendButton: document.querySelector('button[type="submit"]') !== null ||
                       Array.from(document.querySelectorAll('button')).some(b => 
                         b.textContent.toLowerCase().includes('send'))
      };
    });
    
    console.log(`Chat input: ${chatElements.hasInput ? '✅' : '❌'}`);
    console.log(`Message area: ${chatElements.hasMessages ? '✅' : '❌'}`);
    console.log(`Send button: ${chatElements.hasSendButton ? '✅' : '❌'}`);
    
    if (chatElements.hasInput) {
      testResults.chatInterface = true;
      
      // Try sending a message
      console.log('\n🤖 Testing workflow creation...');
      const testPrompt = 'Create a simple workflow that sends an email notification when a form is submitted';
      
      const inputSelector = 'textarea, input[type="text"][placeholder*="message" i]';
      await page.type(inputSelector, testPrompt);
      await takeScreenshot(page, '06_prompt_entered');
      
      // Send message
      if (chatElements.hasSendButton) {
        const sendButton = await page.$('button[type="submit"]');
        if (sendButton) {
          await sendButton.click();
        } else {
          await page.keyboard.press('Enter');
        }
      } else {
        await page.keyboard.press('Enter');
      }
      
      console.log('⏳ Waiting for AI response...');
      await new Promise(resolve => setTimeout(resolve, 8000));
      await takeScreenshot(page, '07_ai_response');
      
      // Check for response
      const hasResponse = await page.evaluate(() => {
        const messages = document.querySelectorAll('[class*="message"]');
        return messages.length > 1;
      });
      
      if (hasResponse) {
        console.log('✅ AI response received');
        testResults.workflowCreation = true;
      }
    }
    
    // ============================================
    // STEP 4: DEPLOYMENT CHECK
    // ============================================
    console.log('\n📋 STEP 4: Checking Deployment Options\n');
    
    const deploymentOptions = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return {
        hasDeployButton: buttons.some(b => b.textContent.toLowerCase().includes('deploy')),
        hasSaveButton: buttons.some(b => b.textContent.toLowerCase().includes('save')),
        hasExportButton: buttons.some(b => b.textContent.toLowerCase().includes('export'))
      };
    });
    
    console.log(`Deploy button: ${deploymentOptions.hasDeployButton ? '✅' : '❌'}`);
    console.log(`Save button: ${deploymentOptions.hasSaveButton ? '✅' : '❌'}`);
    console.log(`Export button: ${deploymentOptions.hasExportButton ? '✅' : '❌'}`);
    
    if (deploymentOptions.hasDeployButton || deploymentOptions.hasSaveButton) {
      testResults.deployment = true;
    }
    
    await takeScreenshot(page, '08_deployment_options');
    
    // ============================================
    // STEP 5: MONITORING
    // ============================================
    console.log('\n📋 STEP 5: Testing Monitoring & Analytics\n');
    
    // Return to dashboard
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, '09_final_dashboard');
    
    const monitoringData = await page.evaluate(() => {
      return {
        workflowCount: document.querySelectorAll('[class*="workflow"]').length,
        hasStats: document.querySelector('[class*="stat"], [class*="metric"]') !== null,
        hasStatus: document.querySelector('[class*="status"], [class*="badge"]') !== null
      };
    });
    
    console.log(`Workflows displayed: ${monitoringData.workflowCount}`);
    console.log(`Statistics: ${monitoringData.hasStats ? '✅' : '❌'}`);
    console.log(`Status indicators: ${monitoringData.hasStatus ? '✅' : '❌'}`);
    
    if (monitoringData.workflowCount > 0 || monitoringData.hasStats) {
      testResults.monitoring = true;
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    if (page) {
      await takeScreenshot(page, 'error_screenshot').catch(() => {});
    }
  } finally {
    await browser.close();
  }
  
  // ============================================
  // TEST SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 MVP USER JOURNEY TEST RESULTS');
  console.log('='.repeat(60) + '\n');
  
  const results = [
    ['Authentication', testResults.authentication],
    ['Dashboard Access', testResults.dashboard],
    ['Project Management', testResults.projectManagement],
    ['Chat Interface', testResults.chatInterface],
    ['Workflow Creation', testResults.workflowCreation],
    ['Deployment Options', testResults.deployment],
    ['Monitoring & Analytics', testResults.monitoring]
  ];
  
  let passedTests = 0;
  results.forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
    if (passed) passedTests++;
  });
  
  const successRate = Math.round((passedTests / results.length) * 100);
  console.log(`\n📈 Success Rate: ${successRate}% (${passedTests}/${results.length} tests passed)`);
  console.log(`📸 Screenshots saved to: ${SCREENSHOTS_DIR}`);
  
  // Determine overall status
  const criticalTests = ['authentication', 'dashboard', 'chatInterface'];
  const criticalPassed = criticalTests.every(test => testResults[test]);
  
  if (criticalPassed) {
    console.log('\n✅ MVP CRITICAL PATH: FUNCTIONAL');
  } else {
    console.log('\n⚠️ MVP CRITICAL PATH: NEEDS ATTENTION');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Exit with appropriate code
  process.exit(successRate >= 50 ? 0 : 1);
}

// Run the test
runMVPUserJourneyTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});