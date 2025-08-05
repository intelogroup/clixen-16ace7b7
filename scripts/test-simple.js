import { chromium } from 'playwright';

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('📸 Taking screenshots of clixen.netlify.app...\n');
    
    // Navigate to the app
    console.log('1. Navigating to homepage...');
    await page.goto('https://clixen.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/01-homepage.png', fullPage: true });
    console.log('✅ Homepage screenshot saved');
    
    // Check what's on the page
    const pageTitle = await page.title();
    const pageUrl = page.url();
    console.log('Page info:', { title: pageTitle, url: pageUrl });
    
    // Try to find any forms or inputs
    const emailInput = await page.locator('input[type="email"]').count();
    const passwordInput = await page.locator('input[type="password"]').count();
    const textInputs = await page.locator('input[type="text"]').count();
    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    
    console.log('\nPage elements found:');
    console.log(`- Email inputs: ${emailInput}`);
    console.log(`- Password inputs: ${passwordInput}`);
    console.log(`- Text inputs: ${textInputs}`);
    console.log(`- Buttons: ${buttons}`);
    console.log(`- Links: ${links}`);
    
    // Get all visible text
    const visibleText = await page.locator('body').innerText();
    console.log('\nVisible text preview:');
    console.log(visibleText.substring(0, 500) + '...');
    
    // Check for specific elements
    if (emailInput > 0 && passwordInput > 0) {
      console.log('\n✅ Login form detected!');
      
      // Try to login
      try {
        await page.fill('input[type="email"]', 'jimkalinov@gmail.com');
        await page.fill('input[type="password"]', 'Jimkali90#');
        await page.screenshot({ path: 'screenshots/02-login-filled.png' });
        console.log('✅ Login credentials entered');
        
        // Find and click submit button
        const submitButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          console.log('⏳ Submitting login...');
          
          // Wait for navigation or error
          await page.waitForTimeout(5000);
          await page.screenshot({ path: 'screenshots/03-after-login.png', fullPage: true });
          console.log('✅ Post-login screenshot saved');
          
          const newUrl = page.url();
          console.log('New URL:', newUrl);
        }
      } catch (e) {
        console.log('❌ Login attempt failed:', e.message);
      }
    }
    
    // Check if we're on the chat page
    if (page.url().includes('/chat')) {
      console.log('\n✅ On chat page!');
      
      // Look for chat elements
      const chatInput = await page.locator('textarea, input[placeholder*="message"], input[placeholder*="workflow"]').first();
      if (await chatInput.isVisible()) {
        console.log('✅ Chat input found');
        await page.screenshot({ path: 'screenshots/04-chat-interface.png', fullPage: true });
        
        // Try sending a message
        await chatInput.fill('Hello! Can you help me create a workflow?');
        await page.screenshot({ path: 'screenshots/05-message-typed.png' });
        
        // Press Enter
        await chatInput.press('Enter');
        console.log('✅ Message sent');
        
        // Wait for response
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'screenshots/06-chat-response.png', fullPage: true });
      }
    }
    
    console.log('\n✅ All screenshots saved in screenshots/ directory');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'screenshots/error-state.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Create screenshots directory
import { mkdir } from 'fs/promises';
await mkdir('screenshots', { recursive: true });

// Run
takeScreenshots().catch(console.error);