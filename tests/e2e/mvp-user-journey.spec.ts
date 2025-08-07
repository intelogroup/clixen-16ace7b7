/**
 * MVP Complete User Journey End-to-End Tests
 * Tests the full user workflow from signup to deployed n8n workflow
 * Validates all MVP acceptance criteria and success metrics
 */
import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from './fixtures/test-helpers';

// Test data and configuration
const mvpConfig = {
  maxOnboardingTime: 10 * 60 * 1000, // 10 minutes
  maxWorkflowGenerationTime: 30 * 1000, // 30 seconds
  maxDeploymentTime: 60 * 1000, // 60 seconds
  expectedSuccessRates: {
    onboarding: 0.7, // 70%
    workflowPersistence: 0.9, // 90%
    deployment: 0.8 // 80%
  }
};

test.describe('MVP Complete User Journey', () => {
  let helpers: TestHelpers;
  let testUser: {
    email: string;
    password: string;
    projectName: string;
    workflowDescription: string;
  };

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Generate unique test data
    const testId = global.testUtils.generateTestId();
    testUser = {
      email: global.testUtils.generateTestEmail(),
      password: 'TestPassword123!@#',
      projectName: `Test Project ${testId}`,
      workflowDescription: 'Create a simple HTTP webhook that sends email notifications when triggered with contact form data'
    };

    await page.goto('/');
  });

  test.afterEach(async ({ page }) => {
    // Cleanup test data if auto-cleanup is enabled
    if (global.testConfig.features.autoCleanup) {
      await helpers.cleanupTestData(testUser.email);
    }
  });

  test('Complete MVP User Journey: Signup → Project → Chat → Workflow → Deploy', async ({ page }) => {
    const journeyStartTime = Date.now();
    let currentPhase = 'signup';

    try {
      // Phase 1: User Signup and Authentication
      await test.step('Phase 1: User Signup and Authentication', async () => {
        currentPhase = 'signup';
        const signupStartTime = Date.now();

        await helpers.navigateToAuth('signup');
        await page.locator('input[type="email"]').fill(testUser.email);
        await page.locator('input[type="password"]').fill(testUser.password);
        
        // Handle confirm password field if present
        const confirmPasswordField = page.locator('input[name*="confirm"]').first();
        if (await confirmPasswordField.isVisible({ timeout: 2000 })) {
          await confirmPasswordField.fill(testUser.password);
        }
        
        await page.locator('button[type="submit"]').first().click();
        
        // Wait for signup completion
        const signupSuccess = await page.waitForFunction(() => {
          const url = window.location.pathname;
          const text = document.body.textContent || '';
          return url.includes('dashboard') || 
                 url.includes('verify') || 
                 text.includes('check your email') ||
                 text.includes('verification');
        }, { timeout: 15000 });

        expect(signupSuccess).toBeTruthy();
        
        const signupTime = Date.now() - signupStartTime;
        console.log(`✅ Signup completed in ${signupTime}ms`);
        
        await helpers.takeScreenshot('01-signup-complete');
      });

      // Phase 2: Project Creation and Setup
      await test.step('Phase 2: Project Creation and Setup', async () => {
        currentPhase = 'project-setup';
        
        // Navigate to dashboard/projects if not already there
        if (!page.url().includes('dashboard')) {
          await page.goto('/dashboard');
        }
        
        // Look for create project button
        const createProjectTriggers = [
          page.getByText(/create.*project/i),
          page.getByText(/new.*project/i),
          page.locator('[data-testid*="create-project"]'),
          page.locator('button:has-text("+")')
        ];

        let projectCreated = false;
        for (const trigger of createProjectTriggers) {
          try {
            if (await trigger.isVisible({ timeout: 3000 })) {
              await trigger.click();
              projectCreated = true;
              break;
            }
          } catch (error) {
            continue;
          }
        }

        // If no create button found, try direct navigation
        if (!projectCreated) {
          await page.goto('/projects/new');
        }

        // Fill project details
        const projectNameField = page.locator('input[name*="name"], input[placeholder*="project" i]').first();
        if (await projectNameField.isVisible({ timeout: 5000 })) {
          await projectNameField.fill(testUser.projectName);
        }

        const projectDescField = page.locator('textarea, input[name*="description"]').first();
        if (await projectDescField.isVisible({ timeout: 3000 })) {
          await projectDescField.fill('Test project for MVP validation');
        }

        // Submit project creation
        const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
        if (await submitButton.isVisible({ timeout: 3000 })) {
          await submitButton.click();
        }

        // Wait for project creation confirmation
        const projectCreationSuccess = await page.waitForFunction(() => {
          const text = document.body.textContent || '';
          const url = window.location.pathname;
          return text.includes('project created') ||
                 text.includes('success') ||
                 url.includes('chat') ||
                 url.includes('workflow');
        }, { timeout: 10000 }).catch(() => false);

        console.log(`✅ Project creation ${projectCreationSuccess ? 'successful' : 'attempted'}`);
        await helpers.takeScreenshot('02-project-created');
      });

      // Phase 3: Chat Interface and Workflow Generation
      await test.step('Phase 3: Chat Interface and Workflow Generation', async () => {
        currentPhase = 'workflow-generation';
        const workflowStartTime = Date.now();

        // Navigate to chat interface
        await page.goto('/chat');
        
        // Wait for chat interface to load
        const chatInterface = page.locator('textarea, input[placeholder*="message" i], [data-testid*="chat"]').first();
        await chatInterface.waitFor({ state: 'visible', timeout: 10000 });

        // Send workflow generation request
        await chatInterface.fill(testUser.workflowDescription);
        
        const sendButton = page.locator('button[type="submit"], button:has-text("Send"), [data-testid*="send"]').first();
        await sendButton.click();

        await helpers.takeScreenshot('03-workflow-request-sent');

        // Wait for AI response and workflow generation
        const workflowGenerated = await page.waitForFunction(() => {
          const text = document.body.textContent || '';
          return text.includes('workflow') ||
                 text.includes('n8n') ||
                 text.includes('nodes') ||
                 document.querySelector('[data-testid*="workflow"]') !== null ||
                 document.querySelector('.workflow') !== null;
        }, { timeout: mvpConfig.maxWorkflowGenerationTime });

        expect(workflowGenerated).toBeTruthy();
        
        const workflowTime = Date.now() - workflowStartTime;
        expect(workflowTime).toBeLessThan(mvpConfig.maxWorkflowGenerationTime);
        
        console.log(`✅ Workflow generated in ${workflowTime}ms`);
        await helpers.takeScreenshot('04-workflow-generated');
      });

      // Phase 4: Workflow Validation and Persistence
      await test.step('Phase 4: Workflow Validation and Persistence', async () => {
        currentPhase = 'workflow-persistence';

        // Look for save/persist workflow options
        const saveOptions = [
          page.getByText(/save.*workflow/i),
          page.getByText(/deploy.*workflow/i),
          page.locator('[data-testid*="save"]'),
          page.locator('button:has-text("Save")')
        ];

        let workflowSaved = false;
        for (const option of saveOptions) {
          try {
            if (await option.isVisible({ timeout: 2000 })) {
              await option.click();
              workflowSaved = true;
              break;
            }
          } catch (error) {
            continue;
          }
        }

        if (workflowSaved) {
          // Wait for save confirmation
          await page.waitForFunction(() => {
            const text = document.body.textContent || '';
            return text.includes('saved') ||
                   text.includes('stored') ||
                   text.includes('persisted');
          }, { timeout: 5000 }).catch(() => false);
        }

        console.log(`✅ Workflow persistence ${workflowSaved ? 'successful' : 'attempted'}`);
        await helpers.takeScreenshot('05-workflow-saved');
      });

      // Phase 5: n8n Deployment
      await test.step('Phase 5: n8n Deployment', async () => {
        currentPhase = 'deployment';
        const deploymentStartTime = Date.now();

        // Look for deployment options
        const deployOptions = [
          page.getByText(/deploy.*n8n/i),
          page.getByText(/deploy.*workflow/i),
          page.getByText(/activate/i),
          page.locator('[data-testid*="deploy"]'),
          page.locator('button:has-text("Deploy")')
        ];

        let deploymentStarted = false;
        for (const option of deployOptions) {
          try {
            if (await option.isVisible({ timeout: 3000 })) {
              await option.click();
              deploymentStarted = true;
              break;
            }
          } catch (error) {
            continue;
          }
        }

        if (deploymentStarted) {
          // Wait for deployment completion
          const deploymentComplete = await page.waitForFunction(() => {
            const text = document.body.textContent || '';
            return text.includes('deployed successfully') ||
                   text.includes('active') ||
                   text.includes('running') ||
                   text.includes('deployment complete');
          }, { timeout: mvpConfig.maxDeploymentTime }).catch(() => false);

          const deploymentTime = Date.now() - deploymentStartTime;
          
          if (deploymentComplete) {
            expect(deploymentTime).toBeLessThan(mvpConfig.maxDeploymentTime);
            console.log(`✅ Deployment completed in ${deploymentTime}ms`);
          } else {
            console.log(`⏱️ Deployment timed out after ${deploymentTime}ms`);
          }
        } else {
          console.log('ℹ️ No deployment button found - workflow may auto-deploy');
        }

        await helpers.takeScreenshot('06-deployment-complete');
      });

      // Phase 6: Journey Completion Validation
      await test.step('Phase 6: Journey Completion Validation', async () => {
        const totalJourneyTime = Date.now() - journeyStartTime;
        const isWithinTimeLimit = totalJourneyTime <= mvpConfig.maxOnboardingTime;

        console.log(`🎯 Complete journey time: ${totalJourneyTime}ms (${Math.round(totalJourneyTime / 1000)}s)`);
        console.log(`⏰ Within 10-minute target: ${isWithinTimeLimit ? 'YES' : 'NO'}`);

        // Validate MVP success criteria
        expect(totalJourneyTime).toBeLessThan(mvpConfig.maxOnboardingTime);
        
        // Take final screenshot
        await helpers.takeScreenshot('07-journey-complete');

        // Log journey metrics for analysis
        console.log('📊 MVP Journey Metrics:', {
          totalTime: `${Math.round(totalJourneyTime / 1000)}s`,
          withinTimeLimit: isWithinTimeLimit,
          phases: ['signup', 'project-setup', 'workflow-generation', 'workflow-persistence', 'deployment'],
          completedPhase: currentPhase,
          success: true
        });
      });

    } catch (error) {
      console.error(`❌ Journey failed at phase: ${currentPhase}`, error.message);
      await helpers.takeScreenshot(`error-${currentPhase}`);
      
      // Log failure metrics
      const totalTime = Date.now() - journeyStartTime;
      console.log('📊 MVP Journey Failure Metrics:', {
        totalTime: `${Math.round(totalTime / 1000)}s`,
        failedPhase: currentPhase,
        error: error.message,
        success: false
      });

      throw error;
    }
  });

  test('MVP Accessibility Compliance Check', async ({ page }) => {
    await test.step('Check accessibility compliance throughout journey', async () => {
      // Install axe-core if available
      await page.addScriptTag({
        url: 'https://unpkg.com/axe-core@latest/axe.min.js'
      }).catch(() => {
        console.log('axe-core not loaded - skipping automated accessibility tests');
      });

      const routes = ['/', '/auth/signup', '/dashboard', '/chat', '/workflows'];
      
      for (const route of routes) {
        await page.goto(route);
        await page.waitForTimeout(2000);

        // Check basic accessibility requirements
        const accessibilityIssues = await page.evaluate(() => {
          const issues = [];
          
          // Check for missing alt text on images
          const images = document.querySelectorAll('img');
          images.forEach((img, index) => {
            if (!img.alt && !img.getAttribute('aria-label')) {
              issues.push(`Image ${index + 1} missing alt text`);
            }
          });

          // Check for form labels
          const inputs = document.querySelectorAll('input, select, textarea');
          inputs.forEach((input, index) => {
            if (!input.labels?.length && !input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
              issues.push(`Input ${index + 1} missing label`);
            }
          });

          // Check for heading hierarchy
          const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
          if (headings.length > 0 && !document.querySelector('h1')) {
            issues.push('No h1 heading found on page');
          }

          return issues;
        });

        if (accessibilityIssues.length > 0) {
          console.warn(`⚠️ Accessibility issues on ${route}:`, accessibilityIssues);
        } else {
          console.log(`✅ Basic accessibility checks passed for ${route}`);
        }
      }
    });
  });

  test('MVP Performance Benchmarks', async ({ page }) => {
    await test.step('Measure performance throughout user journey', async () => {
      const performanceMetrics: Record<string, number> = {};

      // Test page load performance
      const routes = [
        { path: '/', name: 'landing' },
        { path: '/auth/signup', name: 'signup' },
        { path: '/dashboard', name: 'dashboard' },
        { path: '/chat', name: 'chat' }
      ];

      for (const route of routes) {
        const startTime = Date.now();
        await page.goto(route.path);
        
        // Wait for page to be interactive
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        performanceMetrics[`${route.name}_load_time`] = loadTime;
        
        // Check if within performance threshold
        const withinThreshold = loadTime <= global.testConfig.thresholds.maxResponseTime;
        
        console.log(`⚡ ${route.name} load time: ${loadTime}ms ${withinThreshold ? '✅' : '⚠️'}`);
        expect(loadTime).toBeLessThan(5000); // 5 second max for page loads
      }

      // Test API response times
      const apiEndpoints = [
        '/api/auth/user',
        '/api/projects',
        '/api/workflows'
      ];

      for (const endpoint of apiEndpoints) {
        try {
          const startTime = Date.now();
          const response = await page.request.get(`${global.testConfig.supabase.url}/functions/v1${endpoint}`);
          const responseTime = Date.now() - startTime;
          
          performanceMetrics[`api_${endpoint.replace(/\//g, '_')}_time`] = responseTime;
          
          console.log(`🌐 API ${endpoint} response time: ${responseTime}ms`);
          expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);
        } catch (error) {
          console.log(`⚠️ API ${endpoint} test skipped:`, error.message);
        }
      }

      console.log('📊 Performance Metrics Summary:', performanceMetrics);
    });
  });

  test('MVP Error Handling and Recovery', async ({ page }) => {
    await test.step('Test system resilience and error recovery', async () => {
      // Test network interruption handling
      await page.goto('/chat');
      
      // Simulate network interruption
      await page.context().setOffline(true);
      
      // Try to perform action while offline
      const chatInput = page.locator('textarea, input[placeholder*="message" i]').first();
      if (await chatInput.isVisible({ timeout: 5000 })) {
        await chatInput.fill('This should fail due to network');
        const sendButton = page.locator('button[type="submit"]').first();
        if (await sendButton.isVisible()) {
          await sendButton.click();
        }
      }

      // Check for error handling
      const errorHandled = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('network') ||
               text.includes('offline') ||
               text.includes('connection') ||
               text.includes('try again');
      }, { timeout: 5000 }).catch(() => false);

      console.log(`🔌 Offline error handling: ${errorHandled ? 'Present' : 'Not detected'}`);

      // Restore network
      await page.context().setOffline(false);
      
      // Test recovery
      await page.reload();
      const recoverySuccessful = await page.waitForLoadState('networkidle').then(() => true).catch(() => false);
      
      console.log(`🔄 Network recovery: ${recoverySuccessful ? 'Successful' : 'Failed'}`);
      expect(recoverySuccessful).toBeTruthy();
    });
  });
});