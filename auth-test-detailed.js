const { chromium } = require('playwright');

async function testAuthDetailed() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Capture console messages
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
    
    // Capture network errors
    const networkErrors = [];
    page.on('response', response => {
        if (!response.ok()) {
            networkErrors.push(`${response.status()} ${response.url()}`);
        }
    });
    
    try {
        await page.goto('http://18.221.12.50/auth');
        await page.waitForLoadState('networkidle');
        
        console.log('✓ Auth page loaded');
        
        // Fill the form
        await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
        await page.fill('input[type="password"]', 'Jimkali90#');
        console.log('✓ Form filled');
        
        // Submit and wait for network activity
        await Promise.all([
            page.waitForResponse(response => response.url().includes('supabase') || response.url().includes('auth'), {timeout: 10000}).catch(() => null),
            page.click('button[type="submit"], button:has-text("Sign")')
        ]);
        
        await page.waitForTimeout(3000);
        
        console.log('Final URL:', page.url());
        console.log('\nConsole messages:');
        consoleMessages.forEach(msg => console.log(' ', msg));
        
        console.log('\nNetwork errors:');
        networkErrors.forEach(err => console.log(' ', err));
        
        // Check if authenticated by looking for user data or redirects
        const localStorage = await page.evaluate(() => {
            const items = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                items[key] = localStorage.getItem(key);
            }
            return items;
        });
        
        console.log('\nLocalStorage keys:', Object.keys(localStorage));
        
        // Check for Supabase session
        const supabaseSession = Object.keys(localStorage).find(key => key.includes('supabase'));
        if (supabaseSession) {
            console.log('✅ Supabase session found in localStorage');
            try {
                const sessionData = JSON.parse(localStorage[supabaseSession]);
                console.log('Session user:', sessionData.user?.email || 'No user data');
            } catch (e) {
                console.log('Session data found but could not parse');
            }
        } else {
            console.log('❌ No Supabase session found in localStorage');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
}

testAuthDetailed();