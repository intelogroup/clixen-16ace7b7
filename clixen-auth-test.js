const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testClizenAuthFlow() {
    console.log('Starting Clizen Authentication Flow Test...');
    
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
        const screenshotDir = '/root/clixen-screenshots';
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir);
        }

        console.log('1. Navigating to http://18.221.12.50...');
        await page.goto('http://18.221.12.50', { waitUntil: 'networkidle' });
        
        // Take screenshot of landing page
        await page.screenshot({ 
            path: path.join(screenshotDir, '01-landing-page.png'),
            fullPage: true 
        });
        console.log('✓ Landing page screenshot taken');

        // Get page title and URL
        const title = await page.title();
        const url = page.url();
        console.log(`Page title: ${title}`);
        console.log(`Current URL: ${url}`);

        // Look for authentication-related elements
        console.log('2. Looking for signup/register elements...');
        
        // Check for common auth button selectors
        const authSelectors = [
            'button:has-text("Sign Up")',
            'button:has-text("Register")',
            'button:has-text("Get Started")',
            'a:has-text("Sign Up")',
            'a:has-text("Register")',
            'a:has-text("Get Started")',
            '[data-testid="signup"]',
            '[data-testid="register"]',
            '.signup-btn',
            '.register-btn',
            '#signup',
            '#register'
        ];

        let authElement = null;
        for (const selector of authSelectors) {
            try {
                const element = await page.locator(selector).first();
                if (await element.isVisible()) {
                    authElement = element;
                    console.log(`✓ Found auth element with selector: ${selector}`);
                    break;
                }
            } catch (error) {
                // Continue to next selector
            }
        }

        // Also check for login forms or email inputs that might indicate auth flow
        const emailInputs = await page.locator('input[type="email"]').count();
        const passwordInputs = await page.locator('input[type="password"]').count();
        
        console.log(`Email inputs found: ${emailInputs}`);
        console.log(`Password inputs found: ${passwordInputs}`);

        // Check for any forms
        const forms = await page.locator('form').count();
        console.log(`Forms found: ${forms}`);

        // If we found auth elements, try to interact with them
        if (authElement) {
            console.log('3. Clicking signup/register button...');
            await authElement.click();
            await page.waitForTimeout(2000); // Wait for navigation or modal
            
            await page.screenshot({ 
                path: path.join(screenshotDir, '02-after-signup-click.png'),
                fullPage: true 
            });
            console.log('✓ Screenshot after clicking signup button');
        } else if (emailInputs > 0 && passwordInputs > 0) {
            console.log('3. Found email/password inputs, attempting direct signup...');
            
            // Try to fill in the signup form
            const emailInput = page.locator('input[type="email"]').first();
            const passwordInput = page.locator('input[type="password"]').first();
            
            await emailInput.fill('jayveedz19@gmail.com');
            await passwordInput.fill('Jimkali90#');
            
            await page.screenshot({ 
                path: path.join(screenshotDir, '03-form-filled.png'),
                fullPage: true 
            });
            console.log('✓ Filled signup form');
            
            // Look for submit button
            const submitSelectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:has-text("Sign Up")',
                'button:has-text("Register")',
                'button:has-text("Submit")',
                'button:has-text("Create Account")'
            ];
            
            let submitButton = null;
            for (const selector of submitSelectors) {
                try {
                    const element = await page.locator(selector).first();
                    if (await element.isVisible()) {
                        submitButton = element;
                        console.log(`✓ Found submit button with selector: ${selector}`);
                        break;
                    }
                } catch (error) {
                    // Continue to next selector
                }
            }
            
            if (submitButton) {
                console.log('4. Submitting signup form...');
                await submitButton.click();
                await page.waitForTimeout(3000); // Wait for response
                
                await page.screenshot({ 
                    path: path.join(screenshotDir, '04-after-submit.png'),
                    fullPage: true 
                });
                console.log('✓ Screenshot after form submission');
            }
        } else {
            console.log('3. No obvious auth elements found. Taking screenshot of current state...');
            await page.screenshot({ 
                path: path.join(screenshotDir, '02-no-auth-elements.png'),
                fullPage: true 
            });
        }

        // Check for any error messages or success messages
        console.log('5. Checking for validation messages...');
        
        const messageSelectors = [
            '.error',
            '.success',
            '.alert',
            '.notification',
            '[role="alert"]',
            '.toast',
            '.message'
        ];
        
        for (const selector of messageSelectors) {
            try {
                const elements = await page.locator(selector).all();
                for (const element of elements) {
                    if (await element.isVisible()) {
                        const text = await element.textContent();
                        console.log(`Message found (${selector}): ${text}`);
                    }
                }
            } catch (error) {
                // Continue to next selector
            }
        }

        // Check for email verification related content
        console.log('6. Checking for email verification requirements...');
        const emailVerificationTexts = [
            'verify',
            'verification',
            'check your email',
            'confirmation email',
            'activate your account'
        ];
        
        const pageContent = await page.textContent('body');
        for (const text of emailVerificationTexts) {
            if (pageContent.toLowerCase().includes(text)) {
                console.log(`✓ Email verification step detected: Contains "${text}"`);
            }
        }

        // Take final screenshot
        await page.screenshot({ 
            path: path.join(screenshotDir, '05-final-state.png'),
            fullPage: true 
        });
        console.log('✓ Final screenshot taken');

        // Get final page info
        const finalTitle = await page.title();
        const finalUrl = page.url();
        console.log(`Final page title: ${finalTitle}`);
        console.log(`Final URL: ${finalUrl}`);

        console.log('\n=== Test Summary ===');
        console.log(`Screenshots saved to: ${screenshotDir}`);
        console.log(`Total screenshots: ${fs.readdirSync(screenshotDir).length}`);
        
    } catch (error) {
        console.error('Error during test:', error);
        await page.screenshot({ 
            path: '/root/clixen-screenshots/error-state.png',
            fullPage: true 
        });
    } finally {
        await browser.close();
        console.log('Browser closed successfully');
    }
}

// Run the test
testClizenAuthFlow().catch(console.error);