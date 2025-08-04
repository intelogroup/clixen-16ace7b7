const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'searchmatic-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

async function testSearchmatic() {
  console.log('Starting Searchmatic UI/UX Test...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // Enable request/response logging
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`❌ Failed request: ${response.url()} - ${response.status()}`);
    }
  });

  try {
    console.log('1. Loading homepage...');
    const startTime = Date.now();
    await page.goto('https://searchmatic.netlify.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    const loadTime = Date.now() - startTime;
    console.log(`   Homepage loaded in ${loadTime}ms`);
    
    // Take homepage screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-homepage-desktop.png'),
      fullPage: true 
    });
    console.log('   ✅ Homepage screenshot saved');

    // Check for common UI elements
    const title = await page.title();
    console.log(`   Page title: "${title}"`);
    
    // Look for authentication elements
    const hasLoginButton = await page.locator('button:has-text("Login"), button:has-text("Sign In"), a:has-text("Login"), a:has-text("Sign In")').count() > 0;
    const hasSignUpButton = await page.locator('button:has-text("Sign Up"), button:has-text("Register"), a:has-text("Sign Up"), a:has-text("Register")').count() > 0;
    
    console.log(`   Login button found: ${hasLoginButton}`);
    console.log(`   Sign up button found: ${hasSignUpButton}`);

    // Test different viewport sizes for responsiveness
    console.log('\n2. Testing responsiveness...');
    
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop Large', width: 1440, height: 900 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000); // Allow for responsive transitions
      
      await page.screenshot({ 
        path: path.join(screenshotsDir, `02-homepage-${viewport.name.toLowerCase().replace(' ', '-')}.png`),
        fullPage: false // Just viewport to show responsive layout
      });
      console.log(`   ✅ ${viewport.name} (${viewport.width}x${viewport.height}) screenshot saved`);
    }
    
    // Reset to desktop view for login test
    await page.setViewportSize({ width: 1920, height: 1080 });

    console.log('\n3. Testing login functionality...');
    
    // Look for login/auth elements more broadly
    const authSelectors = [
      'button:has-text("Login")',
      'button:has-text("Sign In")', 
      'a:has-text("Login")',
      'a:has-text("Sign In")',
      'input[type="email"]',
      'input[placeholder*="email"]',
      'input[placeholder*="Email"]',
      '[data-testid*="login"]',
      '[data-testid*="auth"]',
      '.login',
      '.auth',
      '#login'
    ];

    let loginElement = null;
    for (const selector of authSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        loginElement = element;
        console.log(`   Found auth element: ${selector}`);
        break;
      }
    }

    if (loginElement) {
      try {
        await loginElement.click();
        await page.waitForTimeout(2000);
        
        // Take screenshot of login form
        await page.screenshot({ 
          path: path.join(screenshotsDir, '03-login-form.png'),
          fullPage: true 
        });
        console.log('   ✅ Login form screenshot saved');

        // Try to find email and password fields
        const emailField = page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="Email"]').first();
        const passwordField = page.locator('input[type="password"], input[placeholder*="password"], input[placeholder*="Password"]').first();
        
        if (await emailField.count() > 0 && await passwordField.count() > 0) {
          console.log('   Found email and password fields, attempting login...');
          
          await emailField.fill('jimkalinov@gmail.com');
          await passwordField.fill('Jimkali90#');
          
          // Look for submit button
          const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
          
          if (await submitButton.count() > 0) {
            await submitButton.click();
            
            // Wait for navigation or login response
            try {
              await page.waitForURL(url => url !== 'https://searchmatic.netlify.app' && !url.includes('login'), { timeout: 10000 });
              console.log('   ✅ Login successful - redirected to dashboard');
              
              // Take screenshot of post-login page
              await page.screenshot({ 
                path: path.join(screenshotsDir, '04-post-login-dashboard.png'),
                fullPage: true 
              });
              console.log('   ✅ Post-login dashboard screenshot saved');
              
            } catch (e) {
              console.log('   ⚠️  Login attempt completed but no clear redirect detected');
              await page.screenshot({ 
                path: path.join(screenshotsDir, '04-post-login-attempt.png'),
                fullPage: true 
              });
            }
          } else {
            console.log('   ❌ No submit button found');
          }
        } else {
          console.log('   ❌ Could not find email/password fields');
        }
      } catch (error) {
        console.log(`   ❌ Login test failed: ${error.message}`);
      }
    } else {
      console.log('   ❌ No login interface found on homepage');
      
      // Check if we're already on a login page or if login is embedded
      const hasEmailField = await page.locator('input[type="email"]').count() > 0;
      const hasPasswordField = await page.locator('input[type="password"]').count() > 0;
      
      if (hasEmailField && hasPasswordField) {
        console.log('   Found embedded login form, attempting login...');
        
        await page.fill('input[type="email"]', 'jimkalinov@gmail.com');
        await page.fill('input[type="password"]', 'Jimkali90#');
        
        await page.screenshot({ 
          path: path.join(screenshotsDir, '03-login-form-filled.png'),
          fullPage: true 
        });
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(3000);
          
          await page.screenshot({ 
            path: path.join(screenshotsDir, '04-post-login-attempt.png'),
            fullPage: true 
          });
        }
      }
    }

    console.log('\n4. Testing navigation and app structure...');
    
    // Look for navigation elements
    const navElements = await page.locator('nav, [role="navigation"], .navbar, .nav, .menu').count();
    console.log(`   Navigation elements found: ${navElements}`);
    
    // Look for main content areas
    const mainElements = await page.locator('main, [role="main"], .main-content, .content').count();
    console.log(`   Main content areas found: ${mainElements}`);
    
    // Look for sidebar
    const sidebarElements = await page.locator('.sidebar, .side-nav, [role="complementary"]').count();
    console.log(`   Sidebar elements found: ${sidebarElements}`);

    console.log('\n5. Testing for chat/agent functionality...');
    
    // Look for chat-related elements
    const chatSelectors = [
      '.chat',
      '.conversation',
      '.messages',
      '[data-testid*="chat"]',
      'button:has-text("Chat")',
      'button:has-text("Ask")',
      'button:has-text("Agent")',
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="chat"]',
      'input[placeholder*="ask"]',
      'input[placeholder*="search"]'
    ];
    
    let chatFound = false;
    for (const selector of chatSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`   Found chat element: ${selector} (${count} instances)`);
        chatFound = true;
      }
    }
    
    if (!chatFound) {
      console.log('   ❌ No obvious chat/agent interface found');
    } else {
      await page.screenshot({ 
        path: path.join(screenshotsDir, '05-chat-interface.png'),
        fullPage: true 
      });
      console.log('   ✅ Chat interface screenshot saved');
    }

    console.log('\n6. Performance analysis...');
    
    // Test loading performance of key resources
    const performanceData = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
      };
    });
    
    console.log(`   DOM Content Loaded: ${Math.round(performanceData.domContentLoaded)}ms`);
    console.log(`   Load Complete: ${Math.round(performanceData.loadComplete)}ms`);
    console.log(`   First Paint: ${Math.round(performanceData.firstPaint)}ms`);
    console.log(`   First Contentful Paint: ${Math.round(performanceData.firstContentfulPaint)}ms`);

    console.log('\n7. Accessibility and UX checks...');
    
    // Check for accessibility features
    const hasSkipLinks = await page.locator('a[href="#main"], a:has-text("Skip to")').count() > 0;
    const hasAltText = await page.locator('img[alt]').count();
    const totalImages = await page.locator('img').count();
    const hasAriaLabels = await page.locator('[aria-label]').count();
    const hasHeadings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    
    console.log(`   Skip links: ${hasSkipLinks ? '✅' : '❌'}`);
    console.log(`   Images with alt text: ${hasAltText}/${totalImages}`);
    console.log(`   Elements with ARIA labels: ${hasAriaLabels}`);
    console.log(`   Heading elements: ${hasHeadings}`);

    console.log('\n8. Modern UI elements check...');
    
    // Check for modern UI patterns
    const hasGridLayout = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      return Array.from(elements).some(el => 
        getComputedStyle(el).display.includes('grid') || 
        getComputedStyle(el).display.includes('flex')
      );
    });
    
    const hasTransitions = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      return Array.from(elements).some(el => 
        getComputedStyle(el).transition !== 'all 0s ease 0s' &&
        getComputedStyle(el).transition !== 'none'
      );
    });
    
    console.log(`   Modern layout (Grid/Flexbox): ${hasGridLayout ? '✅' : '❌'}`);
    console.log(`   CSS Transitions: ${hasTransitions ? '✅' : '❌'}`);

    // Final comprehensive screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, '06-final-state.png'),
      fullPage: true 
    });
    console.log('   ✅ Final state screenshot saved');

  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    
    // Take error screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'error-state.png'),
      fullPage: true 
    });
    console.log('   Error state screenshot saved');
  } finally {
    await browser.close();
    console.log(`\n✅ Test completed! Screenshots saved to: ${screenshotsDir}`);
  }
}

// Run the test
testSearchmatic().catch(console.error);