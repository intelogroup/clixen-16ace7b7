import { Page, expect } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Helper function to login with the provided credentials
   */
  async login(email = 'jayveedz19@gmail.com', password = 'Jimkali90#') {
    await this.page.goto('/');
    
    // Try to get to auth page
    const authTriggers = [
      this.page.getByText(/get started/i).first(),
      this.page.getByText(/sign in/i).first(),
      this.page.getByText(/login/i).first(),
      this.page.getByRole('button', { name: /get started/i }),
      this.page.getByRole('button', { name: /sign in/i }),
      this.page.getByRole('link', { name: /get started/i })
    ];
    
    let authClicked = false;
    for (const trigger of authTriggers) {
      try {
        if (await trigger.isVisible({ timeout: 2000 })) {
          await trigger.click();
          authClicked = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    // Try direct navigation if no trigger worked
    if (!authClicked) {
      await this.page.goto('/auth');
    }
    
    // Wait for auth form
    const emailField = this.page.locator('input[type="email"]');
    await expect(emailField).toBeVisible({ timeout: 10000 });
    
    // Fill credentials
    await emailField.fill(email);
    await this.page.locator('input[type="password"]').fill(password);
    
    // Submit form
    await this.page.locator('button[type="submit"]').first().click();
    
    // Wait for navigation
    await this.page.waitForTimeout(3000);
    
    return this.isAuthenticated();
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await this.page.waitForFunction(() => {
      return window.location.pathname.includes('dashboard') || 
             window.location.pathname.includes('chat') ||
             document.querySelector('[data-testid="authenticated"]') !== null ||
             document.querySelector('.dashboard') !== null ||
             document.body.textContent?.includes('Dashboard') ||
             document.body.textContent?.includes('Welcome');
    }, { timeout: 10000 }).catch(() => false);
  }

  /**
   * Take a screenshot with timestamp
   */
  async takeScreenshot(name: string, fullPage = true) {
    const timestamp = Date.now();
    await this.page.screenshot({ 
      path: `test-results/${timestamp}-${name}.png`,
      fullPage 
    });
  }

  /**
   * Wait for element to be visible with multiple selectors
   */
  async waitForAnyElement(selectors: string[], timeout = 10000) {
    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector);
        if (await element.isVisible({ timeout: 1000 })) {
          return element;
        }
      } catch (error) {
        continue;
      }
    }
    throw new Error(`None of the selectors were found: ${selectors.join(', ')}`);
  }

  /**
   * Navigate to a route with fallback options
   */
  async navigateToRoute(route: string, fallbackSelectors: string[] = []) {
    // Try direct navigation first
    try {
      await this.page.goto(route);
      await this.page.waitForLoadState('networkidle');
      return true;
    } catch (error) {
      console.log(`Direct navigation to ${route} failed, trying UI navigation`);
    }

    // Try UI navigation
    for (const selector of fallbackSelectors) {
      try {
        const element = this.page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          await this.page.waitForTimeout(1000);
          return true;
        }
      } catch (error) {
        continue;
      }
    }

    return false;
  }

  /**
   * Check page health and capture basic info
   */
  async checkPageHealth() {
    const url = this.page.url();
    const title = await this.page.title();
    
    // Check for JavaScript errors
    const errors = [];
    this.page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Check for failed network requests
    const failedRequests = [];
    this.page.on('response', response => {
      if (!response.ok()) {
        failedRequests.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    return {
      url,
      title,
      errors,
      failedRequests
    };
  }

  /**
   * Test responsive design across viewports
   */
  async testResponsive(baseScreenshotName: string) {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1366, height: 768, name: 'laptop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
      await this.page.waitForTimeout(500); // Allow layout to settle
      
      await this.page.screenshot({ 
        path: `test-results/${baseScreenshotName}-${viewport.name}.png`,
        fullPage: true 
      });
    }

    // Reset to desktop
    await this.page.setViewportSize({ width: 1920, height: 1080 });
  }

  /**
   * Test form filling with validation
   */
  async fillForm(formData: Record<string, string>, submitSelector?: string) {
    for (const [fieldName, value] of Object.entries(formData)) {
      const fieldSelectors = [
        `input[name="${fieldName}"]`,
        `input[id="${fieldName}"]`,
        `input[type="${fieldName}"]`,
        `textarea[name="${fieldName}"]`,
        `select[name="${fieldName}"]`
      ];

      let fieldFound = false;
      for (const selector of fieldSelectors) {
        try {
          const field = this.page.locator(selector);
          if (await field.isVisible({ timeout: 2000 })) {
            await field.fill(value);
            fieldFound = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (!fieldFound) {
        console.log(`⚠️ Field ${fieldName} not found`);
      }
    }

    // Submit if selector provided
    if (submitSelector) {
      const submitButton = this.page.locator(submitSelector);
      if (await submitButton.isVisible({ timeout: 2000 })) {
        await submitButton.click();
      }
    }
  }

  /**
   * Measure basic performance metrics
   */
  async measurePerformance() {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        domInteractive: navigation.domInteractive - navigation.navigationStart,
        ttfb: navigation.responseStart - navigation.requestStart
      };
    });
  }
}