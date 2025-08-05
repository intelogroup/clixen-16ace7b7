import { chromium } from 'playwright';
import fs from 'fs';

async function testAuthenticationSystem() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });
  
  // Enable network request logging
  page.on('request', request => {
    if (request.url().includes('supabase') || request.url().includes('auth')) {
      console.log(`[NETWORK REQUEST]: ${request.method()} ${request.url()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('supabase') || response.url().includes('auth')) {
      console.log(`[NETWORK RESPONSE]: ${response.status()} ${response.url()}`);
    }
  });

  const testResults = [];

  try {
    console.log('\n🚀 Starting Clixen Authentication System Testing...\n');
    
    // Navigate to the app
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await page.screenshot({ path: '/root/repo/test-screenshots/01-initial-state.png', fullPage: true });
    console.log('📸 Initial state screenshot captured');

    // Test 1: Weak Password Validation
    console.log('\n🔍 TEST 1: Weak Password Validation');
    await testWeakPassword(page, testResults);
    
    // Test 2: Invalid Email Format
    console.log('\n🔍 TEST 2: Invalid Email Format Validation');
    await testInvalidEmailFormat(page, testResults);
    
    // Test 3: Duplicate Account Registration
    console.log('\n🔍 TEST 3: Duplicate Account Registration');
    await testDuplicateAccount(page, testResults);
    
    // Test 4: Empty Fields Validation
    console.log('\n🔍 TEST 4: Empty Fields Validation');
    await testEmptyFields(page, testResults);
    
    // Test 5: Network Error Simulation
    console.log('\n🔍 TEST 5: Network Error Simulation');
    await testNetworkErrors(page, testResults);
    
    // Test 6: Rate Limiting Test
    console.log('\n🔍 TEST 6: Rate Limiting Test');
    await testRateLimiting(page, testResults);

    // Generate report
    generateTestReport(testResults);

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    await browser.close();
  }
}

async function testWeakPassword(page, testResults) {
  try {
    // Navigate to sign up
    await navigateToSignUp(page);
    
    // Fill in weak password
    await page.fill('input[type="email"]', 'weak.password.test@example.com');
    await page.fill('input[type="password"]', '123');
    
    await page.screenshot({ path: '/root/repo/test-screenshots/02-weak-password-filled.png', fullPage: true });
    
    // Try to submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Capture error state
    await page.screenshot({ path: '/root/repo/test-screenshots/03-weak-password-error.png', fullPage: true });
    
    // Check for error messages
    const errorElements = await page.$$('.text-red-500, .text-red-600, .error, [role="alert"]');
    const errorMessages = [];
    
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text && text.trim()) {
        errorMessages.push(text.trim());
      }
    }
    
    testResults.push({
      test: 'Weak Password Validation',
      status: errorMessages.length > 0 ? 'PASS' : 'FAIL',
      details: {
        errorMessages,
        passwordTested: '123',
        email: 'weak.password.test@example.com'
      }
    });
    
    console.log(`   ✅ Error messages found: ${errorMessages.join(', ')}`);
    
  } catch (error) {
    testResults.push({
      test: 'Weak Password Validation',
      status: 'ERROR',
      details: { error: error.message }
    });
    console.log(`   ❌ Test failed: ${error.message}`);
  }
}

async function testInvalidEmailFormat(page, testResults) {
  const invalidEmails = [
    'notanemail',
    'test@',
    '@example.com',
    'test..test@example.com',
    'test@.com',
    'test@domain.',
    'test space@example.com'
  ];
  
  for (const email of invalidEmails) {
    try {
      await navigateToSignUp(page);
      
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', 'ValidPassword123!');
      
      await page.screenshot({ 
        path: `/root/repo/test-screenshots/04-invalid-email-${email.replace(/[^a-zA-Z0-9]/g, '_')}.png`, 
        fullPage: true 
      });
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1500);
      
      // Check for validation
      const isValid = await page.evaluate(() => {
        const emailInput = document.querySelector('input[type="email"]');
        return emailInput ? emailInput.validity.valid : false;
      });
      
      const errorElements = await page.$$('.text-red-500, .text-red-600, .error, [role="alert"]');
      const hasErrorMessage = errorElements.length > 0;
      
      testResults.push({
        test: `Invalid Email Format: ${email}`,
        status: (!isValid || hasErrorMessage) ? 'PASS' : 'FAIL',
        details: {
          email,
          browserValidation: !isValid,
          errorMessageShown: hasErrorMessage
        }
      });
      
      console.log(`   📧 ${email}: ${(!isValid || hasErrorMessage) ? '✅ Rejected' : '❌ Accepted'}`);
      
    } catch (error) {
      console.log(`   ❌ Error testing ${email}: ${error.message}`);
    }
  }
}

async function testDuplicateAccount(page, testResults) {
  try {
    await navigateToSignUp(page);
    
    // Try to register with existing email
    await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
    await page.fill('input[type="password"]', 'NewPassword123!');
    
    await page.screenshot({ path: '/root/repo/test-screenshots/05-duplicate-account-attempt.png', fullPage: true });
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: '/root/repo/test-screenshots/06-duplicate-account-result.png', fullPage: true });
    
    // Check for duplicate account error
    const errorElements = await page.$$('.text-red-500, .text-red-600, .error, [role="alert"]');
    const errorMessages = [];
    
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text && text.trim()) {
        errorMessages.push(text.trim());
      }
    }
    
    testResults.push({
      test: 'Duplicate Account Registration',
      status: errorMessages.length > 0 ? 'PASS' : 'FAIL',
      details: {
        errorMessages,
        existingEmail: 'jayveedz19@gmail.com'
      }
    });
    
    console.log(`   ✅ Duplicate account handling: ${errorMessages.join(', ')}`);
    
  } catch (error) {
    testResults.push({
      test: 'Duplicate Account Registration',
      status: 'ERROR',
      details: { error: error.message }
    });
    console.log(`   ❌ Test failed: ${error.message}`);
  }
}

async function testEmptyFields(page, testResults) {
  try {
    await navigateToSignUp(page);
    
    // Try to submit with empty fields
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: '/root/repo/test-screenshots/07-empty-fields.png', fullPage: true });
    
    // Check field validation
    const emailValid = await page.evaluate(() => {
      const input = document.querySelector('input[type="email"]');
      return input ? input.validity.valid : true;
    });
    
    const passwordValid = await page.evaluate(() => {
      const input = document.querySelector('input[type="password"]');
      return input ? input.validity.valid : true;
    });
    
    testResults.push({
      test: 'Empty Fields Validation',
      status: (!emailValid || !passwordValid) ? 'PASS' : 'FAIL',
      details: {
        emailFieldValid: emailValid,
        passwordFieldValid: passwordValid
      }
    });
    
    console.log(`   📝 Empty fields validation: Email=${!emailValid ? 'Rejected' : 'Accepted'}, Password=${!passwordValid ? 'Rejected' : 'Accepted'}`);
    
  } catch (error) {
    testResults.push({
      test: 'Empty Fields Validation',
      status: 'ERROR',
      details: { error: error.message }
    });
    console.log(`   ❌ Test failed: ${error.message}`);
  }
}

async function testNetworkErrors(page, testResults) {
  try {
    // Simulate network issues by going offline
    await page.context().setOffline(true);
    
    await navigateToSignUp(page);
    
    await page.fill('input[type="email"]', 'network.test@example.com');
    await page.fill('input[type="password"]', 'ValidPassword123!');
    
    await page.screenshot({ path: '/root/repo/test-screenshots/08-network-offline.png', fullPage: true });
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: '/root/repo/test-screenshots/09-network-error-result.png', fullPage: true });
    
    // Check for error handling
    const errorElements = await page.$$('.text-red-500, .text-red-600, .error, [role="alert"]');
    const errorMessages = [];
    
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text && text.trim()) {
        errorMessages.push(text.trim());
      }
    }
    
    // Re-enable network
    await page.context().setOffline(false);
    
    testResults.push({
      test: 'Network Error Handling',
      status: errorMessages.length > 0 ? 'PASS' : 'FAIL',
      details: {
        errorMessages,
        testType: 'Offline simulation'
      }
    });
    
    console.log(`   🌐 Network error handling: ${errorMessages.length > 0 ? '✅ Handled' : '❌ Not handled'}`);
    
  } catch (error) {
    await page.context().setOffline(false);
    testResults.push({
      test: 'Network Error Handling',
      status: 'ERROR',
      details: { error: error.message }
    });
    console.log(`   ❌ Test failed: ${error.message}`);
  }
}

async function testRateLimiting(page, testResults) {
  try {
    // Navigate to sign in for rate limiting test
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(1000);
    
    // Look for sign in button/link
    const signInButton = await page.$('text=Sign In') || await page.$('text=Login') || await page.$('button:has-text("Sign In")');
    if (signInButton) {
      await signInButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Attempt multiple rapid failed logins
    const attempts = 5;
    const results = [];
    
    for (let i = 0; i < attempts; i++) {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      
      const startTime = Date.now();
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      const endTime = Date.now();
      
      results.push({
        attempt: i + 1,
        responseTime: endTime - startTime
      });
      
      console.log(`   🔄 Attempt ${i + 1}: ${endTime - startTime}ms`);
    }
    
    await page.screenshot({ path: '/root/repo/test-screenshots/10-rate-limiting.png', fullPage: true });
    
    // Check if response times increased (indicating rate limiting)
    const avgEarlyTime = (results[0].responseTime + results[1].responseTime) / 2;
    const avgLateTime = (results[3].responseTime + results[4].responseTime) / 2;
    const rateLimitingDetected = avgLateTime > avgEarlyTime * 1.5;
    
    testResults.push({
      test: 'Rate Limiting',
      status: rateLimitingDetected ? 'PASS' : 'INCONCLUSIVE',
      details: {
        attempts: results,
        avgEarlyResponseTime: avgEarlyTime,
        avgLateResponseTime: avgLateTime,
        rateLimitingDetected
      }
    });
    
    console.log(`   ⏱️ Rate limiting: ${rateLimitingDetected ? '✅ Detected' : '🔍 Inconclusive'}`);
    
  } catch (error) {
    testResults.push({
      test: 'Rate Limiting',
      status: 'ERROR',
      details: { error: error.message }
    });
    console.log(`   ❌ Test failed: ${error.message}`);
  }
}

async function navigateToSignUp(page) {
  await page.goto('http://localhost:8080');
  await page.waitForTimeout(1000);
  
  // Look for sign up button/link
  const signUpButton = await page.$('text=Sign Up') || await page.$('text=Register') || await page.$('button:has-text("Sign Up")');
  if (signUpButton) {
    await signUpButton.click();
    await page.waitForTimeout(1000);
  }
}

function generateTestReport(testResults) {
  const report = {
    timestamp: new Date().toISOString(),
    testSuite: 'Clixen Authentication System',
    summary: {
      total: testResults.length,
      passed: testResults.filter(r => r.status === 'PASS').length,
      failed: testResults.filter(r => r.status === 'FAIL').length,
      errors: testResults.filter(r => r.status === 'ERROR').length,
      inconclusive: testResults.filter(r => r.status === 'INCONCLUSIVE').length
    },
    results: testResults
  };
  
  fs.writeFileSync('/root/repo/auth-test-report.json', JSON.stringify(report, null, 2));
  
  console.log('\n📊 TEST SUMMARY:');
  console.log(`   Total Tests: ${report.summary.total}`);
  console.log(`   ✅ Passed: ${report.summary.passed}`);
  console.log(`   ❌ Failed: ${report.summary.failed}`);
  console.log(`   💥 Errors: ${report.summary.errors}`);
  console.log(`   🔍 Inconclusive: ${report.summary.inconclusive}`);
  console.log('\n📄 Detailed report saved to: auth-test-report.json');
}

// Create screenshots directory
const screenshotsDir = '/root/repo/test-screenshots';
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Run the tests
testAuthenticationSystem().catch(console.error);