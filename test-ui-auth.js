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

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.log(`Directory ${dir} exists`);
  }
}

async function testAuthAndUI() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();
  const timestamp = new Date().getTime();
  const screenshotDir = path.join(__dirname, 'screenshots', `auth-test-${timestamp}`);
  await ensureDir(screenshotDir);

  const issues = [];
  const improvements = [];

  try {
    console.log('🚀 Starting Clixen UI Authentication & Responsiveness Tests\n');

    // Test 1: Landing Page Load
    console.log('📱 Testing Landing Page...');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const title = await page.title();
    console.log(`   Title: ${title}`);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-landing-desktop.png'), 
      fullPage: true 
    });

    // Test 2: Navigate to Auth
    console.log('🔐 Navigating to Authentication...');
    
    // Try "Get Started" button first
    const getStartedBtn = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Get Started')) return btn;
      }
      return document.querySelector('button') || document.querySelector('a[href*="/auth"]');
    });
    
    if (getStartedBtn) {
      console.log('   Found navigation button');
      await page.evaluate(() => {
        const btn = document.querySelector('button') || document.querySelector('a[href*="/auth"]');
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 3000));
    }

    // Alternative: Try direct navigation to /auth
    const currentUrl = page.url();
    if (!currentUrl.includes('/auth') && !currentUrl.includes('/login')) {
      console.log('   Navigating directly to /auth...');
      await page.goto(`${TEST_URL}/auth`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2000));
    }

    await page.screenshot({ 
      path: path.join(screenshotDir, '02-auth-page.png'), 
      fullPage: true 
    });

    // Test 3: Attempt Login
    console.log('🔑 Testing Login Form...');
    
    // Look for email input
    const emailInputs = await page.$$('input[type="email"]') || 
                       await page.$$('input[name="email"]') ||
                       await page.$$('input[id*="email"]');
    
    if (emailInputs && emailInputs.length > 0) {
      console.log('   Found email input field');
      await emailInputs[0].type(TEST_EMAIL);
      
      // Look for password input
      const passwordInputs = await page.$$('input[type="password"]') ||
                           await page.$$('input[name="password"]');
      
      if (passwordInputs && passwordInputs.length > 0) {
        console.log('   Found password input field');
        await passwordInputs[0].type(TEST_PASSWORD);
        
        await page.screenshot({ 
          path: path.join(screenshotDir, '03-login-filled.png') 
        });
        
        // Submit form
        const submitBtn = await page.$('button[type="submit"]');
        
        if (submitBtn) {
          console.log('   Submitting login form...');
          await submitBtn.click();
          await new Promise(r => setTimeout(r, 5000));
          
          const afterLoginUrl = page.url();
          console.log(`   After login URL: ${afterLoginUrl}`);
          
          await page.screenshot({ 
            path: path.join(screenshotDir, '04-after-login.png'),
            fullPage: true 
          });
          
          if (afterLoginUrl.includes('dashboard') || afterLoginUrl.includes('chat')) {
            console.log('   ✅ Login successful!');
          } else {
            issues.push('Login may have failed - still on auth page');
          }
        }
      }
    } else {
      console.log('   ⚠️ Could not find login form');
      issues.push('Login form not found on auth page');
    }

    // Test 4: Dashboard/Main App UI
    console.log('\n📊 Testing Main Application UI...');
    
    // Try to navigate to dashboard
    if (!page.url().includes('dashboard')) {
      await page.goto(`${TEST_URL}/dashboard`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // Desktop View
    console.log('   Desktop View (1920x1080)');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.screenshot({ 
      path: path.join(screenshotDir, '05-dashboard-desktop.png'),
      fullPage: true 
    });
    
    // Tablet View
    console.log('   Tablet View (768x1024)');
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ 
      path: path.join(screenshotDir, '06-dashboard-tablet.png'),
      fullPage: true 
    });
    
    // Mobile View
    console.log('   Mobile View (375x812) - iPhone X');
    await page.setViewport({ width: 375, height: 812 });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ 
      path: path.join(screenshotDir, '07-dashboard-mobile.png'),
      fullPage: true 
    });

    // Test 5: Chat Interface
    console.log('\n💬 Testing Chat Interface...');
    await page.goto(`${TEST_URL}/chat`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    // Desktop Chat
    await page.setViewport({ width: 1920, height: 1080 });
    await page.screenshot({ 
      path: path.join(screenshotDir, '08-chat-desktop.png'),
      fullPage: true 
    });
    
    // Mobile Chat
    await page.setViewport({ width: 375, height: 812 });
    await page.screenshot({ 
      path: path.join(screenshotDir, '09-chat-mobile.png'),
      fullPage: true 
    });

    // Test Agent Interaction
    const chatInput = await page.$('textarea') || 
                     await page.$('input[type="text"]');
    
    if (chatInput) {
      console.log('   Found chat input, testing agent interaction...');
      await chatInput.type('Create a workflow that sends an email when a new form is submitted');
      
      const sendBtn = await page.$('button[type="submit"]') ||
                     await page.$('button[aria-label*="send"]');
      
      if (sendBtn) {
        await sendBtn.click();
        console.log('   Message sent, waiting for agent response...');
        await new Promise(r => setTimeout(r, 7000));
        
        await page.screenshot({ 
          path: path.join(screenshotDir, '10-chat-response.png'),
          fullPage: true 
        });
      }
    }

    // Test 6: Responsiveness Analysis
    console.log('\n📐 Analyzing Responsiveness...');
    
    // Check for horizontal scroll on mobile
    await page.setViewport({ width: 375, height: 812 });
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    
    if (hasHorizontalScroll) {
      issues.push('Horizontal scroll detected on mobile view');
      improvements.push('Fix horizontal overflow on mobile devices');
    }
    
    // Check for proper mobile navigation
    const mobileNav = await page.$('.mobile-nav') || 
                     await page.$('[class*="mobile"]') ||
                     await page.$('nav');
    
    if (!mobileNav) {
      improvements.push('Add mobile-specific navigation menu');
    }

    // Performance metrics
    let metrics = { domContentLoaded: 0, loadComplete: 0, totalTime: 0 };
    try {
      metrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          totalTime: perfData.loadEventEnd - perfData.fetchStart
        };
      });
    } catch (e) {
      console.log('   Could not collect performance metrics');
    }
    
    console.log('\n⚡ Performance Metrics:');
    console.log(`   DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`   Page Load Complete: ${metrics.loadComplete}ms`);
    console.log(`   Total Load Time: ${metrics.totalTime}ms`);
    
    if (metrics.totalTime > 3000) {
      improvements.push(`Optimize page load time (currently ${metrics.totalTime}ms)`);
    }

    // UI/UX Recommendations
    improvements.push('Ensure all interactive elements have proper hover states');
    improvements.push('Add loading states for agent responses');
    improvements.push('Implement proper error handling UI');
    improvements.push('Add accessibility features (ARIA labels, keyboard navigation)');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    issues.push(`Test error: ${error.message}`);
  } finally {
    await browser.close();
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    if (issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`);
      });
    } else {
      console.log('\n✅ No critical issues found!');
    }
    
    if (improvements.length > 0) {
      console.log('\n💡 Recommended Improvements:');
      improvements.forEach((imp, i) => {
        console.log(`${i + 1}. ${imp}`);
      });
    }
    
    console.log(`\n📁 Screenshots saved to: ${screenshotDir}`);
    
    // Save report
    const report = {
      timestamp,
      issues,
      improvements,
      metrics,
      screenshotDir
    };
    
    await fs.writeFile(
      path.join(screenshotDir, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );
  }
}

// Run the test
testAuthAndUI().catch(console.error);