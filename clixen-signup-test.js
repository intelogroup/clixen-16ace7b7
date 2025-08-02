const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testClizenSignupFlow() {
    console.log('Starting Clizen Signup Flow Test...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    try {
        // Create screenshots directory
        const screenshotDir = '/root/clixen-signup-screenshots';
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir);
        }

        console.log('Step 1: Navigate to application...');
        await page.goto('http://18.221.12.50', { waitUntil: 'networkidle' });
        
        console.log('Step 2: Click Get Started button...');
        await page.click('a:has-text("Get Started")');
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
            path: path.join(screenshotDir, '01-auth-page.png'),
            fullPage: true 
        });
        console.log('✓ Auth page screenshot taken');

        console.log('Step 3: Click Sign up link...');
        // Look for the signup link
        const signupLink = page.locator('text=Don\'t have an account? Sign up');
        if (await signupLink.isVisible()) {
            await signupLink.click();
            await page.waitForTimeout(2000);
            
            await page.screenshot({ 
                path: path.join(screenshotDir, '02-signup-page.png'),
                fullPage: true 
            });
            console.log('✓ Signup page screenshot taken');
            
            // Check current URL
            const currentUrl = page.url();
            console.log(`Current URL after clicking signup: ${currentUrl}`);
            
            console.log('Step 4: Fill signup form...');
            
            // Look for email and password fields
            const emailField = page.locator('input[type="email"]').first();
            const passwordField = page.locator('input[type="password"]').first();
            
            if (await emailField.isVisible() && await passwordField.isVisible()) {
                // Fill the form
                await emailField.fill('jayveedz19@gmail.com');
                await passwordField.fill('Jimkali90#');
                
                await page.screenshot({ 
                    path: path.join(screenshotDir, '03-form-filled.png'),
                    fullPage: true 
                });
                console.log('✓ Form filled with credentials');
                
                console.log('Step 5: Submit signup form...');
                
                // Look for submit/signup button
                const submitSelectors = [
                    'button:has-text("Sign Up")',
                    'button:has-text("Create Account")', 
                    'button:has-text("Register")',
                    'button[type="submit"]',
                    'input[type="submit"]'
                ];
                
                let submitButton = null;
                for (const selector of submitSelectors) {
                    try {
                        const element = page.locator(selector).first();
                        if (await element.isVisible()) {
                            submitButton = element;
                            console.log(`✓ Found submit button: ${selector}`);
                            break;
                        }
                    } catch (e) {
                        // Continue to next selector
                    }
                }
                
                if (submitButton) {
                    await submitButton.click();
                    await page.waitForTimeout(3000);
                    
                    await page.screenshot({ 
                        path: path.join(screenshotDir, '04-after-submit.png'),
                        fullPage: true 
                    });
                    console.log('✓ Form submitted');
                    
                    // Check for success/error messages
                    const finalUrl = page.url();
                    console.log(`URL after submission: ${finalUrl}`);
                    
                    console.log('Step 6: Check for validation messages...');
                    
                    // Check for various message types
                    const messageSelectors = [
                        '.error', '.alert-error', '[role="alert"]',
                        '.success', '.alert-success', 
                        '.notification', '.toast', '.message',
                        'div:has-text("error")', 'div:has-text("success")',
                        'div:has-text("verify")', 'div:has-text("confirmation")'
                    ];
                    
                    const messages = [];
                    for (const selector of messageSelectors) {
                        try {
                            const elements = await page.locator(selector).all();
                            for (const element of elements) {
                                if (await element.isVisible()) {
                                    const text = await element.textContent();
                                    if (text && text.trim()) {
                                        messages.push({
                                            selector: selector,
                                            text: text.trim()
                                        });
                                    }
                                }
                            }
                        } catch (e) {
                            // Continue to next selector
                        }
                    }
                    
                    if (messages.length > 0) {
                        console.log('✓ Messages found:');
                        messages.forEach(msg => {
                            console.log(`  - ${msg.selector}: ${msg.text}`);
                        });
                    } else {
                        console.log('No validation messages found');
                    }
                    
                    console.log('Step 7: Check for email verification...');
                    
                    const pageContent = await page.textContent('body');
                    const emailVerificationKeywords = [
                        'verify your email',
                        'check your email', 
                        'confirmation email',
                        'verification link',
                        'activate your account',
                        'email sent'
                    ];
                    
                    const foundKeywords = [];
                    for (const keyword of emailVerificationKeywords) {
                        if (pageContent.toLowerCase().includes(keyword.toLowerCase())) {
                            foundKeywords.push(keyword);
                        }
                    }
                    
                    if (foundKeywords.length > 0) {
                        console.log('✓ Email verification keywords found:', foundKeywords);
                    } else {
                        console.log('No email verification keywords detected');
                    }
                    
                } else {
                    console.log('❌ No submit button found');
                }
                
            } else {
                console.log('❌ Email or password fields not found on signup page');
                await page.screenshot({ 
                    path: path.join(screenshotDir, '03-no-form-fields.png'),
                    fullPage: true 
                });
            }
            
        } else {
            console.log('❌ Sign up link not found');
        }

        // Take final screenshot
        await page.screenshot({ 
            path: path.join(screenshotDir, '05-final-state.png'),
            fullPage: true 
        });
        console.log('✓ Final screenshot taken');

        // Get all text content for analysis
        const allText = await page.textContent('body');
        console.log('\n=== Page Content Analysis ===');
        
        // Check for common auth-related text
        const authKeywords = [
            'sign up', 'register', 'create account', 'welcome', 
            'already have account', 'login', 'password', 'email verification',
            'terms of service', 'privacy policy', 'dashboard', 'profile'
        ];
        
        console.log('Auth-related content found:');
        authKeywords.forEach(keyword => {
            if (allText.toLowerCase().includes(keyword.toLowerCase())) {
                console.log(`✓ Contains: "${keyword}"`);
            }
        });

        console.log('\n=== Test Summary ===');
        console.log(`Screenshots saved to: ${screenshotDir}`);
        console.log(`Total screenshots: ${fs.readdirSync(screenshotDir).length}`);
        console.log(`Final URL: ${page.url()}`);
        console.log(`Final page title: ${await page.title()}`);
        
    } catch (error) {
        console.error('Error during test:', error);
        await page.screenshot({ 
            path: '/root/clixen-signup-screenshots/error-state.png',
            fullPage: true 
        });
    } finally {
        await browser.close();
        console.log('Browser closed successfully');
    }
}

// Run the test
testClizenSignupFlow().catch(console.error);