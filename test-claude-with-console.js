import { chromium } from 'playwright';

async function testClaudeWithConsole() {
    console.log('🤖 Testing Claude API Fallback with Console Monitoring');
    console.log('=====================================================');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Capture console logs
    const consoleLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        const type = msg.type();
        consoleLogs.push({ type, text });
        
        // Print important logs
        if (type === 'error' || text.includes('Error') || text.includes('edge function') || 
            text.includes('AI provider') || text.includes('Claude') || text.includes('OpenAI')) {
            console.log(`   [${type.toUpperCase()}] ${text}`);
        }
    });
    
    // Capture network errors
    page.on('requestfailed', request => {
        console.log(`   [NETWORK ERROR] ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    try {
        // Step 1: Login
        console.log('\n1️⃣ Logging in...');
        await page.goto('http://localhost:3002/auth');
        await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
        await page.fill('input[type="password"]', 'Goldyear2023#');
        await page.click('button:has-text("Sign In")');
        await page.waitForURL('**/dashboard');
        console.log('   ✅ Logged in successfully');
        
        // Step 2: Navigate to Chat
        console.log('\n2️⃣ Navigating to Chat...');
        await page.click('text=Create Workflow');
        await page.waitForTimeout(3000);
        
        // Clear console logs before test
        consoleLogs.length = 0;
        
        // Step 3: Send test message
        console.log('\n3️⃣ Sending test message...');
        const testMessage = "Hello! Can you tell me which AI provider you're using?";
        
        const textarea = page.locator('textarea').first();
        await textarea.fill(testMessage);
        await textarea.press('Enter');
        
        console.log('   ⏳ Waiting for AI response (15 seconds)...');
        await page.waitForTimeout(15000);
        
        // Analyze console logs
        console.log('\n4️⃣ Console Analysis:');
        const errors = consoleLogs.filter(log => log.type === 'error');
        const edgeFunctionLogs = consoleLogs.filter(log => log.text.includes('edge function') || log.text.includes('Edge function'));
        const aiProviderLogs = consoleLogs.filter(log => log.text.includes('AI provider') || log.text.includes('Claude') || log.text.includes('OpenAI'));
        
        console.log(`   Total console logs: ${consoleLogs.length}`);
        console.log(`   Errors: ${errors.length}`);
        console.log(`   Edge function logs: ${edgeFunctionLogs.length}`);
        console.log(`   AI provider logs: ${aiProviderLogs.length}`);
        
        if (errors.length > 0) {
            console.log('\n   Console Errors:');
            errors.forEach(err => console.log(`     - ${err.text}`));
        }
        
        // Take screenshot
        await page.screenshot({ path: 'claude-console-test.png', fullPage: true });
        
        // Check for messages
        const messages = await page.locator('[class*="message"]').count();
        console.log(`\n5️⃣ Messages found: ${messages}`);
        
        // Final assessment
        const hasResponse = messages > 1;
        const hasErrors = errors.length > 0;
        const detectedProvider = aiProviderLogs.find(log => 
            log.text.includes('Using Claude') || log.text.includes('Using OpenAI')
        );
        
        console.log('\n📊 FINAL ASSESSMENT');
        console.log('==================');
        console.log(`Response received: ${hasResponse ? '✅ YES' : '❌ NO'}`);
        console.log(`Errors detected: ${hasErrors ? `❌ YES (${errors.length})` : '✅ NO'}`);
        console.log(`AI Provider: ${detectedProvider ? detectedProvider.text : 'Not detected'}`);
        
        return !hasErrors && hasResponse;
        
    } catch (error) {
        console.error('Test error:', error.message);
        return false;
    } finally {
        await browser.close();
    }
}

testClaudeWithConsole().then(success => {
    console.log('\n' + '='.repeat(50));
    if (success) {
        console.log('✅ Test passed - AI system working!');
    } else {
        console.log('❌ Test failed - Check logs and browser console');
    }
});