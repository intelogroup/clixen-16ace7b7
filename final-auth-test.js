const { chromium } = require('playwright');

async function finalAuthTest() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    
    // Monitor authentication
    let authSuccess = false;
    let authError = null;
    
    page.on('request', request => {
        if (request.url().includes('zfbgdixbzezpxllkoyfc.supabase.co')) {
            console.log('✓ Supabase request to:', request.url().split('?')[0]);
        }
    });
    
    page.on('response', response => {
        if (response.url().includes('zfbgdixbzezpxllkoyfc.supabase.co')) {
            console.log('✓ Supabase response:', response.status(), response.url().split('?')[0]);
            if (response.status() === 200) {
                authSuccess = true;
            }
        }
    });
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            authError = msg.text();
        }
    });
    
    try {
        console.log('Testing final authentication flow...');
        await page.goto('http://18.221.12.50/auth', { waitUntil: 'networkidle' });
        
        // Fill and submit form
        await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
        await page.fill('input[type="password"]', 'Jimkali90#');
        await page.click('button[type="submit"], button:has-text("Sign")');
        
        // Wait for authentication
        await page.waitForTimeout(5000);
        
        console.log('\nResults:');
        console.log('Auth Success:', authSuccess);
        console.log('Final URL:', page.url());
        console.log('Auth Error:', authError || 'None');
        
        // Check for session in localStorage
        const localStorage = await page.evaluate(() => {
            const session = localStorage.getItem('sb-zfbgdixbzezpxllkoyfc-auth-token');
            return session ? 'Session found' : 'No session';
        });
        console.log('Local Storage Session:', localStorage);
        
        // Check if redirected to dashboard/protected area
        if (page.url().includes('/dashboard') || page.url().includes('/chat')) {
            console.log('✅ Successfully authenticated and redirected!');
        } else if (authSuccess && !authError) {
            console.log('✅ Authentication successful, staying on auth page (expected)');
        } else {
            console.log('❌ Authentication may have failed');
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

finalAuthTest();