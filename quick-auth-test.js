import { chromium } from 'playwright';

async function testAuth() {
    console.log('🚀 Starting quick authentication test...');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        // Navigate to the auth page
        console.log('📡 Navigating to clixen.netlify.app...');
        await page.goto('https://clixen.netlify.app');
        await page.waitForLoadState('networkidle');
        
        // Take screenshot of landing page
        await page.screenshot({ path: 'quick-test-1-landing.png', fullPage: true });
        console.log('✅ Landing page loaded, screenshot saved');
        
        // Click sign in or get started button
        const buttons = [
            page.getByText(/get started/i),
            page.getByText(/sign in/i),
            page.getByText(/login/i),
            page.locator('a[href*="auth"]'),
            page.locator('button:has-text("Get Started")')
        ];
        
        let clicked = false;
        for (const button of buttons) {
            try {
                if (await button.first().isVisible({ timeout: 2000 })) {
                    await button.first().click();
                    clicked = true;
                    console.log('✅ Clicked navigation button');
                    break;
                }
            } catch (e) {
                // Try next button
            }
        }
        
        if (!clicked) {
            console.log('⚠️  No navigation button found, trying direct auth URL');
            await page.goto('https://clixen.netlify.app/auth');
        }
        
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'quick-test-2-auth-page.png', fullPage: true });
        console.log('✅ Auth page loaded, screenshot saved');
        
        // Fill in credentials
        console.log('🔐 Filling in credentials...');
        await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
        await page.fill('input[type="password"]', 'Goldyear2023#');
        
        await page.screenshot({ path: 'quick-test-3-credentials-filled.png', fullPage: true });
        console.log('✅ Credentials filled, screenshot saved');
        
        // Submit form
        console.log('📤 Submitting login form...');
        await page.click('button:has-text("Sign In")');
        
        // Wait for either success or error
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'quick-test-4-after-submit.png', fullPage: true });
        
        // Check for success indicators
        const url = page.url();
        const hasError = await page.locator(':has-text("Invalid")').isVisible().catch(() => false);
        const hasDashboard = url.includes('/dashboard') || url.includes('/chat') || url.includes('/workflows');
        
        console.log('📊 Results:');
        console.log(`  Current URL: ${url}`);
        console.log(`  Has error: ${hasError}`);
        console.log(`  Redirected to app: ${hasDashboard}`);
        
        if (!hasError && hasDashboard) {
            console.log('🎉 SUCCESS: Authentication completed successfully!');
            await page.screenshot({ path: 'quick-test-5-success.png', fullPage: true });
        } else if (hasError) {
            console.log('❌ FAILED: Authentication failed with error');
        } else {
            console.log('⚠️  UNKNOWN: Authentication status unclear');
        }
        
    } catch (error) {
        console.error('💥 Error during test:', error.message);
        await page.screenshot({ path: 'quick-test-error.png', fullPage: true });
    } finally {
        await browser.close();
        console.log('🏁 Test completed');
    }
}

testAuth();