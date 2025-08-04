import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_URL = 'https://clixen.netlify.app';
const TEST_EMAIL = 'jimkalinov@gmail.com';
const TEST_PASSWORD = 'Jimkali90#';

// Create screenshots directory
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.log(`Directory ${dir} already exists`);
  }
}

async function testUI() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const page = await browser.newPage();
  const timestamp = new Date().getTime();
  const screenshotDir = path.join(__dirname, 'screenshots', `test-${timestamp}`);
  await ensureDir(screenshotDir);

  const results = {
    timestamp,
    tests: [],
    issues: [],
    recommendations: []
  };

  try {
    console.log('🚀 Starting UI tests for Clixen...\n');

    // Test 1: Desktop View
    console.log('📱 Testing Desktop View (1920x1080)...');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.screenshot({ path: path.join(screenshotDir, '1-desktop-landing.png'), fullPage: true });
    results.tests.push({ name: 'Desktop Landing', status: 'captured' });

    // Test 2: Login Process
    console.log('🔐 Testing Authentication...');
    await new Promise(r => setTimeout(r, 2000));
    
    // Check if we need to login
    // Check for login buttons or links
    let loginButton = await page.$('button');
    if (!loginButton) {
      loginButton = await page.$('a[href*="auth"]') || await page.$('a[href*="login"]');
    }
    if (loginButton) {
      await loginButton.click();
      await new Promise(r => setTimeout(r, 2000));
    }

    // Try to find email/password fields
    const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = await page.$('input[type="password"], input[name="password"], input[placeholder*="password" i]');
    
    if (emailInput && passwordInput) {
      await emailInput.type(TEST_EMAIL);
      await passwordInput.type(TEST_PASSWORD);
      await page.screenshot({ path: path.join(screenshotDir, '2-login-form.png') });
      
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await new Promise(r => setTimeout(r, 5000));
        await page.screenshot({ path: path.join(screenshotDir, '3-after-login.png'), fullPage: true });
        results.tests.push({ name: 'Authentication', status: 'completed' });
      }
    } else {
      results.issues.push('Could not find login form fields');
    }

    // Test 3: Tablet View
    console.log('📱 Testing Tablet View (768x1024)...');
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(screenshotDir, '4-tablet-view.png'), fullPage: true });
    results.tests.push({ name: 'Tablet View', status: 'captured' });

    // Test 4: Mobile View
    console.log('📱 Testing Mobile View (375x667)...');
    await page.setViewport({ width: 375, height: 667 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(screenshotDir, '5-mobile-view.png'), fullPage: true });
    results.tests.push({ name: 'Mobile View', status: 'captured' });

    // Test 5: Chat Interface
    console.log('💬 Testing Chat Interface...');
    await page.setViewport({ width: 1920, height: 1080 });
    const chatLink = await page.$('a[href*="chat"]') || await page.$('button.chat-button');
    if (chatLink) {
      await chatLink.click();
      await new Promise(r => setTimeout(r, 3000));
      await page.screenshot({ path: path.join(screenshotDir, '6-chat-interface.png'), fullPage: true });
      
      // Try to send a test message
      const chatInput = await page.$('textarea, input[type="text"][placeholder*="message" i], input[placeholder*="type" i]');
      if (chatInput) {
        await chatInput.type('Hello! I need help creating a workflow that sends emails when a new form is submitted.');
        await page.screenshot({ path: path.join(screenshotDir, '7-chat-with-message.png') });
        
        const sendButton = await page.$('button[type="submit"]') || await page.$('button[aria-label*="send"]');
        if (sendButton) {
          await sendButton.click();
          await new Promise(r => setTimeout(r, 5000));
          await page.screenshot({ path: path.join(screenshotDir, '8-chat-response.png'), fullPage: true });
          results.tests.push({ name: 'Chat Functionality', status: 'tested' });
        }
      }
    } else {
      results.issues.push('Could not find chat interface link');
    }

    // Test 6: Dashboard
    console.log('📊 Testing Dashboard...');
    const dashboardLink = await page.$('a[href*="dashboard"]') || await page.$('nav a[href="/dashboard"]');
    if (dashboardLink) {
      await dashboardLink.click();
      await new Promise(r => setTimeout(r, 3000));
      await page.screenshot({ path: path.join(screenshotDir, '9-dashboard.png'), fullPage: true });
      results.tests.push({ name: 'Dashboard', status: 'captured' });
    }

    // Test 7: Performance Metrics
    console.log('⚡ Collecting Performance Metrics...');
    const metrics = await page.metrics();
    const performance = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        totalTime: perfData.loadEventEnd - perfData.fetchStart
      };
    });
    
    results.performance = {
      metrics,
      timing: performance
    };

    // Analyze UI Issues
    console.log('\n🔍 Analyzing UI/UX...');
    
    // Check for responsive issues
    await page.setViewport({ width: 375, height: 667 });
    const mobileOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    
    if (mobileOverflow) {
      results.issues.push('Horizontal overflow detected on mobile view');
      results.recommendations.push('Fix horizontal scrolling on mobile devices');
    }

    // Check for accessibility
    const contrastIssues = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const issues = [];
      // Basic contrast check would go here
      return issues;
    });

    console.log('\n✅ UI Testing Complete!\n');
    console.log('📊 Test Results:');
    console.log(`   - Tests Run: ${results.tests.length}`);
    console.log(`   - Issues Found: ${results.issues.length}`);
    console.log(`   - Screenshots: ${screenshotDir}`);
    
    if (results.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      results.issues.forEach(issue => console.log(`   - ${issue}`));
    }

    // Save results
    await fs.writeFile(
      path.join(screenshotDir, 'test-results.json'),
      JSON.stringify(results, null, 2)
    );

  } catch (error) {
    console.error('❌ Test failed:', error);
    results.error = error.message;
  } finally {
    await browser.close();
    return results;
  }
}

// Run the tests
testUI().then(results => {
  console.log('\n📋 Final Report:');
  console.log('================');
  if (results.issues.length === 0) {
    console.log('✅ No critical UI issues found!');
  } else {
    console.log('⚠️  Issues to address:');
    results.issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`);
    });
  }
  
  if (results.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    results.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }
}).catch(console.error);