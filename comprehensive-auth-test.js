import { chromium } from 'playwright';
import fs from 'fs';

async function comprehensiveAuthTest() {
  const browser = await chromium.launch({ headless: true });
  
  const testResults = [];
  const consoleLogs = [];
  const networkLogs = [];

  try {
    console.log('🔍 COMPREHENSIVE AUTHENTICATION SYSTEM TESTING\n');
    console.log('=====================================================');
    
    // TEST 1: Weak Password Validation
    console.log('\n🔍 TEST 1: Weak Password Validation');
    console.log('------------------------------------');
    
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    page1.on('console', msg => {
      const log = `[T1-${msg.type().toUpperCase()}] ${msg.text()}`;
      consoleLogs.push(log);
    });
    
    await page1.goto('http://localhost:8080/auth');
    await page1.waitForTimeout(3000);
    
    // Switch to sign up mode for password validation
    const signUpButton = await page1.$('button:has-text("Sign Up")');
    if (signUpButton) {
      await signUpButton.click();
      await page1.waitForTimeout(1000);
    }
    
    // Fill weak password
    await page1.fill('input[type="email"]', 'weak.password.test@example.com');
    await page1.fill('input[type="password"]', '123');
    
    await page1.screenshot({ path: '/root/repo/test1-weak-password-filled.png', fullPage: true });
    
    // Submit and check for errors
    const submitButton1 = await page1.$('button[type="submit"], button:has-text("Sign Up"), button:has-text("Create Account")');
    if (submitButton1) {
      await submitButton1.click();
      await page1.waitForTimeout(3000);
    }
    
    await page1.screenshot({ path: '/root/repo/test1-weak-password-result.png', fullPage: true });
    
    // Check for error indicators
    const errorElements1 = await page1.$$('.text-red-500, .text-red-400, .error, [role="alert"], .toast');
    const hasToastError = await page1.$('.Toastify__toast--error') !== null;
    
    testResults.push({
      test: 'Weak Password Validation (123)',
      input: { email: 'weak.password.test@example.com', password: '123' },
      result: errorElements1.length > 0 || hasToastError ? 'PASS' : 'FAIL',
      details: `Found ${errorElements1.length} error elements, Toast error: ${hasToastError}`
    });
    
    console.log(`   Result: ${errorElements1.length > 0 || hasToastError ? '✅ PASS' : '❌ FAIL'} - Error handling detected`);
    
    await context1.close();

    // TEST 2: Invalid Email Format Validation
    console.log('\n🔍 TEST 2: Invalid Email Format Validation');
    console.log('------------------------------------------');
    
    const invalidEmails = ['notanemail', 'test@', '@example.com', 'test..test@example.com'];
    
    for (const email of invalidEmails) {
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      
      page2.on('console', msg => {
        consoleLogs.push(`[T2-${email}-${msg.type().toUpperCase()}] ${msg.text()}`);
      });
      
      await page2.goto('http://localhost:8080/auth');
      await page2.waitForTimeout(2000);
      
      // Fill invalid email
      await page2.fill('input[type="email"]', email);
      await page2.fill('input[type="password"]', 'ValidPassword123!');
      
      // Check browser validation
      const emailValid = await page2.evaluate(() => {
        const emailInput = document.querySelector('input[type="email"]');
        return emailInput ? emailInput.validity.valid : false;
      });
      
      // Try to submit
      const submitButton2 = await page2.$('button[type="submit"], button:has-text("Sign In")');
      if (submitButton2) {
        await submitButton2.click();
        await page2.waitForTimeout(2000);
      }
      
      await page2.screenshot({ path: `/root/repo/test2-invalid-email-${email.replace(/[^a-zA-Z0-9]/g, '_')}.png`, fullPage: true });
      
      testResults.push({
        test: `Invalid Email Format: ${email}`,
        input: { email, password: 'ValidPassword123!' },
        result: !emailValid ? 'PASS' : 'FAIL',
        details: `Browser validation rejected: ${!emailValid}`
      });
      
      console.log(`   ${email}: ${!emailValid ? '✅ PASS' : '❌ FAIL'} - Browser validation`);
      
      await context2.close();
    }

    // TEST 3: Duplicate Account Registration
    console.log('\n🔍 TEST 3: Duplicate Account Registration');
    console.log('----------------------------------------');
    
    const context3 = await browser.newContext();
    const page3 = await context3.newPage();
    
    page3.on('console', msg => {
      consoleLogs.push(`[T3-${msg.type().toUpperCase()}] ${msg.text()}`);
    });
    
    await page3.goto('http://localhost:8080/auth');
    await page3.waitForTimeout(2000);
    
    // Switch to sign up mode
    const signUpButton3 = await page3.$('button:has-text("Sign Up")');
    if (signUpButton3) {
      await signUpButton3.click();
      await page3.waitForTimeout(1000);
    }
    
    // Try to register with existing email
    await page3.fill('input[type="email"]', 'jayveedz19@gmail.com'); // Known existing account
    await page3.fill('input[type="password"]', 'NewPassword123!');
    
    await page3.screenshot({ path: '/root/repo/test3-duplicate-email-filled.png', fullPage: true });
    
    const submitButton3 = await page3.$('button[type="submit"], button:has-text("Sign Up"), button:has-text("Create Account")');
    if (submitButton3) {
      await submitButton3.click();
      await page3.waitForTimeout(4000); // Wait longer for server response
    }
    
    await page3.screenshot({ path: '/root/repo/test3-duplicate-email-result.png', fullPage: true });
    
    // Check for duplicate account error
    const errorElements3 = await page3.$$('.text-red-500, .text-red-400, .error, [role="alert"], .toast');
    const hasToastError3 = await page3.$('.Toastify__toast--error') !== null;
    
    testResults.push({
      test: 'Duplicate Account Registration',
      input: { email: 'jayveedz19@gmail.com', password: 'NewPassword123!' },
      result: errorElements3.length > 0 || hasToastError3 ? 'PASS' : 'FAIL',
      details: `Error elements: ${errorElements3.length}, Toast error: ${hasToastError3}`
    });
    
    console.log(`   Result: ${errorElements3.length > 0 || hasToastError3 ? '✅ PASS' : '❌ FAIL'} - Duplicate detection handled`);
    
    await context3.close();

    // TEST 4: Empty Fields Validation
    console.log('\n🔍 TEST 4: Empty Fields Validation');
    console.log('----------------------------------');
    
    const context4 = await browser.newContext();
    const page4 = await context4.newPage();
    
    await page4.goto('http://localhost:8080/auth');
    await page4.waitForTimeout(2000);
    
    // Try to submit with empty fields
    const submitButton4 = await page4.$('button[type="submit"], button:has-text("Sign In")');
    if (submitButton4) {
      await submitButton4.click();
      await page4.waitForTimeout(1000);
    }
    
    await page4.screenshot({ path: '/root/repo/test4-empty-fields.png', fullPage: true });
    
    // Check HTML5 validation
    const emailRequired = await page4.evaluate(() => {
      const emailInput = document.querySelector('input[type="email"]');
      return emailInput ? !emailInput.validity.valid : false;
    });
    
    const passwordRequired = await page4.evaluate(() => {
      const passwordInput = document.querySelector('input[type="password"]');
      return passwordInput ? !passwordInput.validity.valid : false;
    });
    
    testResults.push({
      test: 'Empty Fields Validation',
      input: { email: '', password: '' },
      result: (emailRequired || passwordRequired) ? 'PASS' : 'FAIL',
      details: `Email invalid: ${emailRequired}, Password invalid: ${passwordRequired}`
    });
    
    console.log(`   Result: ${(emailRequired || passwordRequired) ? '✅ PASS' : '❌ FAIL'} - HTML5 validation working`);
    
    await context4.close();

    // TEST 5: Valid Login Attempt
    console.log('\n🔍 TEST 5: Valid Login Attempt');
    console.log('------------------------------');
    
    const context5 = await browser.newContext();
    const page5 = await context5.newPage();
    
    page5.on('console', msg => {
      consoleLogs.push(`[T5-${msg.type().toUpperCase()}] ${msg.text()}`);
    });
    
    await page5.goto('http://localhost:8080/auth');
    await page5.waitForTimeout(2000);
    
    // Valid login test
    await page5.fill('input[type="email"]', 'jayveedz19@gmail.com');
    await page5.fill('input[type="password"]', 'Goldyear2023#');
    
    await page5.screenshot({ path: '/root/repo/test5-valid-login-filled.png', fullPage: true });
    
    const submitButton5 = await page5.$('button[type="submit"], button:has-text("Sign In")');
    if (submitButton5) {
      await submitButton5.click();
      await page5.waitForTimeout(4000);
    }
    
    // Check if redirected to dashboard
    const currentUrl = page5.url();
    const redirectedToDashboard = currentUrl.includes('/dashboard') || currentUrl.includes('/chat');
    
    await page5.screenshot({ path: '/root/repo/test5-valid-login-result.png', fullPage: true });
    
    testResults.push({
      test: 'Valid Login Attempt',
      input: { email: 'jayveedz19@gmail.com', password: 'Goldyear2023#' },
      result: redirectedToDashboard ? 'PASS' : 'FAIL',
      details: `Final URL: ${currentUrl}, Redirected: ${redirectedToDashboard}`
    });
    
    console.log(`   Result: ${redirectedToDashboard ? '✅ PASS' : '❌ FAIL'} - Login ${redirectedToDashboard ? 'successful' : 'failed'}`);
    console.log(`   Final URL: ${currentUrl}`);
    
    await context5.close();

    // Generate comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      testSuite: 'Comprehensive Authentication System Testing',
      summary: {
        totalTests: testResults.length,
        passed: testResults.filter(r => r.result === 'PASS').length,
        failed: testResults.filter(r => r.result === 'FAIL').length,
        passRate: `${Math.round((testResults.filter(r => r.result === 'PASS').length / testResults.length) * 100)}%`
      },
      testResults,
      consoleLogs,
      recommendations: []
    };

    // Add recommendations based on results
    const failedTests = testResults.filter(r => r.result === 'FAIL');
    if (failedTests.length > 0) {
      report.recommendations.push('Some authentication edge cases need improvement:');
      failedTests.forEach(test => {
        report.recommendations.push(`- ${test.test}: ${test.details}`);
      });
    } else {
      report.recommendations.push('All authentication edge cases are properly handled!');
    }

    fs.writeFileSync('/root/repo/comprehensive-auth-test-report.json', JSON.stringify(report, null, 2));

    console.log('\n📊 COMPREHENSIVE TEST RESULTS');
    console.log('=============================');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`📈 Pass Rate: ${report.summary.passRate}`);
    console.log(`📄 Detailed report: comprehensive-auth-test-report.json`);
    console.log(`📸 Screenshots: test1-*, test2-*, test3-*, test4-*, test5-*`);

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    await browser.close();
  }
}

comprehensiveAuthTest().catch(console.error);