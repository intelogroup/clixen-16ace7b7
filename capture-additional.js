import { chromium } from 'playwright';
import fs from 'fs';

async function captureAdditionalScreenshots() {
  const screenshotsDir = './screenshots';
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 Capturing additional screenshots...');

    // Login first
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('https://clixen.netlify.app/auth', { waitUntil: 'networkidle' });
    
    try {
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      await page.fill('input[type="email"]', 'jimkalinov@gmail.com');
      await page.fill('input[type="password"]', 'Jimkali90#');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      console.log('✅ Logged in successfully');
    } catch (e) {
      console.log('⚠️ Login may have failed, continuing...');
    }

    // Try to access chat interface directly
    console.log('📸 Attempting to capture chat interface...');
    
    const chatUrls = [
      'https://clixen.netlify.app/chat',
      'https://clixen.netlify.app/dashboard?tab=chat',
      'https://clixen.netlify.app/dashboard#chat'
    ];

    for (const url of chatUrls) {
      try {
        console.log(`🔄 Trying chat URL: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(2000);
        
        // Look for chat-specific elements
        const chatElements = [
          '.chat-interface',
          '.ai-chat',
          '.conversation',
          '[data-testid="chat"]',
          '.messages-container'
        ];

        let foundChat = false;
        for (const selector of chatElements) {
          try {
            await page.waitForSelector(selector, { timeout: 2000 });
            foundChat = true;
            console.log(`✅ Found chat interface with: ${selector}`);
            break;
          } catch (e) {
            // Continue
          }
        }

        // Take screenshots regardless
        await page.screenshot({ 
          path: `${screenshotsDir}/11-chat-interface-desktop.png`,
          fullPage: true 
        });

        // Mobile chat
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(1000);
        await page.screenshot({ 
          path: `${screenshotsDir}/11-chat-interface-mobile.png`,
          fullPage: true 
        });

        // Tablet chat
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(1000);
        await page.screenshot({ 
          path: `${screenshotsDir}/11-chat-interface-tablet.png`,
          fullPage: true 
        });

        await page.setViewportSize({ width: 1920, height: 1080 }); // Back to desktop

        if (foundChat) {
          console.log('✅ Successfully captured chat interface');
          break;
        }
        
      } catch (e) {
        console.log(`❌ Could not access ${url}: ${e.message}`);
      }
    }

    // Try to interact with the chat if possible
    try {
      const messageInput = await page.$('input[placeholder*="message"], textarea[placeholder*="message"], .chat-input');
      if (messageInput) {
        await messageInput.fill('Create a simple workflow for sending email notifications');
        await page.waitForTimeout(500);
        await page.screenshot({ 
          path: `${screenshotsDir}/12-chat-with-message.png`,
          fullPage: true 
        });
        console.log('📸 Captured chat with sample message');
      }
    } catch (e) {
      console.log('⚠️ Could not interact with chat input');
    }

    // Try to capture workflow builder/creator interface
    console.log('📸 Attempting to capture workflow builder...');
    const workflowUrls = [
      'https://clixen.netlify.app/workflow',
      'https://clixen.netlify.app/builder',
      'https://clixen.netlify.app/create',
      'https://clixen.netlify.app/dashboard?tab=workflows'
    ];

    for (const url of workflowUrls) {
      try {
        console.log(`🔄 Trying workflow URL: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(2000);
        
        const urlPart = url.split('/').pop().split('?')[0];
        await page.screenshot({ 
          path: `${screenshotsDir}/13-${urlPart}-desktop.png`,
          fullPage: true 
        });
        console.log(`📸 Captured: ${urlPart}`);
        
      } catch (e) {
        console.log(`❌ Could not access ${url}: ${e.message}`);
      }
    }

    // Capture responsive versions of main dashboard
    console.log('📸 Capturing responsive dashboard versions...');
    await page.goto('https://clixen.netlify.app/dashboard', { waitUntil: 'networkidle' });
    
    // Tablet dashboard
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: `${screenshotsDir}/14-dashboard-tablet.png`,
      fullPage: true 
    });

    // Mobile dashboard
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: `${screenshotsDir}/14-dashboard-mobile.png`,
      fullPage: true 
    });

    console.log('✅ Additional screenshot capture completed!');

  } catch (error) {
    console.error('❌ Error during additional screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

captureAdditionalScreenshots();