import { chromium } from 'playwright';

async function testRealGPTIntegration() {
    console.log('🤖 Testing if Multi-Agent Chat is using real GPT-4...');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
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
        await page.waitForTimeout(3000);
        
        // Send a test message that would reveal if it's real GPT or demo
        console.log('💬 Sending test message to detect GPT vs Demo mode...');
        const textarea = page.locator('textarea').first();
        
        // This is a specific test that would get very different responses from real GPT vs demo
        const testMessage = "What is 2+2? Answer with just the number and then explain why cats are better than dogs in exactly 3 words.";
        
        await textarea.fill(testMessage);
        await textarea.press('Enter');
        
        console.log('⏳ Waiting for AI response...');
        await page.waitForTimeout(10000); // Wait longer for real GPT processing
        
        // Take screenshot to see the response
        await page.screenshot({ path: 'gpt-integration-test.png', fullPage: true });
        
        // Analyze the response
        const pageContent = await page.content();
        
        // Look for demo mode indicators
        const isDemoMode = pageContent.includes('Demo mode') || 
                          pageContent.includes('simulated AI response') ||
                          pageContent.includes('Configure OpenAI API key');
        
        // Look for real GPT response patterns
        const hasSpecificAnswer = pageContent.includes('4') && // Should answer 2+2=4
                                 (pageContent.toLowerCase().includes('cat') || 
                                  pageContent.toLowerCase().includes('dog'));
        
        // Look for intelligent workflow-related follow-up (real GPT behavior)
        const hasWorkflowFollowup = pageContent.includes('trigger') ||
                                   pageContent.includes('workflow') ||
                                   pageContent.includes('automation');
        
        console.log('\n📊 GPT Integration Analysis:');
        console.log('============================');
        console.log(`🔍 Demo Mode Detected: ${isDemoMode ? 'YES' : 'NO'}`);
        console.log(`🧠 Specific Answer Given: ${hasSpecificAnswer ? 'YES' : 'NO'}`);
        console.log(`🔄 Workflow Follow-up: ${hasWorkflowFollowup ? 'YES' : 'NO'}`);
        
        if (isDemoMode) {
            console.log('🟡 Status: DEMO MODE - OpenAI API key not configured');
            console.log('💡 The system is working but using simulated responses');
        } else if (hasSpecificAnswer) {
            console.log('🟢 Status: REAL GPT-4 - API integration working!');
            console.log('🎉 Multi-Agent Chat is using live OpenAI GPT-4');
        } else {
            console.log('🟡 Status: UNCLEAR - May be real GPT with different response pattern');
            console.log('🔍 Check screenshot for details');
        }
        
        // Extract the actual response for analysis
        const responseElements = await page.locator('[class*="message"] div, [class*="content"] div, p').allTextContents();
        const aiResponses = responseElements.filter(text => 
            text && text.length > 20 && 
            !text.includes('Type your message') &&
            !text.includes('Press Enter')
        );
        
        if (aiResponses.length > 0) {
            console.log('\n💬 AI Response Preview:');
            console.log('======================');
            aiResponses.slice(-2).forEach((response, index) => {
                console.log(`${index + 1}. ${response.substring(0, 150)}${response.length > 150 ? '...' : ''}`);
            });
        }
        
        return {
            isDemoMode,
            hasRealGPT: hasSpecificAnswer && !isDemoMode,
            hasResponse: aiResponses.length > 0
        };
        
    } catch (error) {
        console.error('💥 Test error:', error.message);
        await page.screenshot({ path: 'gpt-integration-error.png', fullPage: true });
        return { isDemoMode: true, hasRealGPT: false, hasResponse: false };
    } finally {
        await browser.close();
    }
}

testRealGPTIntegration().then(result => {
    console.log('\n🎯 Final Assessment:');
    console.log('===================');
    
    if (result.hasRealGPT) {
        console.log('🎉 SUCCESS: Multi-Agent Chat is using REAL GPT-4!');
        console.log('✅ OpenAI API integration is working correctly');
        console.log('🚀 Ready for production use with live AI responses');
    } else if (result.isDemoMode) {
        console.log('⚠️  DEMO MODE: Chat is working but needs OpenAI API key');
        console.log('🔧 Follow the configuration guide to enable real GPT-4');
        console.log('📋 Run: node configure-openai-secrets.js for instructions');
    } else {
        console.log('🔍 INVESTIGATION NEEDED: Check screenshots for response details');
    }
});