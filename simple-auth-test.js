import { chromium } from 'playwright';
import fs from 'fs';

async function simpleAuthTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const consoleLogs = [];
  page.on('console', msg => {
    const log = `[${new Date().toISOString()}] [${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleLogs.push(log);
    console.log(log);
  });

  try {
    console.log('🚀 Simple Authentication Test Starting...\n');
    
    // Navigate to auth page
    await page.goto('http://localhost:8080/auth');
    await page.waitForTimeout(3000);
    
    // Take screenshot of auth page
    await page.screenshot({ path: '/root/repo/auth-page-initial.png', fullPage: true });
    console.log('📸 Initial auth page captured');

    // Get page content to understand the structure
    const pageContent = await page.content();
    console.log('📄 Page loaded successfully');

    // Find all buttons
    const buttons = await page.$$('button');
    console.log(`🔘 Found ${buttons.length} buttons on page`);
    
    for (let i = 0; i < buttons.length; i++) {
      const buttonText = await buttons[i].textContent();
      const buttonType = await buttons[i].getAttribute('type');
      console.log(`   Button ${i + 1}: "${buttonText}" (type: ${buttonType})`);
    }

    // Find all input fields
    const inputs = await page.$$('input');
    console.log(`📝 Found ${inputs.length} input fields on page`);
    
    for (let i = 0; i < inputs.length; i++) {
      const inputType = await inputs[i].getAttribute('type');
      const inputPlaceholder = await inputs[i].getAttribute('placeholder');
      console.log(`   Input ${i + 1}: type="${inputType}", placeholder="${inputPlaceholder}"`);
    }

    // Test 1: Try to fill email and password fields
    console.log('\n🔍 TEST 1: Fill form fields');
    
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    
    if (emailInput && passwordInput) {
      console.log('✅ Found email and password inputs');
      
      // Test weak password
      await emailInput.fill('weak.password.test@example.com');
      await passwordInput.fill('123');
      
      await page.screenshot({ path: '/root/repo/test-form-filled.png', fullPage: true });
      console.log('📸 Form filled with weak password');
      
      // Try to find submit button (looking for the actual button text)
      const submitButtons = await page.$$('button:has-text("Sign In"), button:has-text("Sign Up"), button:has-text("Create Account")');
      
      if (submitButtons.length > 0) {
        console.log(`🎯 Found ${submitButtons.length} submit button(s)`);
        
        const submitButton = submitButtons[0];
        const buttonText = await submitButton.textContent();
        console.log(`🔘 Clicking button: "${buttonText}"`);
        
        await submitButton.click();
        await page.waitForTimeout(4000);
        
        await page.screenshot({ path: '/root/repo/test-after-submit.png', fullPage: true });
        console.log('📸 After submit screenshot captured');
        
      } else {
        console.log('❌ No submit button found');
      }
      
    } else {
      console.log('❌ Could not find email and password inputs');
    }

    // Test 2: Test with duplicate email (existing account)
    console.log('\n🔍 TEST 2: Test duplicate account registration');
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Switch to signup mode first
    const signUpToggle = await page.$('button:has-text("Sign Up")');
    if (signUpToggle) {
      await signUpToggle.click();
      await page.waitForTimeout(1000);
      console.log('✅ Switched to sign up mode');
    }
    
    const emailInput2 = await page.$('input[type="email"]');
    const passwordInput2 = await page.$('input[type="password"]');
    
    if (emailInput2 && passwordInput2) {
      await emailInput2.fill('jayveedz19@gmail.com'); // Known existing account
      await passwordInput2.fill('NewPassword123!');
      
      await page.screenshot({ path: '/root/repo/test-duplicate-email-filled.png', fullPage: true });
      console.log('📸 Duplicate email form filled');
      
      const submitButton2 = await page.$('button:has-text("Create Account"), button:has-text("Sign Up")');
      if (submitButton2) {
        const buttonText = await submitButton2.textContent();
        console.log(`🔘 Clicking: "${buttonText}"`);
        
        await submitButton2.click();
        await page.waitForTimeout(5000);
        
        await page.screenshot({ path: '/root/repo/test-duplicate-result.png', fullPage: true });
        console.log('📸 Duplicate account test result captured');
      }
    }

    // Test 3: Valid login
    console.log('\n🔍 TEST 3: Valid login test');
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Make sure we're in sign in mode
    const signInToggle = await page.$('button:has-text("Sign In")');
    if (signInToggle) {
      await signInToggle.click();
      await page.waitForTimeout(1000);
      console.log('✅ Switched to sign in mode');
    }
    
    const emailInput3 = await page.$('input[type="email"]');
    const passwordInput3 = await page.$('input[type="password"]');
    
    if (emailInput3 && passwordInput3) {
      await emailInput3.fill('jayveedz19@gmail.com');
      await passwordInput3.fill('Goldyear2023#');
      
      await page.screenshot({ path: '/root/repo/test-valid-login-filled.png', fullPage: true });
      console.log('📸 Valid login form filled');
      
      const submitButton3 = await page.$('button:has-text("Sign In")');
      if (submitButton3) {
        await submitButton3.click();
        await page.waitForTimeout(5000);
        
        // Check if we got redirected to dashboard
        const currentUrl = page.url();
        console.log(`🌐 Current URL after login: ${currentUrl}`);
        
        await page.screenshot({ path: '/root/repo/test-valid-login-result.png', fullPage: true });
        console.log('📸 Valid login result captured');
      }
    }

    // Save console logs
    fs.writeFileSync('/root/repo/simple-auth-test-logs.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      totalLogs: consoleLogs.length,
      logs: consoleLogs
    }, null, 2));

    console.log('\n✅ Simple authentication test completed!');
    console.log(`📄 Console logs: ${consoleLogs.length} entries saved`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

simpleAuthTest().catch(console.error);