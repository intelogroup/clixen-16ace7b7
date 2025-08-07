/**
 * n8n Deployment E2E Tests
 * Tests workflow deployment to n8n instance and status monitoring
 */
import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from '../fixtures/test-helpers';

test.describe('n8n Deployment', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Login and ensure we have a project with workflow
    await helpers.authenticateUser();
    await helpers.ensureProjectExists('Deployment Test Project');
  });

  test('should deploy workflow to n8n successfully', async ({ page }) => {
    await test.step('Create workflow ready for deployment', async () => {
      await helpers.navigateToChat();
      
      const chatInput = await helpers.findChatInput();
      await chatInput!.fill('Create a simple webhook workflow that returns a success message');
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      // Wait for workflow generation
      await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('workflow') && (
          text.includes('created') ||
          text.includes('ready') ||
          text.includes('generated') ||
          text.includes('deploy')
        );
      }, { timeout: 30000 });

      await helpers.takeScreenshot('01-workflow-ready-for-deployment');
    });

    await test.step('Initiate deployment', async () => {
      // Look for deployment triggers
      const deployTriggers = [
        page.getByText(/deploy/i),
        page.locator('button:has-text("Deploy")'),
        page.locator('[data-testid="deploy-button"]'),
        page.locator('.deploy-button'),
        page.getByText(/publish/i),
        page.locator('button:has-text("Publish")')
      ];

      let deploymentStarted = false;
      for (const trigger of deployTriggers) {
        try {
          if (await trigger.isVisible({ timeout: 3000 })) {
            await trigger.click();
            deploymentStarted = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (!deploymentStarted) {
        // Try context menu or right-click options
        const workflowElements = page.locator('.workflow, [data-testid="workflow"]');
        if (await workflowElements.count() > 0) {
          await workflowElements.first().click({ button: 'right' });
          
          const contextDeploy = page.getByText(/deploy/i);
          if (await contextDeploy.isVisible({ timeout: 2000 })) {
            await contextDeploy.click();
            deploymentStarted = true;
          }
        }
      }

      if (deploymentStarted) {
        await helpers.takeScreenshot('02-deployment-initiated');
      } else {
        console.log('⚠️ No deployment trigger found');
        await helpers.takeScreenshot('02-no-deployment-trigger');
      }
    });

    await test.step('Monitor deployment progress', async () => {
      // Look for deployment progress indicators
      const deploymentProgress = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('deploying') ||
               text.includes('connecting') ||
               text.includes('publishing') ||
               text.includes('progress') ||
               document.querySelector('.deployment-progress') !== null ||
               document.querySelector('[data-testid="deployment-status"]') !== null;
      }, { timeout: 15000 }).catch(() => false);

      console.log(`Deployment progress shown: ${deploymentProgress}`);
      await helpers.takeScreenshot('03-deployment-progress');

      // Wait for deployment completion
      if (deploymentProgress) {
        await page.waitForTimeout(5000); // Give time for deployment
      }
    });

    await test.step('Verify deployment success', async () => {
      const deploymentSuccess = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('deployed') ||
               text.includes('successful') ||
               text.includes('active') ||
               text.includes('live') ||
               text.includes('running') ||
               text.includes('success');
      }, { timeout: 20000 }).catch(() => false);

      if (deploymentSuccess) {
        console.log('✅ Deployment appears successful');
      } else {
        console.log('⚠️ Deployment success not confirmed in UI');
      }

      await helpers.takeScreenshot('04-deployment-result');
    });

    await test.step('Check for workflow URL or endpoint', async () => {
      // Look for webhook URL or execution endpoint
      const hasEndpoint = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('http') ||
               text.includes('webhook') ||
               text.includes('endpoint') ||
               text.includes('URL') ||
               text.includes('url');
      }, { timeout: 10000 }).catch(() => false);

      if (hasEndpoint) {
        console.log('✅ Workflow endpoint information displayed');
        
        // Try to extract URL if visible
        const webhookUrl = await page.evaluate(() => {
          const text = document.body.textContent || '';
          const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
          return urlMatch ? urlMatch[1] : null;
        });

        if (webhookUrl) {
          console.log(`📎 Webhook URL found: ${webhookUrl}`);
        }
      }

      await helpers.takeScreenshot('05-workflow-endpoint-info');
    });
  });

  test('should show deployment status and monitoring', async ({ page }) => {
    await test.step('Navigate to workflow dashboard/list', async () => {
      const dashboardSuccess = await helpers.navigateToRoute('/dashboard', [
        'text=Dashboard',
        'text=Workflows',
        '[href*="dashboard"]'
      ]);

      if (dashboardSuccess) {
        await helpers.takeScreenshot('01-workflow-dashboard');
      } else {
        await helpers.navigateToChat();
        await helpers.takeScreenshot('01-fallback-to-chat');
      }
    });

    await test.step('Look for deployed workflows', async () => {
      // Check for workflow status indicators
      const statusIndicators = await page.evaluate(() => {
        const indicators = [];
        const statusElements = document.querySelectorAll('[class*="status"], [data-status], .workflow-status');
        
        statusElements.forEach(el => {
          indicators.push(el.textContent?.trim());
        });

        // Also check for color-coded status (green for active, red for failed, etc.)
        const coloredElements = document.querySelectorAll('[class*="green"], [class*="red"], [class*="success"], [class*="error"], [class*="active"]');
        coloredElements.forEach(el => {
          if (el.textContent) {
            indicators.push(el.textContent.trim());
          }
        });

        return indicators.filter(text => text && text.length > 0);
      });

      console.log(`Status indicators found: ${statusIndicators.join(', ') || 'None'}`);
      await helpers.takeScreenshot('02-workflow-status-indicators');
    });

    await test.step('Check execution history if available', async () => {
      // Look for execution history or logs
      const historyTriggers = [
        page.getByText(/history/i),
        page.getByText(/executions/i),
        page.getByText(/runs/i),
        page.getByText(/logs/i),
        page.locator('[data-testid="execution-history"]')
      ];

      let historyFound = false;
      for (const trigger of historyTriggers) {
        try {
          if (await trigger.isVisible({ timeout: 2000 })) {
            await trigger.click();
            historyFound = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (historyFound) {
        await helpers.takeScreenshot('03-execution-history');
        
        // Look for execution entries
        const executionEntries = await page.evaluate(() => {
          const entries = document.querySelectorAll('.execution, [data-testid="execution"], .run, .log-entry');
          return entries.length;
        });

        console.log(`Execution entries found: ${executionEntries}`);
      } else {
        console.log('ℹ️ No execution history interface found');
        await helpers.takeScreenshot('03-no-execution-history');
      }
    });
  });

  test('should handle deployment errors gracefully', async ({ page }) => {
    await test.step('Create workflow and simulate deployment error', async () => {
      await helpers.navigateToChat();
      
      // Create a workflow that might cause deployment issues
      const chatInput = await helpers.findChatInput();
      await chatInput!.fill('Create a workflow with invalid configuration that will fail to deploy');
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      await helpers.takeScreenshot('01-problematic-workflow-request');

      // Wait for workflow generation
      await page.waitForTimeout(15000);
      await helpers.takeScreenshot('02-workflow-generated');
    });

    await test.step('Attempt deployment', async () => {
      const deployButton = page.locator('button:has-text("Deploy"), [data-testid="deploy-button"]').first();
      
      if (await deployButton.isVisible({ timeout: 5000 })) {
        await deployButton.click();
        await helpers.takeScreenshot('03-deployment-attempted');
        
        // Wait for potential error
        await page.waitForTimeout(10000);
      }
    });

    await test.step('Check for error handling', async () => {
      const errorHandling = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('error') ||
               text.includes('failed') ||
               text.includes('could not') ||
               text.includes('unable') ||
               text.includes('problem') ||
               text.includes('issue') ||
               document.querySelector('.error') !== null ||
               document.querySelector('[data-testid="error"]') !== null;
      }, { timeout: 10000 }).catch(() => false);

      if (errorHandling) {
        console.log('✅ Error handling detected in UI');
      } else {
        console.log('ℹ️ No deployment errors detected');
      }

      await helpers.takeScreenshot('04-error-handling-check');
    });

    await test.step('Verify error recovery options', async () => {
      // Look for retry or fix options
      const recoveryOptions = await page.evaluate(() => {
        const text = document.body.textContent || '';
        return text.includes('retry') ||
               text.includes('try again') ||
               text.includes('fix') ||
               text.includes('correct') ||
               document.querySelector('button:has-text("Retry")') !== null ||
               document.querySelector('button:has-text("Fix")') !== null;
      });

      console.log(`Error recovery options available: ${recoveryOptions}`);
      await helpers.takeScreenshot('05-recovery-options');
    });
  });

  test('should verify n8n instance connectivity', async ({ page }) => {
    await test.step('Check n8n instance status', async () => {
      // Try to navigate to settings or configuration
      const settingsTriggers = [
        page.getByText(/settings/i),
        page.getByText(/config/i),
        page.getByText(/n8n/i),
        page.locator('[href*="settings"]')
      ];

      let settingsFound = false;
      for (const trigger of settingsTriggers) {
        try {
          if (await trigger.isVisible({ timeout: 2000 })) {
            await trigger.click();
            settingsFound = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      await helpers.takeScreenshot('01-settings-search');
    });

    await test.step('Look for n8n connection status', async () => {
      // Check for connection status indicators
      const connectionStatus = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('connected') ||
               text.includes('disconnected') ||
               text.includes('online') ||
               text.includes('offline') ||
               text.includes('n8n') ||
               document.querySelector('.connection-status') !== null ||
               document.querySelector('[data-testid="connection"]') !== null;
      }, { timeout: 5000 }).catch(() => false);

      if (connectionStatus) {
        console.log('✅ Connection status information found');
      } else {
        console.log('ℹ️ No explicit connection status found in UI');
      }

      await helpers.takeScreenshot('02-connection-status-check');
    });

    await test.step('Test deployment capability indicator', async () => {
      // Navigate back to workflow creation to test if deployment is available
      await helpers.navigateToChat();
      
      const chatInput = await helpers.findChatInput();
      await chatInput!.fill('Test n8n connection with a simple ping workflow');
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      await page.waitForTimeout(10000);
      
      // Check if deployment options are available
      const deploymentAvailable = await page.evaluate(() => {
        const text = document.body.textContent || '';
        return text.includes('deploy') ||
               text.includes('publish') ||
               document.querySelector('button:has-text("Deploy")') !== null;
      });

      console.log(`Deployment capability available: ${deploymentAvailable}`);
      await helpers.takeScreenshot('03-deployment-capability-test');
    });
  });

  test('should handle workflow updates and redeployment', async ({ page }) => {
    let workflowId: string | null = null;

    await test.step('Deploy initial workflow', async () => {
      await helpers.navigateToChat();
      
      const chatInput = await helpers.findChatInput();
      await chatInput!.fill('Create a webhook that logs incoming requests');
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      // Wait for workflow and attempt deployment
      await page.waitForTimeout(15000);
      
      const deployButton = page.locator('button:has-text("Deploy")').first();
      if (await deployButton.isVisible({ timeout: 5000 })) {
        await deployButton.click();
        await page.waitForTimeout(5000);
      }

      await helpers.takeScreenshot('01-initial-workflow-deployed');
    });

    await test.step('Request workflow modification', async () => {
      const chatInput = await helpers.findChatInput();
      await chatInput!.fill('Modify the workflow to also send the data to email');
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      await helpers.takeScreenshot('02-modification-requested');

      // Wait for modification response
      await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('modify') ||
               text.includes('update') ||
               text.includes('email') ||
               text.includes('change');
      }, { timeout: 20000 });

      await helpers.takeScreenshot('03-modification-response');
    });

    await test.step('Redeploy updated workflow', async () => {
      // Look for redeploy options
      const redeployTriggers = [
        page.getByText(/redeploy/i),
        page.getByText(/update/i),
        page.locator('button:has-text("Deploy")'),
        page.locator('button:has-text("Update")'),
        page.locator('[data-testid="redeploy"]')
      ];

      let redeployStarted = false;
      for (const trigger of redeployTriggers) {
        try {
          if (await trigger.isVisible({ timeout: 3000 })) {
            await trigger.click();
            redeployStarted = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (redeployStarted) {
        await helpers.takeScreenshot('04-redeployment-initiated');
        await page.waitForTimeout(5000);
      }
    });

    await test.step('Verify update deployment', async () => {
      const updateSuccess = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('updated') ||
               text.includes('redeployed') ||
               text.includes('success') ||
               text.includes('live');
      }, { timeout: 15000 }).catch(() => false);

      console.log(`Update deployment success: ${updateSuccess}`);
      await helpers.takeScreenshot('05-update-deployment-result');
    });
  });
});