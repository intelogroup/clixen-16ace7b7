import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function evaluateClixenUI() {
  console.log('🚀 Clixen UI Evaluation Starting...\n');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();
  
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'ui-evaluation');
  await fs.mkdir(screenshotsDir, { recursive: true });

  const results = {
    timestamp: new Date().toISOString(),
    url: 'https://clixen.netlify.app',
    findings: [],
    recommendations: []
  };

  try {
    // Test 1: Initial Page Load
    console.log('📊 Loading Clixen app...');
    const startTime = Date.now();
    const response = await page.goto('https://clixen.netlify.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    const loadTime = Date.now() - startTime;
    
    console.log(`✅ Page loaded in ${loadTime}ms`);
    console.log(`📍 Current URL: ${page.url()}`);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-initial.png'),
      fullPage: true 
    });

    // Check if we're on auth page
    if (page.url().includes('/auth')) {
      console.log('🔐 On authentication page, attempting login...');
      
      // Wait for login form elements
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      
      // Take screenshot of auth page
      await page.screenshot({ 
        path: path.join(screenshotsDir, '02-auth-page.png'),
        fullPage: true 
      });

      // Fill in credentials
      await page.fill('input[type="email"]', 'jimkalinov@gmail.com');
      await page.fill('input[type="password"]', 'Jimkali90#');
      
      // Find and click submit button
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        console.log('⏳ Login submitted, waiting for navigation...');
        
        // Wait for navigation or timeout
        await Promise.race([
          page.waitForURL('**/dashboard', { timeout: 10000 }),
          page.waitForURL('**/chat', { timeout: 10000 }),
          page.waitForTimeout(10000)
        ]).catch(() => {
          console.log('Navigation timeout, continuing...');
        });
      }
    }

    // Take screenshot after auth
    await page.screenshot({ 
      path: path.join(screenshotsDir, '03-after-auth.png'),
      fullPage: true 
    });

    // Test Mobile View
    console.log('📱 Testing mobile responsiveness...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ 
      path: path.join(screenshotsDir, '04-mobile.png'),
      fullPage: true 
    });

    // Test Tablet View
    console.log('📱 Testing tablet responsiveness...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ 
      path: path.join(screenshotsDir, '05-tablet.png'),
      fullPage: true 
    });

    // Back to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Try to navigate to chat if available
    const chatLink = await page.$('a[href*="chat"], button:has-text("Chat"), [data-testid*="chat"]');
    if (chatLink) {
      console.log('💬 Found chat link, navigating...');
      await chatLink.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: path.join(screenshotsDir, '06-chat.png'),
        fullPage: true 
      });
    }

    // Evaluate UI elements
    console.log('🎨 Evaluating UI elements...');
    const uiAnalysis = await page.evaluate(() => {
      const analysis = {
        colors: {},
        fonts: {},
        animations: 0,
        buttons: 0,
        inputs: 0,
        cards: 0
      };

      // Get computed styles from body
      const bodyStyles = window.getComputedStyle(document.body);
      analysis.colors.background = bodyStyles.backgroundColor;
      analysis.colors.text = bodyStyles.color;
      analysis.fonts.family = bodyStyles.fontFamily;
      analysis.fonts.size = bodyStyles.fontSize;

      // Count UI elements
      analysis.buttons = document.querySelectorAll('button').length;
      analysis.inputs = document.querySelectorAll('input, textarea').length;
      analysis.cards = document.querySelectorAll('[class*="card"], [class*="Card"]').length;
      
      // Check for animations
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.transition !== 'none' || styles.animation !== 'none') {
          analysis.animations++;
        }
      });

      return analysis;
    });

    console.log('\n📊 UI Analysis Results:');
    console.log(JSON.stringify(uiAnalysis, null, 2));

    // Save results
    results.uiAnalysis = uiAnalysis;
    results.loadTime = loadTime;
    results.finalUrl = page.url();

    // Generate recommendations
    if (loadTime > 3000) {
      results.recommendations.push('⚡ Optimize page load time (currently ' + loadTime + 'ms)');
    }
    if (uiAnalysis.animations < 10) {
      results.recommendations.push('✨ Add more smooth animations and transitions');
    }
    if (uiAnalysis.buttons < 5) {
      results.recommendations.push('🔘 Consider adding more interactive elements');
    }

    results.findings.push(`✅ Page loads successfully in ${loadTime}ms`);
    results.findings.push(`📱 Responsive design tested across devices`);
    results.findings.push(`🎨 Found ${uiAnalysis.animations} animated elements`);
    results.findings.push(`🔘 ${uiAnalysis.buttons} buttons, ${uiAnalysis.inputs} inputs detected`);

  } catch (error) {
    console.error('❌ Error during evaluation:', error.message);
    results.error = error.message;
  } finally {
    // Save results
    await fs.writeFile(
      path.join(screenshotsDir, 'evaluation-results.json'),
      JSON.stringify(results, null, 2)
    );

    console.log('\n📋 Evaluation Summary:');
    console.log('====================');
    results.findings.forEach(f => console.log(f));
    console.log('\n💡 Recommendations:');
    results.recommendations.forEach(r => console.log(r));
    console.log('\n📸 Screenshots saved to:', screenshotsDir);

    await browser.close();
  }
}

// Run the evaluation
evaluateClixenUI().catch(console.error);