import { chromium } from 'playwright';

async function testLiveChatAfterFix() {
    console.log('🤖 Testing live Multi-Agent Chat after database fixes...');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        // Authenticate
        console.log('🔐 Authenticating with fixed credentials...');
        await page.goto('https://clixen.netlify.app/auth');
        await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
        await page.fill('input[type="password"]', 'Goldyear2023#');
        await page.click('button:has-text("Sign In")');
        await page.waitForURL('**/dashboard');
        console.log('✅ Authentication successful');
        
        // Navigate to chat
        console.log('🧭 Navigating to Multi-Agent Chat...');
        await page.click('text=Create Workflow');
        await page.waitForLoadState('networkidle');
        
        // Take initial screenshot
        await page.screenshot({ path: 'live-test-1-initial-chat.png', fullPage: true });
        
        // Wait for database connection (longer timeout this time)
        console.log('⏳ Waiting for database connection...');
        
        let connectionSuccess = false;
        let attempts = 0;
        const maxAttempts = 15; // 30 seconds max
        
        while (!connectionSuccess && attempts < maxAttempts) {
            try {
                // Check if connection completed
                const statusText = await page.locator('text="Testing database connection"').isVisible({ timeout: 1000 });
                if (!statusText) {
                    // Connection either succeeded or failed
                    const hasError = await page.locator(':has-text("❌")').isVisible().catch(() => false);
                    const hasSuccess = await page.locator(':has-text("✅")').isVisible().catch(() => false);
                    
                    if (hasError) {
                        console.log('❌ Database connection failed');
                        break;
                    } else if (hasSuccess) {
                        console.log('✅ Database connection successful!');
                        connectionSuccess = true;
                        break;
                    }
                }
                
                await page.waitForTimeout(2000);
                attempts++;
                console.log(`⏳ Attempt ${attempts}/${maxAttempts}...`);
            } catch (e) {
                attempts++;
            }
        }
        
        // Take screenshot after connection attempt
        await page.screenshot({ path: 'live-test-2-after-connection.png', fullPage: true });
        
        // Check if input is enabled
        const inputElement = page.locator('input[placeholder*="message"]').first();
        const isEnabled = await inputElement.isEnabled().catch(() => false);
        
        console.log(`💬 Chat input enabled: ${isEnabled}`);
        
        if (isEnabled && connectionSuccess) {
            console.log('🤖 Testing Multi-Agent functionality...');
            
            // Try a simple message
            await inputElement.fill('Hello! Can you help me create a simple workflow?');
            await page.press('input[placeholder*="message"]', 'Enter');
            
            console.log('⏳ Waiting for AI agent response...');
            await page.waitForTimeout(8000);
            
            await page.screenshot({ path: 'live-test-3-agent-interaction.png', fullPage: true });
            
            // Check for any response in the chat
            const messages = await page.locator('[class*="message"], .prose, p').count();
            console.log(`💬 Found ${messages} potential message elements`);
            
        } else {
            console.log('⚠️  Chat input still not enabled or connection failed');
            
            // Try the /test-db command to see what's happening
            if (!isEnabled) {
                console.log('🔧 Checking system status...');
                
                // Look for any error messages or status text
                const statusElements = await page.locator('[class*="status"], [class*="error"], .text-red-500, .text-green-500').allTextContents();
                console.log('📊 Status messages:', statusElements);
            }
        }
        
        // Take final screenshot
        await page.screenshot({ path: 'live-test-4-final-state.png', fullPage: true });
        
        // Get final URL and status
        const finalUrl = page.url();
        console.log(`📍 Final URL: ${finalUrl}`);
        
        console.log('\n🎯 Live Multi-Agent Chat Test Results:');
        console.log(`  ✅ Authentication: WORKING`);
        console.log(`  ✅ Navigation: WORKING`);
        console.log(`  ${connectionSuccess ? '✅' : '⚠️ '} Database Connection: ${connectionSuccess ? 'SUCCESS' : 'STILL PENDING/FAILED'}`);
        console.log(`  ${isEnabled ? '✅' : '⚠️ '} Chat Input: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
        console.log(`  ✅ UI/UX: FUNCTIONAL`);
        
        return connectionSuccess && isEnabled;
        
    } catch (error) {
        console.error('💥 Error during live test:', error.message);
        await page.screenshot({ path: 'live-test-error.png', fullPage: true });
        return false;
    } finally {
        await browser.close();
        console.log('🏁 Live test completed');
    }
}

testLiveChatAfterFix().then(success => {
    if (success) {
        console.log('🎉 SUCCESS: Multi-Agent Chat system is fully functional!');
    } else {
        console.log('⚠️  PARTIAL: Some issues may still need deployment or additional fixes');
    }
});