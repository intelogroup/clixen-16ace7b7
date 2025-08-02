const { chromium } = require('playwright');

async function testFinalAuthProduction() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    let authSuccessful = false;
    let errorFound = false;
    let supabaseUrl = '';
    
    page.on('request', request => {
        if (request.url().includes('supabase')) {
            supabaseUrl = request.url();
            console.log('📡 API Request:', request.url().split('?')[0]);
        }
    });
    
    page.on('response', response => {
        if (response.url().includes('supabase')) {
            console.log('✅ API Response:', response.status(), response.url().split('?')[0]);
            if (response.status() === 200 && response.url().includes('/token')) {
                authSuccessful = true;
            }
        }
    });
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errorFound = true;
            console.log('❌ Error:', msg.text());
        }
    });
    
    try {
        console.log('🚀 Final authentication test with cache busting...');
        await page.goto('http://18.221.12.50/auth', { waitUntil: 'networkidle' });
        
        await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
        await page.fill('input[type="password"]', 'Jimkali90#');
        await page.click('button[type="submit"]');
        
        await page.waitForTimeout(5000);
        
        const sessionData = await page.evaluate(() => {
            const keys = Object.keys(localStorage);
            const session = keys.find(k => k.includes('supabase'));
            if (session) {
                try {
                    const data = JSON.parse(localStorage[session]);
                    return { 
                        found: true, 
                        hasUser: Boolean(data.user), 
                        email: data.user ? data.user.email : null 
                    };
                } catch { 
                    return { found: true, error: true }; 
                }
            }
            return { found: false };
        });
        
        console.log('\n🎯 FINAL RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('API URL called:', supabaseUrl.split('?')[0]);
        console.log('Authentication successful:', authSuccessful);
        console.log('Session found:', sessionData.found);
        console.log('User authenticated:', sessionData.hasUser);
        console.log('User email:', sessionData.email);
        console.log('Current URL:', page.url());
        
        if (authSuccessful && sessionData.found && sessionData.hasUser) {
            console.log('\n🎉 ✅ SUCCESS! Authentication is fully working!');
            console.log('👤 User successfully authenticated:', sessionData.email);
            console.log('🔐 Credentials verified: jayveedz19@gmail.com / Jimkali90#');
        } else if (supabaseUrl.includes('zfbgdixbzezpxllkoyfc')) {
            console.log('\n✅ Correct Supabase URL being used');
            if (authSuccessful) {
                console.log('✅ API authentication successful');
            } else {
                console.log('⚠️ Authentication incomplete - check session handling');
            }
        } else if (supabaseUrl.includes('your-project')) {
            console.log('\n❌ Still using placeholder URL - cache issue persists');
        } else {
            console.log('\n⚠️ Unexpected authentication state');
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testFinalAuthProduction();