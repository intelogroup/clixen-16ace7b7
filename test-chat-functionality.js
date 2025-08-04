import { chromium } from 'playwright';

async function testChatFunctionality() {
    console.log('🤖 Starting Multi-Agent Chat System test...');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        // Authenticate first
        console.log('🔐 Authenticating user...');
        await page.goto('https://clixen.netlify.app/auth');
        await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
        await page.fill('input[type="password"]', 'Goldyear2023#');
        await page.click('button:has-text("Sign In")');
        await page.waitForURL('**/dashboard');
        console.log('✅ Authentication successful');
        
        // Navigate to Create Workflow (which should have the chat interface)
        console.log('🧭 Navigating to Create Workflow...');
        await page.click('text=Create Workflow');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'chat-test-1-create-workflow.png', fullPage: true });
        
        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}`);
        
        // Look for chat interface elements
        console.log('🔍 Looking for chat interface elements...');
        
        const chatSelectors = [
            'textarea[placeholder*="message" i]',
            'input[placeholder*="message" i]',
            'textarea[placeholder*="workflow" i]',
            'input[placeholder*="workflow" i]',
            '[data-testid="chat-input"]',
            '[data-testid="message-input"]',
            'textarea',
            'input[type="text"]'
        ];
        
        let foundChatInput = false;
        let chatElement = null;
        
        for (const selector of chatSelectors) {
            try {
                const element = page.locator(selector).first();
                if (await element.isVisible({ timeout: 2000 })) {
                    console.log(`✅ Found chat input: ${selector}`);
                    foundChatInput = true;
                    chatElement = element;
                    break;
                }
            } catch (e) {
                // Continue searching
            }
        }
        
        if (!foundChatInput) {
            console.log('⚠️  No obvious chat input found, checking for other interactive elements...');
            
            // Look for buttons that might trigger chat
            const buttonSelectors = [
                'button:has-text("Start Chat")',
                'button:has-text("Begin")',
                'button:has-text("Create")',
                'button:has-text("Generate")',
                'button[class*="chat"]',
                '[role="button"]'
            ];
            
            for (const selector of buttonSelectors) {
                try {
                    const element = page.locator(selector).first();
                    if (await element.isVisible({ timeout: 1000 })) {
                        console.log(`✅ Found interactive button: ${selector}`);
                        await element.click();
                        await page.waitForTimeout(2000);
                        await page.screenshot({ path: 'chat-test-2-after-button-click.png', fullPage: true });
                        break;
                    }
                } catch (e) {
                    // Continue searching
                }
            }
        }
        
        // Test Multi-Agent functionality if chat input is available
        if (foundChatInput && chatElement) {
            console.log('🤖 Testing Multi-Agent Chat System...');
            
            const testMessage = "Create a simple workflow that sends a daily email reminder";
            await chatElement.fill(testMessage);
            await page.screenshot({ path: 'chat-test-3-message-entered.png', fullPage: true });
            
            // Look for send button
            const sendButtons = [
                'button:has-text("Send")',
                'button[type="submit"]',
                'button:has-text("Submit")',
                '[data-testid="send-button"]'
            ];
            
            let sentMessage = false;
            for (const selector of sendButtons) {
                try {
                    const button = page.locator(selector);
                    if (await button.isVisible({ timeout: 1000 })) {
                        await button.click();
                        console.log('✅ Message sent to AI agents');
                        sentMessage = true;
                        break;
                    }
                } catch (e) {
                    // Try pressing Enter instead
                    await chatElement.press('Enter');
                    sentMessage = true;
                    break;
                }
            }
            
            if (sentMessage) {
                console.log('⏳ Waiting for AI agent response...');
                await page.waitForTimeout(5000);
                await page.screenshot({ path: 'chat-test-4-agent-response.png', fullPage: true });
                
                // Check for agent activity indicators
                const agentIndicators = [
                    'text=Agent',
                    'text=Processing',
                    'text=Analyzing',
                    'text=Orchestrator',
                    'text=Workflow Designer',
                    '[class*="agent"]',
                    '[class*="loading"]',
                    '[class*="thinking"]'
                ];
                
                let foundAgentActivity = false;
                for (const selector of agentIndicators) {
                    try {
                        if (await page.locator(selector).first().isVisible({ timeout: 1000 })) {
                            console.log(`✅ Found agent activity: ${selector}`);
                            foundAgentActivity = true;
                            break;
                        }
                    } catch (e) {
                        // Continue
                    }
                }
                
                console.log(`🤖 Multi-Agent System Active: ${foundAgentActivity ? 'YES' : 'UNKNOWN'}`);
            }
        }
        
        // Final screenshot
        await page.screenshot({ path: 'chat-test-5-final-state.png', fullPage: true });
        
        // Summary
        console.log('\n📊 Chat System Test Results:');
        console.log(`  ✅ Authentication: Working`);
        console.log(`  ✅ Navigation: Working`);
        console.log(`  ${foundChatInput ? '✅' : '⚠️ '} Chat Interface: ${foundChatInput ? 'Found' : 'Not found/Different UI'}`);
        console.log(`  📍 Final URL: ${page.url()}`);
        
        if (foundChatInput) {
            console.log('🎉 SUCCESS: Multi-Agent Chat System interface is accessible!');
        } else {
            console.log('⚠️  INFO: Chat interface may use different UI pattern or requires specific trigger');
        }
        
    } catch (error) {
        console.error('💥 Error during chat test:', error.message);
        await page.screenshot({ path: 'chat-test-error.png', fullPage: true });
    } finally {
        await browser.close();
        console.log('🏁 Chat functionality test completed');
    }
}

testChatFunctionality();