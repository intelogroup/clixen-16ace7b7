import { chromium } from 'playwright';
import fs from 'fs';

async function detailedAuthTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const consoleLogs = [];
  const errors = [];
  
  // Capture all console logs
  page.on('console', msg => {
    const log = `[${new Date().toISOString()}] [${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleLogs.push(log);
    console.log(log);
  });

  // Capture page errors
  page.on('pageerror', error => {
    const errorLog = `[PAGE ERROR] ${error.message}`;
    errors.push(errorLog);
    console.error(errorLog);
  });

  try {
    console.log('🔍 Detailed Authentication System Analysis\n');
    
    // Navigate to auth page with longer wait
    console.log('1. Loading auth page...');
    await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000); // Give React time to render
    
    await page.screenshot({ path: '/root/repo/detailed-auth-initial.png', fullPage: true });
    console.log('📸 Initial auth page captured');

    // Wait for React to mount and check for elements
    console.log('2. Waiting for React components to render...');
    
    // Try multiple selectors to find the form
    const possibleSelectors = [
      'form',
      'input[type="email"]', 
      'input[placeholder*="email" i]',
      'input[placeholder*="Email" i]',
      'button:has-text("Sign In")',
      'button:has-text("Sign Up")',
      'button:has-text("Create Account")',
      '.auth-form',
      '[data-testid="auth-form"]'
    ];

    let foundElements = {};
    for (const selector of possibleSelectors) {
      try {
        const element = await page.$(selector);
        foundElements[selector] = !!element;
        if (element) {
          console.log(`✅ Found element: ${selector}`);
        }
      } catch (e) {
        foundElements[selector] = false;
      }
    }

    // Get page HTML to analyze structure
    console.log('3. Analyzing page structure...');
    const pageHTML = await page.content();
    const bodyText = await page.$eval('body', el => el.textContent || '');
    
    console.log(`   Page HTML length: ${pageHTML.length} characters`);
    console.log(`   Body text length: ${bodyText.length} characters`);
    console.log(`   Body text preview: "${bodyText.substring(0, 200)}..."`);

    // Check if React root div has content
    const rootContent = await page.$eval('#root', el => el.innerHTML || '').catch(() => 'NOT FOUND');
    console.log(`   React root content length: ${rootContent.length} characters`);

    // Wait longer and check again
    console.log('4. Waiting additional 10 seconds for full render...');
    await page.waitForTimeout(10000);
    
    await page.screenshot({ path: '/root/repo/detailed-auth-after-wait.png', fullPage: true });
    console.log('📸 After extended wait screenshot captured');

    // Try to find any interactive elements
    const allButtons = await page.$$('button');
    const allInputs = await page.$$('input');
    const allForms = await page.$$('form');
    
    console.log(`   Found elements after wait: ${allButtons.length} buttons, ${allInputs.length} inputs, ${allForms.length} forms`);

    // If we find elements, try to interact
    if (allInputs.length > 0 && allButtons.length > 0) {
      console.log('5. Found interactive elements - testing form interaction...');
      
      // Try to fill first email input
      const emailInput = allInputs.find(async input => {
        const type = await input.getAttribute('type');
        return type === 'email';
      });
      
      if (emailInput) {
        console.log('   Testing email input...');
        await emailInput.fill('test@example.com');
        
        // Find password input
        const passwordInput = allInputs.find(async input => {
          const type = await input.getAttribute('type');
          return type === 'password';
        });
        
        if (passwordInput) {
          console.log('   Testing password input...');
          await passwordInput.fill('123'); // Weak password test
          
          await page.screenshot({ path: '/root/repo/detailed-auth-form-filled.png', fullPage: true });
          console.log('📸 Form filled screenshot captured');
          
          // Try to submit
          if (allButtons.length > 0) {
            console.log('   Attempting form submission...');
            await allButtons[0].click();
            await page.waitForTimeout(3000);
            
            await page.screenshot({ path: '/root/repo/detailed-auth-after-submit.png', fullPage: true });
            console.log('📸 After submit screenshot captured');
          }
        }
      }
    } else {
      console.log('5. No interactive elements found - React may not be rendering properly');
    }

    // Generate comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      testResults: {
        pageLoaded: pageHTML.length > 0,
        reactMounted: rootContent !== 'NOT FOUND' && rootContent.length > 0,
        elementsFound: foundElements,
        interactiveElements: {
          buttons: allButtons.length,
          inputs: allInputs.length, 
          forms: allForms.length
        },
        errors: errors,
        totalConsoleLogs: consoleLogs.length
      },
      pageStructure: {
        htmlLength: pageHTML.length,
        bodyTextLength: bodyText.length,
        rootContentLength: rootContent.length,
        bodyTextPreview: bodyText.substring(0, 500)
      },
      consoleLogs: consoleLogs
    };

    fs.writeFileSync('/root/repo/detailed-auth-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n✅ Detailed authentication analysis completed!');
    console.log(`📄 Full report saved to: detailed-auth-test-report.json`);
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   React App Loading: ${report.testResults.pageLoaded ? '✅' : '❌'}`);
    console.log(`   React Components Rendered: ${report.testResults.reactMounted ? '✅' : '❌'}`);
    console.log(`   Form Elements Found: ${report.testResults.interactiveElements.inputs > 0 ? '✅' : '❌'}`);
    console.log(`   JavaScript Errors: ${report.testResults.errors.length > 0 ? '❌' : '✅'}`);
    console.log(`   Console Logs: ${report.testResults.totalConsoleLogs} entries`);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    await browser.close();
  }
}

detailedAuthTest().catch(console.error);