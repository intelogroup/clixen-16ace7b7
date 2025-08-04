import { chromium } from 'playwright';

async function testNewChatInterface() {
    console.log('🤖 Testing the new working chat interface...');
    
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
        console.log('🧭 Navigating to chat interface...');
        await page.click('text=Create Workflow');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        // Take screenshot of initial state
        await page.screenshot({ path: 'new-interface-1-initial.png', fullPage: true });
        
        // Look for the new textarea interface
        const textareaSelectors = [
            'textarea[placeholder*="workflow"]',
            'textarea[placeholder*="Describe"]',
            'textarea',
            '[contenteditable="true"]'
        ];
        
        let textareaElement = null;
        let foundTextarea = false;
        
        for (const selector of textareaSelectors) {
            try {
                const element = page.locator(selector).first();
                if (await element.isVisible({ timeout: 2000 })) {
                    console.log(`✅ Found textarea: ${selector}`);
                    textareaElement = element;
                    foundTextarea = true;
                    break;
                }
            } catch (e) {
                // Continue searching
            }
        }
        
        if (foundTextarea && textareaElement) {
            console.log('🤖 Testing Multi-Agent Chat functionality...');
            
            // Test a workflow request
            const testMessage = "Create a simple automation that sends a daily email reminder to users about pending tasks";
            await textareaElement.fill(testMessage);
            
            await page.screenshot({ path: 'new-interface-2-message-entered.png', fullPage: true });
            
            // Send the message (try Enter or look for send button)
            console.log('📤 Sending message...');
            await textareaElement.press('Enter');
            
            // Wait for response
            console.log('⏳ Waiting for AI agent response...');
            await page.waitForTimeout(8000);
            
            await page.screenshot({ path: 'new-interface-3-after-response.png', fullPage: true });
            
            // Check for any response content
            const responseElements = await page.locator('div, p, span').allTextContents();
            const hasResponse = responseElements.some(text => 
                text && text.length > 50 && 
                (text.includes('workflow') || text.includes('automation') || text.includes('email'))
            );
            
            console.log(`💬 Found AI response: ${hasResponse}`);
            
            // Look for any loading or processing indicators
            const loadingElements = await page.locator('[class*="loading"], [class*="processing"], [class*="thinking"]').count();
            console.log(`⏳ Found ${loadingElements} loading indicators`);
            
            return foundTextarea;
            
        } else {
            console.log('⚠️  New textarea interface not found');
            
            // Try the old input interface
            const inputElement = page.locator('input[placeholder*="message"]').first();
            const inputExists = await inputElement.isVisible().catch(() => false);
            
            if (inputExists) {
                console.log('🔄 Falling back to old input interface...');
                const isEnabled = await inputElement.isEnabled().catch(() => false);
                console.log(`💬 Old input enabled: ${isEnabled}`);
                
                return isEnabled;
            }
            
            return false;
        }
        
    } catch (error) {
        console.error('💥 Error:', error.message);
        await page.screenshot({ path: 'new-interface-error.png', fullPage: true });
        return false;
    } finally {
        await browser.close();
    }
}

testNewChatInterface().then(success => {
    if (success) {
        console.log('🎉 SUCCESS: New chat interface is working!');
    } else {
        console.log('⚠️  Chat interface needs more investigation');
    }
});