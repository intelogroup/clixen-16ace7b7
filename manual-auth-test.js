import { chromium } from 'playwright';
import fs from 'fs';

async function manualAuthTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const log = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleLogs.push(log);
    console.log(log);
  });

  const testResults = [];

  try {
    console.log('🔧 Testing Enhanced Authentication System...\n');
    
    // Navigate to the app
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await page.screenshot({ path: '/root/repo/auth-test-initial.png', fullPage: true });
    console.log('📸 Initial state captured');

    // Navigate to auth page
    await page.goto('http://localhost:8080/auth');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '/root/repo/auth-test-auth-page.png', fullPage: true });
    console.log('📸 Auth page captured');

    // Test 1: Empty Form Submission
    console.log('\n🔍 TEST 1: Empty Form Submission');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '/root/repo/test-empty-form.png', fullPage: true });
    testResults.push({
      test: 'Empty Form Submission',
      status: 'Captured',
      logs: consoleLogs.slice(-5)
    });

    // Test 2: Weak Password
    console.log('\n🔍 TEST 2: Weak Password Test');
    
    // Switch to sign up mode
    const signUpButton = await page.$('text=Sign Up');
    if (signUpButton) {
      await signUpButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Fill in form with weak password
    await page.fill('input[type="email"]', 'weak.password.test@example.com');
    await page.fill('input[type="password"]', '123');
    
    // Take screenshot before submission
    await page.screenshot({ path: '/root/repo/test-weak-password-before.png', fullPage: true });
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: '/root/repo/test-weak-password-after.png', fullPage: true });
    testResults.push({
      test: 'Weak Password (123)',
      status: 'Captured', 
      logs: consoleLogs.slice(-10)
    });

    // Test 3: Invalid Email Formats
    console.log('\n🔍 TEST 3: Invalid Email Formats');
    
    const invalidEmails = ['notanemail', 'test@', '@example.com'];
    
    for (const email of invalidEmails) {
      console.log(`   Testing email: ${email}`);
      
      // Clear and fill email
      await page.fill('input[type="email"]', '');
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', 'ValidPassword123!');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: `/root/repo/test-invalid-email-${email.replace(/[^a-zA-Z0-9]/g, '_')}.png`, fullPage: true });
    }
    
    testResults.push({
      test: 'Invalid Email Formats',
      status: 'Captured',
      logs: consoleLogs.slice(-20)
    });

    // Test 4: Duplicate Account Registration
    console.log('\n🔍 TEST 4: Duplicate Account Registration');
    
    await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
    await page.fill('input[type="password"]', 'NewPassword123!');
    
    await page.screenshot({ path: '/root/repo/test-duplicate-before.png', fullPage: true });
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);
    
    await page.screenshot({ path: '/root/repo/test-duplicate-after.png', fullPage: true });
    testResults.push({
      test: 'Duplicate Account Registration',
      status: 'Captured',
      logs: consoleLogs.slice(-10)
    });

    // Test 5: Valid Login Test
    console.log('\n🔍 TEST 5: Valid Login Test');
    
    // Switch to sign in mode
    const signInButton = await page.$('text=Sign In');
    if (signInButton) {
      await signInButton.click();
      await page.waitForTimeout(1000);
    }
    
    await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
    await page.fill('input[type="password"]', 'Goldyear2023#');
    
    await page.screenshot({ path: '/root/repo/test-valid-login-before.png', fullPage: true });
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);
    
    await page.screenshot({ path: '/root/repo/test-valid-login-after.png', fullPage: true });
    testResults.push({
      test: 'Valid Login',
      status: 'Captured',
      logs: consoleLogs.slice(-10)
    });

    // Save all console logs
    fs.writeFileSync('/root/repo/auth-test-console-logs.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      totalLogs: consoleLogs.length,
      logs: consoleLogs,
      testResults
    }, null, 2));

    console.log('\n✅ Manual authentication testing completed!');
    console.log(`📄 Console logs saved to: auth-test-console-logs.json`);
    console.log(`📸 Screenshots saved with prefix: auth-test-*, test-*`);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    await browser.close();
  }
}

// Create screenshots directory if it doesn't exist
if (!fs.existsSync('/root/repo')) {
  fs.mkdirSync('/root/repo', { recursive: true });
}

manualAuthTest().catch(console.error);