const { chromium } = require('playwright');

async function testProductionAuth() {
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--disable-http-cache', '--disable-blink-features=AutomationControlled', '--no-first-run']
    });
    
    const context = await browser.newContext({
        bypassCSP: true,
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
    
    const page = await context.newPage();
    
    // Monitor all network activity
    let supabaseRequests = [];
    let authSuccess = false;
    
    page.on('request', request => {
        if (request.url().includes('supabase.co')) {
            supabaseRequests.push({
                url: request.url(),
                method: request.method()
            });
            console.log('🌐 Request:', request.method(), request.url().split('?')[0]);
        }
    });
    
    page.on('response', response => {
        if (response.url().includes('supabase.co')) {
            console.log('📡 Response:', response.status(), response.url().split('?')[0]);
            if (response.status() === 200 && response.url().includes('token')) {
                authSuccess = true;
                console.log('✅ Authentication API call successful!');
            }
        }
    });
    
    page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('fetch')) {
            console.log('❌ Browser error:', msg.text());
        }
    });
    
    try {
        console.log('🚀 Testing production authentication at http://18.221.12.50');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Navigate with cache bypass
        await page.goto('http://18.221.12.50/auth', { 
            waitUntil: 'networkidle',
            timeout: 30000
        });
        
        console.log('📄 Auth page loaded successfully');
        
        // Fill authentication form
        await page.fill('input[type="email"]', 'jayveedz19@gmail.com');
        await page.fill('input[type="password"]', 'Jimkali90#');
        
        console.log('📝 Form filled with credentials');
        
        // Submit form
        await page.click('button[type="submit"]');
        console.log('🔄 Form submitted, waiting for response...');
        
        // Wait for authentication response
        await page.waitForTimeout(8000);
        
        // Check final state
        const finalUrl = page.url();
        const localStorage = await page.evaluate(() => {
            const keys = Object.keys(localStorage);
            const supabaseKey = keys.find(k => k.includes('supabase'));
            if (supabaseKey) {
                try {
                    const data = JSON.parse(localStorage[supabaseKey]);
                    return {
                        found: true,
                        hasUser: Boolean(data.user),
                        userEmail: data.user ? data.user.email : null,
                        hasAccessToken: Boolean(data.access_token)
                    };
                } catch (e) {
                    return { found: true, error: 'Cannot parse session data' };
                }
            }
            return { found: false };
        });
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 FINAL RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🌐 Supabase API Calls:', supabaseRequests.length);
        console.log('✅ Authentication Success:', authSuccess);
        console.log('📍 Final URL:', finalUrl);
        console.log('💾 Session Data:', JSON.stringify(localStorage, null, 2));
        
        if (authSuccess && localStorage.found && localStorage.hasUser) {
            console.log('');
            console.log('🎉 SUCCESS! Authentication is now fully working!');
            console.log('👤 User authenticated:', localStorage.userEmail);
            console.log('🔑 Access token present:', localStorage.hasAccessToken);
        } else if (authSuccess) {
            console.log('');
            console.log('✅ Authentication API working, but session storage needs checking');
        } else if (supabaseRequests.length > 0) {
            console.log('');
            console.log('⚠️ Supabase API contacted but authentication not completed');
            console.log('🔍 Check for any error responses or CORS issues');
        } else {
            console.log('');
            console.log('❌ No Supabase API calls detected - configuration issue persists');
        }
        
    } catch (error) {
        console.error('🚨 Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testProductionAuth();