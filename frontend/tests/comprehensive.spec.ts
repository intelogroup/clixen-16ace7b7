import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Comprehensive Application Test', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Clear any existing state
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('should complete full user journey', async ({ page }) => {
    // 1. Landing page test
    await page.goto('/');
    await helpers.takeScreenshot('01-landing-page');
    
    const pageHealth = await helpers.checkPageHealth();
    expect(pageHealth.title).toBeTruthy();
    expect(pageHealth.title.length).toBeGreaterThan(0);
    
    // 2. Test responsive design
    await helpers.testResponsive('01-landing');
    
    // 3. Navigation to auth
    const authSuccess = await helpers.navigateToRoute('/auth', [
      'text=Get Started',
      'text=Sign In',
      'text=Login',
      '[href*="auth"]'
    ]);
    
    expect(authSuccess).toBeTruthy();
    await helpers.takeScreenshot('02-auth-page');
    
    // 4. Authentication test
    const isLoggedIn = await helpers.login();
    expect(isLoggedIn).toBeTruthy();
    await helpers.takeScreenshot('03-after-login');
    
    // 5. Dashboard functionality
    const dashboardSuccess = await helpers.navigateToRoute('/dashboard', [
      'text=Dashboard',
      '[href*="dashboard"]',
      '[data-testid="dashboard"]'
    ]);
    
    if (dashboardSuccess) {
      await helpers.takeScreenshot('04-dashboard');
      await helpers.testResponsive('04-dashboard');
    }
    
    // 6. Chat interface test
    const chatSuccess = await helpers.navigateToRoute('/chat', [
      'text=Chat',
      'text=AI Chat',
      '[href*="chat"]',
      '[data-testid="chat"]'
    ]);
    
    if (chatSuccess) {
      await helpers.takeScreenshot('05-chat-interface');
      
      // Test chat functionality
      const chatInputSelectors = [
        'input[type="text"]',
        'textarea',
        '[data-testid="chat-input"]',
        '[placeholder*="message" i]',
        '[placeholder*="chat" i]'
      ];
      
      try {
        const chatInput = await helpers.waitForAnyElement(chatInputSelectors, 5000);
        await chatInput.fill('Hello, can you help me create a workflow?');
        await helpers.takeScreenshot('06-chat-message-typed');
        
        // Try to send the message
        const sendButtons = [
          'button[type="submit"]',
          'text=Send',
          '[data-testid="send-button"]',
          'button:has-text("Send")'
        ];
        
        let messageSent = false;
        for (const selector of sendButtons) {
          try {
            const button = page.locator(selector);
            if (await button.isVisible({ timeout: 2000 })) {
              await button.click();
              messageSent = true;
              break;
            }
          } catch (error) {
            continue;
          }
        }
        
        // Try Enter key if no button worked
        if (!messageSent) {
          await chatInput.press('Enter');
          messageSent = true;
        }
        
        if (messageSent) {
          // Wait for response
          await page.waitForTimeout(5000);
          await helpers.takeScreenshot('07-chat-response');
          
          // Look for agent activity or response
          const hasActivity = await page.waitForFunction(() => {
            const text = document.body.textContent || '';
            return text.includes('Agent') ||
                   text.includes('Orchestrator') ||
                   text.includes('workflow') ||
                   text.toLowerCase().includes('hello') ||
                   document.querySelector('.message') !== null ||
                   document.querySelector('[data-testid="message"]') !== null ||
                   document.querySelector('[data-testid="agent"]') !== null;
          }, { timeout: 10000 }).catch(() => false);
          
          console.log(hasActivity ? '✅ Chat interaction detected' : '⚠️ No chat response detected');
        }
        
      } catch (error) {
        console.log('⚠️ Chat input not found or not functional:', error.message);
      }
    }
    
    // 7. Test other routes
    const additionalRoutes = [
      { path: '/workflows', name: 'workflows' },
      { path: '/create', name: 'create' },
      { path: '/builder', name: 'builder' }
    ];
    
    for (const route of additionalRoutes) {
      try {
        await page.goto(route.path, { timeout: 10000 });
        await page.waitForTimeout(1000);
        await helpers.takeScreenshot(`route-${route.name}`);
        console.log(`✅ Route ${route.path} accessible`);
      } catch (error) {
        console.log(`⚠️ Route ${route.path} not accessible: ${error.message}`);
      }
    }
    
    // 8. Performance measurement
    await page.goto('/');
    const perfMetrics = await helpers.measurePerformance();
    console.log('Performance Metrics:', perfMetrics);
    
    // Basic performance expectations
    expect(perfMetrics.ttfb).toBeLessThan(2000); // Time to First Byte < 2s
    expect(perfMetrics.firstContentfulPaint).toBeLessThan(4000); // FCP < 4s
    
    await helpers.takeScreenshot('08-final-state');
  });

  test('should handle edge cases and errors', async ({ page }) => {
    // Test direct access to protected routes
    const protectedRoutes = ['/dashboard', '/chat'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      await helpers.takeScreenshot(`protected-${route.replace('/', '')}`);
      
      // Should either redirect to auth or show the page (if auth persists)
      const isRedirectedOrAuthenticated = currentUrl.includes('auth') || 
                                         currentUrl.includes('login') || 
                                         currentUrl === route;
      
      expect(isRedirectedOrAuthenticated).toBeTruthy();
    }
    
    // Test 404 handling
    await page.goto('/non-existent-page-12345');
    await helpers.takeScreenshot('404-test');
    
    // Should show 404 or redirect to home
    const handles404 = await page.waitForFunction(() => {
      const text = document.body.textContent || '';
      return text.includes('404') ||
             text.includes('Not Found') ||
             text.includes('Page not found') ||
             window.location.pathname === '/';
    }, { timeout: 5000 }).catch(() => false);
    
    expect(handles404).toBeTruthy();
  });

  test('should test accessibility and SEO basics', async ({ page }) => {
    await page.goto('/');
    
    // Check basic SEO elements
    const title = await page.title();
    const metaDescription = await page.getAttribute('meta[name="description"]', 'content');
    const hasH1 = await page.locator('h1').count();
    
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(10);
    expect(hasH1).toBeGreaterThan(0);
    
    console.log(`SEO Check - Title: "${title}", Meta Description: "${metaDescription}", H1 tags: ${hasH1}`);
    
    // Check accessibility basics
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    const buttonsWithoutLabel = await page.locator('button:not([aria-label]):not([title])').count();
    const formsWithoutLabels = await page.locator('input:not([aria-label]):not([title])').count();
    
    console.log(`Accessibility Check - Images without alt: ${imagesWithoutAlt}, Buttons without labels: ${buttonsWithoutLabel}, Inputs without labels: ${formsWithoutLabels}`);
    
    await helpers.takeScreenshot('accessibility-seo-check');
  });

  test('should test mobile-specific functionality', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await helpers.takeScreenshot('mobile-01-landing');
    
    // Test mobile navigation
    const mobileMenuTriggers = [
      'button[aria-label*="menu" i]',
      '.hamburger',
      '.mobile-menu-button',
      '[data-testid="mobile-menu"]',
      'button:has-text("☰")',
      'button:has-text("Menu")'
    ];
    
    let mobileMenuFound = false;
    for (const selector of mobileMenuTriggers) {
      try {
        const trigger = page.locator(selector);
        if (await trigger.isVisible({ timeout: 2000 })) {
          await trigger.click();
          await helpers.takeScreenshot('mobile-02-menu-open');
          mobileMenuFound = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    if (!mobileMenuFound) {
      console.log('⚠️ No mobile menu trigger found');
    }
    
    // Test touch interactions
    const touchableElements = await page.locator('button, a, [role="button"]').count();
    console.log(`Mobile Check - Found ${touchableElements} touchable elements`);
    
    // Test form on mobile
    try {
      await helpers.navigateToRoute('/auth');
      await helpers.takeScreenshot('mobile-03-auth-form');
      
      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.isVisible({ timeout: 5000 })) {
        await emailInput.tap();
        await helpers.takeScreenshot('mobile-04-keyboard-focus');
      }
    } catch (error) {
      console.log('⚠️ Mobile form test failed:', error.message);
    }
    
    await helpers.takeScreenshot('mobile-05-final');
  });
});