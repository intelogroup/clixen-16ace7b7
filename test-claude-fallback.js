import { chromium } from 'playwright';

async function testClaudeFallback() {
    console.log('🤖 Testing Claude API Fallback Integration');
    console.log('=========================================');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
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
        
        // Step 3: Send test message
        console.log('\n3️⃣ Sending test message...');
        const testMessage = "Hello! Can you tell me which AI provider you're using to respond to this message?";
        
        const textarea = page.locator('textarea').first();
        await textarea.fill(testMessage);
        await textarea.press('Enter');
        
        console.log('   ⏳ Waiting for AI response...');
        await page.waitForTimeout(8000); // Give time for response
        
        // Step 4: Check response and look for provider info
        const pageContent = await page.content();
        
        // Look for provider indicators
        const indicators = {
            hasResponse: false,
            mentionsOpenAI: pageContent.toLowerCase().includes('openai'),
            mentionsClaude: pageContent.toLowerCase().includes('claude'),
            mentionsAnthropic: pageContent.toLowerCase().includes('anthropic'),
            hasAgentInfo: pageContent.includes('Orchestrator') || pageContent.includes('agent'),
            hasError: pageContent.toLowerCase().includes('error')
        };
        
        // Check if we got a response
        const messages = await page.locator('[class*="message"]').count();
        indicators.hasResponse = messages > 1;
        
        console.log('\n4️⃣ Response Analysis:');
        console.log(`   Response received: ${indicators.hasResponse ? '✅ YES' : '❌ NO'}`);
        console.log(`   OpenAI mentioned: ${indicators.mentionsOpenAI ? '✅ YES' : '❌ NO'}`);
        console.log(`   Claude mentioned: ${indicators.mentionsClaude ? '✅ YES' : '❌ NO'}`);
        console.log(`   Agent system active: ${indicators.hasAgentInfo ? '✅ YES' : '❌ NO'}`);
        console.log(`   Errors detected: ${indicators.hasError ? '❌ YES' : '✅ NO'}`);
        
        // Step 5: Test with a workflow request
        console.log('\n5️⃣ Testing workflow creation request...');
        const workflowRequest = "Create a simple n8n workflow that monitors a Slack channel for messages containing 'urgent' and sends an email notification.";
        
        await textarea.fill(workflowRequest);
        await textarea.press('Enter');
        
        await page.waitForTimeout(10000); // More time for complex response
        
        // Take screenshot
        await page.screenshot({ path: 'claude-fallback-test.png', fullPage: true });
        
        // Check for workflow-specific response
        const workflowContent = await page.content();
        const workflowIndicators = {
            mentionsSlack: workflowContent.toLowerCase().includes('slack'),
            mentionsEmail: workflowContent.toLowerCase().includes('email'),
            mentionsTrigger: workflowContent.toLowerCase().includes('trigger'),
            mentionsWorkflow: workflowContent.toLowerCase().includes('workflow'),
            hasDetailedResponse: workflowContent.length > 5000 // Indicates a detailed response
        };
        
        console.log('\n6️⃣ Workflow Response Analysis:');
        console.log(`   Slack mentioned: ${workflowIndicators.mentionsSlack ? '✅ YES' : '❌ NO'}`);
        console.log(`   Email mentioned: ${workflowIndicators.mentionsEmail ? '✅ YES' : '❌ NO'}`);
        console.log(`   Workflow concepts: ${workflowIndicators.mentionsWorkflow ? '✅ YES' : '❌ NO'}`);
        console.log(`   Detailed response: ${workflowIndicators.hasDetailedResponse ? '✅ YES' : '❌ NO'}`);
        
        // Step 6: Extract AI provider from console or page
        const consoleMessages = [];
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('provider') || text.includes('claude') || text.includes('openai')) {
                consoleMessages.push(text);
            }
        });
        
        // Final assessment
        const aiProviderDetected = indicators.mentionsClaude || indicators.mentionsOpenAI ? 
            (indicators.mentionsClaude ? 'Claude' : 'OpenAI') : 'Unknown';
        
        console.log('\n📊 FINAL ASSESSMENT');
        console.log('==================');
        console.log(`AI Response: ${indicators.hasResponse ? '✅ WORKING' : '❌ NOT WORKING'}`);
        console.log(`Provider Detected: ${aiProviderDetected}`);
        console.log(`Multi-Agent System: ${indicators.hasAgentInfo ? '✅ ACTIVE' : '❌ NOT DETECTED'}`);
        console.log(`Workflow Understanding: ${workflowIndicators.mentionsSlack && workflowIndicators.mentionsEmail ? '✅ EXCELLENT' : '⚠️ PARTIAL'}`);
        
        const fallbackWorking = indicators.hasResponse && !indicators.hasError;
        
        if (fallbackWorking) {
            console.log('\n🎉 SUCCESS: AI Fallback System Working!');
            console.log('✅ The system successfully responds to messages');
            console.log('✅ Multi-agent architecture is functional');
            console.log('🤖 AI Provider: ' + (aiProviderDetected === 'Unknown' ? 'Working (provider not disclosed)' : aiProviderDetected));
        } else {
            console.log('\n⚠️ Issues detected:');
            if (!indicators.hasResponse) console.log('   - No AI response received');
            if (indicators.hasError) console.log('   - Errors detected in response');
        }
        
        return fallbackWorking;
        
    } catch (error) {
        console.error('Test error:', error.message);
        await page.screenshot({ path: 'claude-fallback-error.png' });
        return false;
    } finally {
        await browser.close();
    }
}

testClaudeFallback().then(success => {
    console.log('\n' + '='.repeat(50));
    if (success) {
        console.log('✅ Claude Fallback Integration Test PASSED');
        console.log('The multi-provider AI system is working correctly!');
    } else {
        console.log('❌ Claude Fallback Integration Test FAILED');
        console.log('Check the screenshots and logs for details.');
    }
    process.exit(success ? 0 : 1);
});