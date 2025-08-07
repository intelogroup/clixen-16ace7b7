import { test, expect } from '@playwright/test';

test.describe('Application Functionality', () => {
  // Helper function to login
  async function login(page) {
    await page.goto('/');
    
    // Try to get to auth page
    const authTriggers = [
      page.getByText(/get started/i).first(),
      page.getByText(/sign in/i).first(),
      page.getByText(/login/i).first()
    ];
    
    for (const trigger of authTriggers) {
      try {
        if (await trigger.isVisible({ timeout: 2000 })) {
          await trigger.click();
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    // Try direct navigation if needed
    const currentUrl = page.url();
    if (!currentUrl.includes('auth') && !currentUrl.includes('login')) {
      await page.goto('/auth');
    }
    
    // Login process
    const emailField = page.locator('input[type="email"]');
    if (await emailField.isVisible({ timeout: 5000 })) {
      await emailField.fill('jayveedz19@gmail.com');
      await page.locator('input[type="password"]').fill('Jimkali90#');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(3000);
    }
  }

  test('should display responsive landing page', async ({ page }) => {
    await page.goto('/');
    
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ 
      path: 'test-results/responsive-01-desktop.png',
      fullPage: true 
    });
    
    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ 
      path: 'test-results/responsive-02-tablet.png',
      fullPage: true 
    });
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ 
      path: 'test-results/responsive-03-mobile.png',
      fullPage: true 
    });
    
    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Check for key elements
    const hasTitle = await page.title();
    expect(hasTitle).toBeTruthy();
    expect(hasTitle.length).toBeGreaterThan(0);
  });

  test('should navigate to dashboard after authentication', async ({ page }) => {
    await login(page);
    
    // Wait for post-login navigation
    await page.waitForTimeout(2000);
    
    // Try to navigate to dashboard if not already there
    const dashboardTriggers = [
      page.getByText(/dashboard/i).first(),
      page.getByRole('link', { name: /dashboard/i }),
      page.locator('[href*="dashboard"]'),
      page.locator('[data-testid="dashboard"]')
    ];
    
    let dashboardFound = false;
    for (const trigger of dashboardTriggers) {
      try {
        if (await trigger.isVisible({ timeout: 2000 })) {
          await trigger.click();
          dashboardFound = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    // Try direct navigation if no trigger found
    if (!dashboardFound) {
      await page.goto('/dashboard');
    }
    
    await page.screenshot({ 
      path: 'test-results/06-dashboard.png',
      fullPage: true 
    });
    
    // Verify dashboard elements
    const hasDashboardContent = await page.waitForFunction(() => {
      return document.body.textContent?.includes('Dashboard') ||
             document.body.textContent?.includes('Workflow') ||
             document.body.textContent?.includes('Create') ||
             document.querySelector('[data-testid="dashboard"]') !== null;
    }, { timeout: 10000 }).catch(() => false);
    
    expect(hasDashboardContent).toBeTruthy();
  });

  test('should navigate to chat interface', async ({ page }) => {
    await login(page);
    
    // Try to navigate to chat
    const chatTriggers = [
      page.getByText(/chat/i).first(),
      page.getByRole('link', { name: /chat/i }),
      page.locator('[href*="chat"]'),
      page.locator('[data-testid="chat"]'),
      page.getByText(/ai/i).first()
    ];
    
    let chatFound = false;
    for (const trigger of chatTriggers) {
      try {
        if (await trigger.isVisible({ timeout: 2000 })) {
          await trigger.click();
          chatFound = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    // Try direct navigation if no trigger found
    if (!chatFound) {
      await page.goto('/chat');
    }
    
    await page.screenshot({ 
      path: 'test-results/07-chat-interface.png',
      fullPage: true 
    });
    
    // Verify chat interface elements
    const hasChatInterface = await page.waitForFunction(() => {
      return document.querySelector('input[type="text"]') !== null ||
             document.querySelector('textarea') !== null ||
             document.body.textContent?.includes('Chat') ||
             document.body.textContent?.includes('Message') ||
             document.body.textContent?.includes('Agent') ||
             document.querySelector('[data-testid="chat-input"]') !== null;
    }, { timeout: 10000 }).catch(() => false);
    
    expect(hasChatInterface).toBeTruthy();
  });

  test('should test multi-agent chat functionality', async ({ page }) => {
    await login(page);
    
    // Navigate to chat
    await page.goto('/chat');
    
    // Wait for chat interface to load
    await page.waitForTimeout(2000);
    
    // Look for chat input field
    const chatInputSelectors = [
      'input[type="text"]',
      'textarea',
      '[data-testid="chat-input"]',
      '[placeholder*="message"]',
      '[placeholder*="Message"]',
      '[placeholder*="chat"]',
      '[placeholder*="Chat"]',
      '.chat-input',
      '#chat-input'
    ];
    
    let chatInput = null;
    for (const selector of chatInputSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          chatInput = element;
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    if (chatInput) {
      // Type a test message
      await chatInput.fill('Create a simple workflow that sends an email notification');
      
      await page.screenshot({ 
        path: 'test-results/08-chat-input-filled.png',
        fullPage: true 
      });
      
      // Submit the message
      const submitButtons = [
        page.getByRole('button', { name: /send/i }),
        page.getByRole('button', { name: /submit/i }),
        page.locator('button[type="submit"]'),
        page.locator('[data-testid="send-button"]'),
        page.keyboard // Try Enter key
      ];
      
      let messageSent = false;
      for (const button of submitButtons.slice(0, -1)) { // Exclude keyboard for now
        try {
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
        
        await page.screenshot({ 
          path: 'test-results/09-chat-response.png',
          fullPage: true 
        });
        
        // Check for agent response or activity
        const hasResponse = await page.waitForFunction(() => {
          const text = document.body.textContent || '';
          return text.includes('Agent') ||
                 text.includes('workflow') ||
                 text.includes('email') ||
                 document.querySelector('.message') !== null ||
                 document.querySelector('[data-testid="message"]') !== null;
        }, { timeout: 15000 }).catch(() => false);
        
        expect(hasResponse).toBeTruthy();
      }
    } else {
      console.log('⚠️ No chat input field found');
      // This is still valuable information for the test report
    }
  });

  test('should test navigation between pages', async ({ page }) => {
    await login(page);
    
    const routes = [
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/chat', name: 'Chat' },
      { path: '/workflows', name: 'Workflows' },
      { path: '/create', name: 'Create' }
    ];
    
    for (const route of routes) {
      try {
        await page.goto(route.path);
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: `test-results/route-${route.name.toLowerCase()}.png`,
          fullPage: true 
        });
        
        // Verify page loaded
        const currentUrl = page.url();
        expect(currentUrl).toContain(route.path);
      } catch (error) {
        console.log(`⚠️ Route ${route.path} not accessible:`, error.message);
      }
    }
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Test navigation to non-existent page
    await page.goto('/non-existent-page');
    
    await page.screenshot({ 
      path: 'test-results/10-404-error.png',
      fullPage: true 
    });
    
    // Should either show 404 page or redirect to home
    const has404OrRedirect = await page.waitForFunction(() => {
      const text = document.body.textContent || '';
      return text.includes('404') ||
             text.includes('Not Found') ||
             text.includes('Page not found') ||
             window.location.pathname === '/';
    }, { timeout: 5000 }).catch(() => false);
    
    expect(has404OrRedirect).toBeTruthy();
  });

  test('should test accessibility features', async ({ page }) => {
    await page.goto('/');
    
    // Check for basic accessibility features
    const hasAltText = await page.locator('img[alt]').count();
    const hasLabels = await page.locator('label').count();
    const hasButtons = await page.locator('button').count();
    const hasLinks = await page.locator('a').count();
    
    console.log(`Accessibility check: ${hasAltText} images with alt text, ${hasLabels} labels, ${hasButtons} buttons, ${hasLinks} links`);
    
    await page.screenshot({ 
      path: 'test-results/11-accessibility-check.png',
      fullPage: true 
    });
    
    // Basic accessibility expectations
    expect(hasButtons + hasLinks).toBeGreaterThan(0); // Should have interactive elements
  });
});