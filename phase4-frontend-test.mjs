#!/usr/bin/env node

/**
 * Phase 4 - Frontend User Journey Testing
 * 
 * Tests the complete user journey through the frontend application
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Configuration
const FRONTEND_URL = 'http://18.221.12.50';
const TEST_USER = {
  email: 'jayveedz19@gmail.com',
  password: 'Goldyear2023#'
};

const SCREENSHOTS_DIR = path.join(process.cwd(), 'phase4-frontend-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function takeScreenshot(page, name) {
  const filename = `${Date.now()}_${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot: ${filename}`);
  return filepath;
}

async function testFrontendUserJourney() {
  console.log('🚀 Frontend User Journey Testing');
  console.log(`Testing: ${FRONTEND_URL}`);
  console.log('='.repeat(50));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  const results = {
    pageLoad: false,
    authentication: false,
    dashboard: false,
    navigation: false,
    responsiveness: false,
    errors: []
  };

  const performanceMetrics = {};

  try {
    const page = await browser.newPage();
    
    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        results.errors.push(`Console Error: ${msg.text()}`);
        console.log('❌ Console Error:', msg.text());
      }
    });

    // Test 1: Page Load Performance
    console.log('\n📋 Test 1: Page Load Performance');
    const loadStartTime = Date.now();
    
    try {
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2', timeout: 15000 });
      const loadTime = Date.now() - loadStartTime;
      performanceMetrics.pageLoad = loadTime;
      
      results.pageLoad = loadTime < 5000; // 5s threshold for MVP
      console.log(`${results.pageLoad ? '✅' : '❌'} Page load: ${loadTime}ms`);
      
      await takeScreenshot(page, '01_initial_load');
      
    } catch (error) {
      results.errors.push(`Page load failed: ${error.message}`);
      console.log('❌ Page load failed:', error.message);
    }

    // Test 2: Authentication Flow
    console.log('\n📋 Test 2: Authentication Flow');
    
    try {
      // Check for auth elements
      const hasEmailInput = await page.$('input[type="email"]') !== null;
      const hasPasswordInput = await page.$('input[type="password"]') !== null;
      
      if (hasEmailInput && hasPasswordInput) {
        console.log('✅ Auth form detected');
        
        // Fill credentials
        await page.type('input[type="email"]', TEST_USER.email);
        await page.type('input[type="password"]', TEST_USER.password);
        await takeScreenshot(page, '02_credentials_filled');
        
        // Submit form
        const authStartTime = Date.now();
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
        } else {
          await page.keyboard.press('Enter');
        }
        
        // Wait for navigation/response
        await new Promise(resolve => setTimeout(resolve, 5000));
        const authTime = Date.now() - authStartTime;
        performanceMetrics.authentication = authTime;
        
        await takeScreenshot(page, '03_after_auth');
        
        const currentUrl = page.url();
        results.authentication = currentUrl.includes('dashboard') || 
                                currentUrl !== FRONTEND_URL;
        
        console.log(`${results.authentication ? '✅' : '❌'} Authentication: ${authTime}ms`);
        
      } else {
        console.log('⚠️ Auth form not found - checking if already authenticated');
        const currentUrl = page.url();
        results.authentication = currentUrl.includes('dashboard');
      }
      
    } catch (error) {
      results.errors.push(`Authentication failed: ${error.message}`);
      console.log('❌ Authentication error:', error.message);
    }

    // Test 3: Dashboard Access
    console.log('\n📋 Test 3: Dashboard Access');
    
    try {
      // Navigate to dashboard if not already there
      if (!page.url().includes('dashboard')) {
        await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle2' });
      }
      
      await takeScreenshot(page, '04_dashboard');
      
      // Check for dashboard elements
      const dashboardElements = await page.evaluate(() => {
        const hasContent = document.body.innerText.length > 100;
        const hasInteractiveElements = document.querySelectorAll('button, input, a').length > 0;
        const hasWorkflowSection = document.body.innerText.toLowerCase().includes('workflow') ||
                                  document.body.innerText.toLowerCase().includes('automation');
        
        return { hasContent, hasInteractiveElements, hasWorkflowSection };
      });
      
      results.dashboard = dashboardElements.hasContent && dashboardElements.hasInteractiveElements;
      
      console.log(`${results.dashboard ? '✅' : '❌'} Dashboard loaded`);
      console.log(`   Content: ${dashboardElements.hasContent ? '✅' : '❌'}`);
      console.log(`   Interactive: ${dashboardElements.hasInteractiveElements ? '✅' : '❌'}`);
      console.log(`   Workflow UI: ${dashboardElements.hasWorkflowSection ? '✅' : '❌'}`);
      
    } catch (error) {
      results.errors.push(`Dashboard access failed: ${error.message}`);
      console.log('❌ Dashboard error:', error.message);
    }

    // Test 4: Navigation
    console.log('\n📋 Test 4: Navigation Testing');
    
    try {
      // Test navigation links/buttons
      const navigationElements = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')).map(a => ({
          text: a.textContent.trim(),
          href: a.href
        })).filter(link => link.text.length > 0);
        
        const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.textContent.trim(),
          disabled: b.disabled
        })).filter(btn => btn.text.length > 0);
        
        return { links, buttons };
      });
      
      results.navigation = navigationElements.links.length > 0 || 
                          navigationElements.buttons.length > 0;
      
      console.log(`${results.navigation ? '✅' : '❌'} Navigation elements`);
      console.log(`   Links: ${navigationElements.links.length}`);
      console.log(`   Buttons: ${navigationElements.buttons.length}`);
      
    } catch (error) {
      results.errors.push(`Navigation test failed: ${error.message}`);
      console.log('❌ Navigation error:', error.message);
    }

    // Test 5: Responsive Design
    console.log('\n📋 Test 5: Responsive Design');
    
    try {
      // Test mobile viewport
      await page.setViewport({ width: 375, height: 667 }); // iPhone SE
      await new Promise(resolve => setTimeout(resolve, 1000));
      await takeScreenshot(page, '05_mobile_view');
      
      const mobileUsable = await page.evaluate(() => {
        const body = document.body;
        const hasHorizontalScroll = body.scrollWidth > body.clientWidth;
        const hasVisibleContent = body.innerText.trim().length > 50;
        
        return !hasHorizontalScroll && hasVisibleContent;
      });
      
      // Test tablet viewport  
      await page.setViewport({ width: 768, height: 1024 }); // iPad
      await new Promise(resolve => setTimeout(resolve, 1000));
      await takeScreenshot(page, '06_tablet_view');
      
      // Reset to desktop
      await page.setViewport({ width: 1280, height: 800 });
      
      results.responsiveness = mobileUsable;
      
      console.log(`${results.responsiveness ? '✅' : '❌'} Responsive design`);
      
    } catch (error) {
      results.errors.push(`Responsive test failed: ${error.message}`);
      console.log('❌ Responsive error:', error.message);
    }

  } catch (error) {
    results.errors.push(`Test execution failed: ${error.message}`);
    console.log('❌ Test execution error:', error.message);
  } finally {
    await browser.close();
  }

  // Generate Report
  console.log('\n' + '='.repeat(60));
  console.log('📊 FRONTEND TEST RESULTS');
  console.log('='.repeat(60));

  const testResults = [
    ['Page Load', results.pageLoad],
    ['Authentication', results.authentication],
    ['Dashboard Access', results.dashboard],
    ['Navigation', results.navigation],
    ['Responsive Design', results.responsiveness]
  ];

  let passedTests = 0;
  testResults.forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
    if (passed) passedTests++;
  });

  const successRate = Math.round((passedTests / testResults.length) * 100);
  
  console.log(`\n📈 Success Rate: ${successRate}% (${passedTests}/${testResults.length})`);
  
  // Performance Summary
  if (Object.keys(performanceMetrics).length > 0) {
    console.log(`\n🚀 Performance Metrics:`);
    Object.entries(performanceMetrics).forEach(([metric, time]) => {
      console.log(`   ${metric}: ${time}ms`);
    });
  }

  // Error Summary
  if (results.errors.length > 0) {
    console.log(`\n❌ Errors Found (${results.errors.length}):`);
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  // MVP Assessment
  const criticalTests = ['pageLoad', 'authentication', 'dashboard'];
  const criticalPassed = criticalTests.filter(test => results[test]).length;
  
  console.log(`\n🎯 Frontend MVP Assessment:`);
  console.log(`Critical Tests: ${criticalPassed}/${criticalTests.length}`);
  
  if (criticalPassed === criticalTests.length) {
    console.log('✅ FRONTEND READY FOR MVP TRIAL');
  } else {
    console.log('⚠️ FRONTEND NEEDS ATTENTION BEFORE TRIAL');
  }

  console.log(`\n📸 Screenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log('='.repeat(60));

  return {
    results,
    performanceMetrics,
    successRate,
    criticalPassed,
    mvpReady: criticalPassed === criticalTests.length
  };
}

// Run test
testFrontendUserJourney()
  .then(report => {
    console.log('\n✅ Frontend testing completed');
    process.exit(report.mvpReady ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Frontend testing failed:', error);
    process.exit(1);
  });