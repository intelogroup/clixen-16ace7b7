import { chromium } from 'playwright';

async function testWithCacheRefresh() {
    console.log('🤖 Testing with cache refresh to get latest deployment...');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        // Disable cache to ensure we get the latest version
        ignoreHTTPSErrors: true
    });
    const page = await context.newPage();
    
    try {
        // Clear cache and reload
        console.log('🔄 Clearing cache and loading fresh...');
        await page.goto('https://clixen.netlify.app/', { waitUntil: 'networkidle' });
        
        // Hard refresh by adding cache busting
        const timestamp = Date.now();
        await page.goto(`https://clixen.netlify.app/?t=${timestamp}`, { waitUntil: 'networkidle' });
        
        // Authenticate
        console.log('🔐 Authenticating...');
        await page.goto('https://clixen.netlify.app/auth');
        await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
        await page.fill('input[type="password"]', 'Goldyear2023#');
        await page.click('button:has-text("Sign In")');
        await page.waitForURL('**/dashboard');
        
        // Navigate to chat
        console.log('🧭 Navigating to chat...');
        await page.click('text=Create Workflow');
        await page.waitForLoadState('networkidle');
        
        // Wait for a few seconds and take screenshot
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'cache-refresh-test.png', fullPage: true });
        
        // Check the status message
        const statusElement = await page.locator('[class*="status"], .text-red-500, .text-green-500').first();
        const statusText = await statusElement.textContent().catch(() => 'No status found');
        
        console.log('📊 Current status:', statusText);
        
        // Check if input is enabled
        const inputElement = page.locator('input[placeholder*="message"]').first();
        const isEnabled = await inputElement.isEnabled().catch(() => false);
        
        console.log(`💬 Chat input enabled: ${isEnabled}`);
        
        // If still showing the old error, let's force a full browser refresh
        if (statusText.includes('count(*)') || statusText.includes('failed to parse')) {
            console.log('🔄 Still showing old error, forcing browser refresh...');
            await page.reload({ waitUntil: 'networkidle' });
            await page.waitForTimeout(3000);
            await page.screenshot({ path: 'after-refresh-test.png', fullPage: true });
            
            const newStatusText = await page.locator('[class*="status"], .text-red-500, .text-green-500').first().textContent().catch(() => 'No status found');
            console.log('📊 Status after refresh:', newStatusText);
        }
        
        return !statusText.includes('count(*)');
        
    } catch (error) {
        console.error('💥 Error:', error.message);
        return false;
    } finally {
        await browser.close();
    }
}

testWithCacheRefresh().then(success => {
    if (success) {
        console.log('🎉 SUCCESS: Cache refresh resolved the issue!');
    } else {
        console.log('⚠️  The fix may need more time to propagate or there\'s another issue');
    }
});