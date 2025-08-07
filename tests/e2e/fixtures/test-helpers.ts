/**
 * E2E Test Helper Functions
 * Shared utilities for end-to-end testing across the Clixen MVP
 */
import { Page, Locator, expect } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Authentication Helper
   */
  async authenticateUser(email?: string, password?: string): Promise<boolean> {
    const loginEmail = email || 'jayveedz19@gmail.com';
    const loginPassword = password || 'Goldyear2023#';

    try {
      // Navigate to auth page
      await this.navigateToAuth('login');
      
      // Fill credentials
      const emailField = this.page.locator('input[type="email"]');
      await emailField.waitFor({ timeout: 10000 });
      await emailField.fill(loginEmail);
      
      const passwordField = this.page.locator('input[type="password"]');
      await passwordField.fill(loginPassword);
      
      // Submit form
      const submitButton = this.page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();
      await submitButton.click();
      
      // Wait for authentication success
      const authSuccess = await this.page.waitForFunction(() => {
        return window.location.pathname.includes('dashboard') ||
               window.location.pathname.includes('chat') ||
               document.body.textContent?.includes('Dashboard') ||
               document.body.textContent?.includes('Welcome');
      }, { timeout: 15000 }).catch(() => false);

      return authSuccess;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  /**
   * Navigation Helpers
   */
  async navigateToAuth(type: 'login' | 'signup' = 'login'): Promise<boolean> {
    try {
      // Try multiple auth navigation methods
      const authTriggers = [
        this.page.getByText(type === 'signup' ? /sign up/i : /sign in/i),
        this.page.getByText(type === 'signup' ? /get started/i : /login/i),
        this.page.locator(`[href*="${type === 'signup' ? 'signup' : 'auth'}"]`),
        this.page.locator(`[href*="${type === 'signup' ? 'register' : 'login'}"]`)
      ];

      for (const trigger of authTriggers) {
        try {
          if (await trigger.isVisible({ timeout: 3000 })) {
            await trigger.click();
            
            // Wait for auth form to appear
            const authFormVisible = await this.page.waitForFunction(() => {
              return document.querySelector('input[type="email"]') !== null;
            }, { timeout: 5000 }).catch(() => false);

            if (authFormVisible) return true;
          }
        } catch (error) {
          continue;
        }
      }

      // If no triggers worked, try direct navigation
      const authRoutes = ['/auth', '/login', '/signin'];
      for (const route of authRoutes) {
        try {
          await this.page.goto(route);
          const hasAuthForm = await this.page.locator('input[type="email"]').isVisible({ timeout: 5000 });
          if (hasAuthForm) return true;
        } catch (error) {
          continue;
        }
      }

      return false;
    } catch (error) {
      console.error('Navigation to auth failed:', error);
      return false;
    }
  }

  async navigateToChat(): Promise<boolean> {
    return this.navigateToRoute('/chat', [
      'text=Chat',
      'text=AI Chat',
      '[href*="chat"]',
      '[data-testid="chat"]',
      '.chat-button'
    ]);
  }

  async navigateToRoute(route: string, selectors: string[] = []): Promise<boolean> {
    try {
      // First try clicking selectors
      for (const selector of selectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            await this.page.waitForTimeout(1000);
            
            if (this.page.url().includes(route) || route === '/') {
              return true;
            }
          }
        } catch (error) {
          continue;
        }
      }

      // If selectors didn't work, try direct navigation
      await this.page.goto(route);
      await this.page.waitForTimeout(2000);
      return true;
    } catch (error) {
      console.error(`Navigation to ${route} failed:`, error);
      return false;
    }
  }

  /**
   * Chat Interface Helpers
   */
  async findChatInput(): Promise<Locator | null> {
    const chatInputSelectors = [
      'input[type="text"]',
      'textarea',
      '[data-testid="chat-input"]',
      '[placeholder*="message" i]',
      '[placeholder*="chat" i]',
      '[placeholder*="type" i]',
      '.chat-input'
    ];

    for (const selector of chatInputSelectors) {
      try {
        const input = this.page.locator(selector).first();
        if (await input.isVisible({ timeout: 3000 })) {
          return input;
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  async findSendButton(): Promise<Locator | null> {
    const sendButtonSelectors = [
      'button[type="submit"]',
      'button:has-text("Send")',
      '[data-testid="send-button"]',
      'button:has-text("Submit")',
      '.send-button'
    ];

    for (const selector of sendButtonSelectors) {
      try {
        const button = this.page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          return button;
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  /**
   * Project Management Helpers
   */
  async ensureProjectExists(projectName: string): Promise<boolean> {
    try {
      // Check if project already exists
      const projectExists = await this.page.getByText(projectName).isVisible({ timeout: 3000 }).catch(() => false);
      
      if (projectExists) {
        console.log(`✅ Project "${projectName}" already exists`);
        return true;
      }

      // Create new project
      return await this.createProjectWithDetails(projectName, `Auto-created project for testing: ${projectName}`);
    } catch (error) {
      console.error(`Failed to ensure project exists:`, error);
      return false;
    }
  }

  async createProjectWithDetails(name: string, description?: string): Promise<boolean> {
    try {
      await this.navigateToProjectCreation();
      
      // Fill project name
      const nameField = await this.findProjectNameField();
      if (!nameField) return false;
      
      await nameField.fill(name);
      
      // Fill description if provided
      if (description) {
        const descField = await this.findProjectDescriptionField();
        if (descField) {
          await descField.fill(description);
        }
      }

      // Submit project creation
      const submitButton = this.page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
      if (await submitButton.isVisible({ timeout: 3000 })) {
        await submitButton.click();
        
        // Wait for project creation success
        const created = await this.page.waitForFunction((projectName) => {
          const text = document.body.textContent || '';
          return text.includes(projectName) ||
                 text.includes('created') ||
                 text.includes('success') ||
                 window.location.pathname.includes('project');
        }, name, { timeout: 10000 }).catch(() => false);

        return created;
      }

      return false;
    } catch (error) {
      console.error('Project creation failed:', error);
      return false;
    }
  }

  async navigateToProjectCreation(): Promise<boolean> {
    const createTriggers = [
      this.page.getByText(/new project/i),
      this.page.getByText(/create project/i),
      this.page.locator('button:has-text("New Project")'),
      this.page.locator('[data-testid="create-project"]'),
      this.page.locator('[href*="create"]'),
      this.page.locator('button:has-text("+")')
    ];

    for (const trigger of createTriggers) {
      try {
        if (await trigger.isVisible({ timeout: 3000 })) {
          await trigger.click();
          return true;
        }
      } catch (error) {
        continue;
      }
    }

    // Try direct navigation
    try {
      await this.page.goto('/projects/new');
      return true;
    } catch (error) {
      console.error('Failed to navigate to project creation');
      return false;
    }
  }

  private async findProjectNameField(): Promise<Locator | null> {
    const nameSelectors = [
      'input[name="name"]',
      'input[placeholder*="name" i]',
      'input[type="text"]',
      '[data-testid="project-name"]'
    ];

    for (const selector of nameSelectors) {
      try {
        const field = this.page.locator(selector).first();
        if (await field.isVisible({ timeout: 2000 })) {
          return field;
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  private async findProjectDescriptionField(): Promise<Locator | null> {
    const descSelectors = [
      'textarea[name="description"]',
      'textarea[placeholder*="description" i]',
      'input[name="description"]',
      '[data-testid="project-description"]'
    ];

    for (const selector of descSelectors) {
      try {
        const field = this.page.locator(selector).first();
        if (await field.isVisible({ timeout: 2000 })) {
          return field;
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  /**
   * Utility Functions
   */
  async takeScreenshot(name: string): Promise<void> {
    try {
      await this.page.screenshot({
        path: `test-results/screenshots/${name}.png`,
        fullPage: true
      });
    } catch (error) {
      console.warn(`Failed to take screenshot ${name}:`, error);
    }
  }

  async waitForAnyElement(selectors: string[], timeout: number = 5000): Promise<Locator> {
    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: timeout / selectors.length })) {
          return element;
        }
      } catch (error) {
        continue;
      }
    }
    
    throw new Error(`None of the selectors found: ${selectors.join(', ')}`);
  }

  async checkPageHealth(): Promise<{ title: string; url: string; errors: string[] }> {
    const title = await this.page.title();
    const url = this.page.url();
    
    // Check for JavaScript errors
    const errors: string[] = [];
    this.page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    return { title, url, errors };
  }

  async testResponsive(baseName: string): Promise<void> {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
      await this.page.waitForTimeout(500); // Let layout settle
      await this.takeScreenshot(`${baseName}-${viewport.name}`);
    }

    // Reset to default desktop view
    await this.page.setViewportSize({ width: 1920, height: 1080 });
  }

  async measurePerformance(): Promise<{
    ttfb: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    domContentLoaded: number;
  }> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      const lcp = (performance as any).getEntriesByType?.('largest-contentful-paint')?.[0];

      return {
        ttfb: navigation.responseStart - navigation.requestStart,
        firstContentfulPaint: fcp?.startTime || 0,
        largestContentfulPaint: lcp?.startTime || 0,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart
      };
    });
  }

  async login(): Promise<boolean> {
    return await this.authenticateUser();
  }

  /**
   * Wait for loading states to complete
   */
  async waitForLoadingComplete(timeout: number = 10000): Promise<void> {
    await this.page.waitForFunction(() => {
      // Check for common loading indicators
      const loadingElements = document.querySelectorAll('.loading, .spinner, [data-testid="loading"]');
      return loadingElements.length === 0;
    }, { timeout }).catch(() => {
      console.warn('Loading state did not complete within timeout');
    });
  }

  /**
   * Handle modals and overlays
   */
  async dismissModals(): Promise<void> {
    const modalDismissSelectors = [
      '[role="dialog"] button[aria-label*="close" i]',
      '.modal .close',
      '[data-testid="close-modal"]',
      'button:has-text("×")',
      'button:has-text("Close")'
    ];

    for (const selector of modalDismissSelectors) {
      try {
        const closeButton = this.page.locator(selector);
        if (await closeButton.isVisible({ timeout: 1000 })) {
          await closeButton.click();
          await this.page.waitForTimeout(500);
        }
      } catch (error) {
        continue;
      }
    }
  }

  /**
   * Get page text content for analysis
   */
  async getPageText(): Promise<string> {
    return await this.page.evaluate(() => document.body.textContent || '');
  }

  /**
   * Verify elements are accessible
   */
  async checkAccessibility(): Promise<{ 
    missingAlt: number; 
    missingLabels: number; 
    focusableElements: number; 
  }> {
    return await this.page.evaluate(() => {
      const missingAlt = document.querySelectorAll('img:not([alt])').length;
      const missingLabels = document.querySelectorAll('input:not([aria-label]):not([title]):not([placeholder])').length;
      const focusableElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]').length;
      
      return { missingAlt, missingLabels, focusableElements };
    });
  }
}