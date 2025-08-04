import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function takeScreenshots() {
  // Create screenshots directory
  const screenshotsDir = './screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 Starting Clixen app screenshot capture...');

    // 1. Take homepage screenshot - Desktop
    console.log('📸 Capturing homepage - Desktop');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('https://clixen.netlify.app', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Wait for any animations
    await page.screenshot({ 
      path: `${screenshotsDir}/01-homepage-desktop.png`,
      fullPage: true 
    });

    // 2. Take homepage screenshot - Tablet
    console.log('📸 Capturing homepage - Tablet');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: `${screenshotsDir}/02-homepage-tablet.png`,
      fullPage: true 
    });

    // 3. Take homepage screenshot - Mobile
    console.log('📸 Capturing homepage - Mobile');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: `${screenshotsDir}/03-homepage-mobile.png`,
      fullPage: true 
    });

    // 4. Navigate to login and authenticate
    console.log('🔐 Attempting to login...');
    await page.setViewportSize({ width: 1920, height: 1080 }); // Back to desktop

    // Look for login button or link
    await page.goto('https://clixen.netlify.app', { waitUntil: 'networkidle' });
    
    // Try different selectors for login
    const loginSelectors = [
      'a[href*="login"]',
      'button:has-text("Login")',
      'button:has-text("Sign In")',
      '[data-testid="login"]',
      '.login-button',
      '#login'
    ];

    let loginFound = false;
    for (const selector of loginSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.click(selector);
        loginFound = true;
        console.log(`✅ Found login with selector: ${selector}`);
        break;
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!loginFound) {
      // Try direct navigation to auth page
      console.log('🔄 Trying direct navigation to auth page...');
      await page.goto('https://clixen.netlify.app/auth', { waitUntil: 'networkidle' });
    }

    await page.waitForTimeout(2000);
    
    // Take login page screenshot
    console.log('📸 Capturing login page');
    await page.screenshot({ 
      path: `${screenshotsDir}/04-login-page-desktop.png`,
      fullPage: true 
    });

    // Try to find and fill login form
    try {
      // Look for email input
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email"]',
        '#email'
      ];

      let emailInput = null;
      for (const selector of emailSelectors) {
        try {
          emailInput = await page.waitForSelector(selector, { timeout: 2000 });
          break;
        } catch (e) {
          // Continue
        }
      }

      if (emailInput) {
        await emailInput.fill('jimkalinov@gmail.com');
        console.log('✅ Filled email field');

        // Look for password input
        const passwordSelectors = [
          'input[type="password"]',
          'input[name="password"]',
          '#password'
        ];

        let passwordInput = null;
        for (const selector of passwordSelectors) {
          try {
            passwordInput = await page.waitForSelector(selector, { timeout: 2000 });
            break;
          } catch (e) {
            // Continue
          }
        }

        if (passwordInput) {
          await passwordInput.fill('Jimkali90#');
          console.log('✅ Filled password field');

          // Take filled form screenshot
          await page.screenshot({ 
            path: `${screenshotsDir}/05-login-form-filled.png`,
            fullPage: true 
          });

          // Look for submit button
          const submitSelectors = [
            'button[type="submit"]',
            'button:has-text("Login")',
            'button:has-text("Sign In")',
            'button:has-text("Continue")',
            '.submit-button',
            '#submit'
          ];

          for (const selector of submitSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 2000 });
              await page.click(selector);
              console.log(`✅ Clicked submit with selector: ${selector}`);
              break;
            } catch (e) {
              // Continue
            }
          }

          // Wait for navigation/response
          await page.waitForTimeout(5000);
          
          // Take post-login screenshot
          console.log('📸 Capturing post-login state');
          await page.screenshot({ 
            path: `${screenshotsDir}/06-post-login-desktop.png`,
            fullPage: true 
          });

        }
      }
    } catch (loginError) {
      console.log('⚠️ Login form interaction failed:', loginError.message);
    }

    // Try to navigate to dashboard/main app
    const dashboardUrls = [
      'https://clixen.netlify.app/dashboard',
      'https://clixen.netlify.app/app',
      'https://clixen.netlify.app/chat',
      'https://clixen.netlify.app/main'
    ];

    for (const url of dashboardUrls) {
      try {
        console.log(`🔄 Trying to access: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(3000);
        
        const urlName = url.split('/').pop();
        await page.screenshot({ 
          path: `${screenshotsDir}/07-${urlName}-desktop.png`,
          fullPage: true 
        });
        console.log(`📸 Captured: ${urlName}`);
        
        // If this is a chat interface, try to capture it specifically
        if (urlName === 'chat') {
          // Look for chat elements
          const chatSelectors = [
            '.chat-container',
            '.messages',
            '.agent-chat',
            '[data-testid="chat"]'
          ];

          for (const selector of chatSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 3000 });
              console.log(`✅ Found chat interface with selector: ${selector}`);
              break;
            } catch (e) {
              // Continue
            }
          }

          // Take tablet and mobile screenshots of chat
          await page.setViewportSize({ width: 768, height: 1024 });
          await page.waitForTimeout(1000);
          await page.screenshot({ 
            path: `${screenshotsDir}/08-chat-tablet.png`,
            fullPage: true 
          });

          await page.setViewportSize({ width: 375, height: 667 });
          await page.waitForTimeout(1000);
          await page.screenshot({ 
            path: `${screenshotsDir}/09-chat-mobile.png`,
            fullPage: true 
          });
        }
        
        break; // Stop after first successful page
      } catch (e) {
        console.log(`❌ Could not access ${url}: ${e.message}`);
      }
    }

    // Try to capture any additional pages or states
    await page.setViewportSize({ width: 1920, height: 1080 }); // Back to desktop
    
    // Look for navigation elements
    const navSelectors = [
      'nav a',
      '.nav-link',
      '.menu-item',
      'header a'
    ];

    for (const selector of navSelectors) {
      try {
        const links = await page.$$(selector);
        if (links.length > 0) {
          console.log(`✅ Found ${links.length} navigation links`);
          
          // Try clicking on different nav items
          for (let i = 0; i < Math.min(3, links.length); i++) {
            try {
              const href = await links[i].getAttribute('href');
              if (href && !href.includes('http') && !href.includes('#')) {
                await links[i].click();
                await page.waitForTimeout(2000);
                
                const linkText = (await links[i].textContent() || `nav-${i}`).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                await page.screenshot({ 
                  path: `${screenshotsDir}/10-${linkText}-desktop.png`,
                  fullPage: true 
                });
                console.log(`📸 Captured navigation page: ${linkText}`);
              }
            } catch (e) {
              // Continue with next link
            }
          }
        }
        break;
      } catch (e) {
        // Continue with next selector
      }
    }

    console.log('✅ Screenshot capture completed!');

  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshots();