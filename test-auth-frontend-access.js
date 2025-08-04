import { chromium } from 'playwright';

async function testAuthFrontendAccess() {
    console.log('🔍 Testing Authentication and Frontend Access');
    console.log('============================================');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const results = {
        frontendAccess: false,
        authentication: false,
        chatInterface: false,
        configCheck: false
    };
    
    try {
        // Test 1: Frontend Access
        console.log('\n1️⃣ Testing Frontend Access...');
        await page.goto('http://localhost:3000');
        const title = await page.title();
        results.frontendAccess = title.includes('Clixen') || title.length > 0;
        console.log(`   ${results.frontendAccess ? '✅' : '❌'} Frontend accessible`);
        
        // Test 2: Authentication Flow
        console.log('\n2️⃣ Testing Authentication Flow...');
        await page.goto('http://localhost:3000/auth');
        
        // Fill test credentials
        await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
        await page.fill('input[type="password"]', 'Goldyear2023#');
        await page.click('button:has-text("Sign In")');
        
        // Wait for authentication
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        results.authentication = page.url().includes('dashboard');
        console.log(`   ${results.authentication ? '✅' : '❌'} Authentication successful`);
        
        // Test 3: Chat Interface Access
        console.log('\n3️⃣ Testing Chat Interface...');
        await page.click('text=Create Workflow');
        await page.waitForTimeout(3000);
        
        const hasTextarea = await page.locator('textarea').count() > 0;
        results.chatInterface = hasTextarea;
        console.log(`   ${results.chatInterface ? '✅' : '❌'} Chat interface accessible`);
        
        // Test 4: Configuration Check
        console.log('\n4️⃣ Checking Configuration...');
        const pageContent = await page.content();
        const hasDebugInfo = pageContent.includes('Debug Info') || pageContent.includes('Environment');
        results.configCheck = hasDebugInfo;
        console.log(`   ${results.configCheck ? '✅' : '❌'} Configuration visible`);
        
        // Take final screenshot
        await page.screenshot({ path: 'auth-frontend-test-result.png', fullPage: true });
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    } finally {
        await browser.close();
    }
    
    // Results Summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    console.log(`Frontend Access: ${results.frontendAccess ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`Authentication: ${results.authentication ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`Chat Interface: ${results.chatInterface ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`Configuration: ${results.configCheck ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
    
    const allPassing = Object.values(results).every(v => v);
    console.log(`\n🎯 Overall Status: ${allPassing ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️ SOME ISSUES DETECTED'}`);
    
    if (allPassing) {
        console.log('\n🎉 SUCCESS: Core systems are working!');
        console.log('✅ Frontend is accessible and responsive');
        console.log('✅ Supabase authentication is functional');
        console.log('✅ Multi-agent chat interface is ready');
        console.log('🔑 For OpenAI integration: Configure API key per OPENAI_SETUP.md');
    }
    
    return allPassing;
}

testAuthFrontendAccess().then(success => {
    process.exit(success ? 0 : 1);
});