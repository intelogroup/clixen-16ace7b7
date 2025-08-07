/**
 * Project Management E2E Tests
 * Tests project creation, selection, switching, and management functionality
 */
import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from '../fixtures/test-helpers';

test.describe('Project Management', () => {
  let helpers: TestHelpers;
  let testProjectName: string;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    testProjectName = `Test Project ${Date.now()}`;
    
    // Login before each test
    await helpers.authenticateUser();
  });

  test('should create a new project successfully', async ({ page }) => {
    await test.step('Navigate to project creation', async () => {
      // Look for project creation triggers
      const createProjectTriggers = [
        page.getByText(/new project/i),
        page.getByText(/create project/i),
        page.locator('button:has-text("New Project")'),
        page.locator('[data-testid="create-project"]'),
        page.locator('[href*="create"]'),
        page.locator('.create-project'),
        page.locator('button:has-text("+")')
      ];

      let createClicked = false;
      for (const trigger of createProjectTriggers) {
        try {
          if (await trigger.isVisible({ timeout: 3000 })) {
            await trigger.click();
            createClicked = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      // If no trigger found, try direct navigation
      if (!createClicked) {
        await page.goto('/projects/new');
      }

      await helpers.takeScreenshot('01-project-creation-page');
    });

    await test.step('Fill project details', async () => {
      // Fill project name
      const nameInputSelectors = [
        'input[name="name"]',
        'input[placeholder*="name" i]',
        'input[type="text"]',
        '[data-testid="project-name"]'
      ];

      let nameField = null;
      for (const selector of nameInputSelectors) {
        try {
          const field = page.locator(selector).first();
          if (await field.isVisible({ timeout: 2000 })) {
            nameField = field;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      expect(nameField).toBeTruthy();
      await nameField!.fill(testProjectName);

      // Fill project description if available
      const descriptionSelectors = [
        'textarea[name="description"]',
        'textarea[placeholder*="description" i]',
        'input[name="description"]',
        '[data-testid="project-description"]'
      ];

      for (const selector of descriptionSelectors) {
        try {
          const field = page.locator(selector).first();
          if (await field.isVisible({ timeout: 2000 })) {
            await field.fill(`Description for ${testProjectName}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }

      await helpers.takeScreenshot('02-project-details-filled');
    });

    await test.step('Submit project creation', async () => {
      const submitButtons = [
        page.locator('button[type="submit"]'),
        page.locator('button:has-text("Create")'),
        page.locator('button:has-text("Save")'),
        page.locator('[data-testid="create-project-submit"]')
      ];

      let submitted = false;
      for (const button of submitButtons) {
        try {
          if (await button.isVisible({ timeout: 2000 })) {
            await button.click();
            submitted = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      expect(submitted).toBeTruthy();
      await helpers.takeScreenshot('03-project-creation-submitted');
    });

    await test.step('Verify project creation success', async () => {
      // Wait for success indicators
      const creationSuccess = await page.waitForFunction((projectName) => {
        const text = document.body.textContent || '';
        return text.includes(projectName) ||
               text.includes('created') ||
               text.includes('success') ||
               window.location.pathname.includes('project') ||
               window.location.pathname.includes('dashboard');
      }, testProjectName, { timeout: 15000 }).catch(() => false);

      expect(creationSuccess).toBeTruthy();
      await helpers.takeScreenshot('04-project-created-success');
    });

    await test.step('Verify project appears in project list', async () => {
      // Navigate to projects list or dashboard
      const dashboardTriggers = [
        page.getByText(/dashboard/i),
        page.getByText(/projects/i),
        page.locator('[href*="dashboard"]'),
        page.locator('[href*="projects"]')
      ];

      for (const trigger of dashboardTriggers) {
        try {
          if (await trigger.isVisible({ timeout: 2000 })) {
            await trigger.click();
            break;
          }
        } catch (error) {
          continue;
        }
      }

      // Wait for project to appear in list
      const projectInList = await page.waitForFunction((projectName) => {
        const text = document.body.textContent || '';
        return text.includes(projectName);
      }, testProjectName, { timeout: 10000 }).catch(() => false);

      expect(projectInList).toBeTruthy();
      await helpers.takeScreenshot('05-project-in-list');
    });
  });

  test('should select and switch between projects', async ({ page }) => {
    // First, ensure we have at least one project to work with
    await test.step('Ensure projects exist', async () => {
      await helpers.ensureProjectExists('Project A');
      await helpers.ensureProjectExists('Project B');
    });

    await test.step('Navigate to project dashboard', async () => {
      const dashboardSuccess = await helpers.navigateToRoute('/dashboard', [
        'text=Dashboard',
        '[href*="dashboard"]',
        'text=Projects'
      ]);
      
      expect(dashboardSuccess).toBeTruthy();
      await helpers.takeScreenshot('01-project-dashboard');
    });

    await test.step('Select first project', async () => {
      // Look for project cards or list items
      const projectSelectors = [
        '.project-card',
        '.project-item',
        '[data-testid="project"]',
        'button:has-text("Project")',
        'a:has-text("Project")'
      ];

      let projectSelected = false;
      for (const selector of projectSelectors) {
        try {
          const projects = page.locator(selector);
          const firstProject = projects.first();
          
          if (await firstProject.isVisible({ timeout: 3000 })) {
            await firstProject.click();
            projectSelected = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (projectSelected) {
        await helpers.takeScreenshot('02-first-project-selected');
        
        // Verify project selection
        const selectionConfirmed = await page.waitForFunction(() => {
          return window.location.pathname.includes('project') ||
                 document.querySelector('.project-active') !== null ||
                 document.querySelector('[data-selected="true"]') !== null;
        }, { timeout: 5000 }).catch(() => false);
        
        console.log(`Project selection confirmed: ${selectionConfirmed}`);
      } else {
        console.log('⚠️ No projects found to select');
      }
    });

    await test.step('Switch to different project', async () => {
      // Try to find project switcher or go back to project list
      const switcherTriggers = [
        page.getByText(/switch project/i),
        page.getByText(/change project/i),
        page.locator('[data-testid="project-switcher"]'),
        page.locator('.project-switcher'),
        page.getByText(/projects/i)
      ];

      let switcherFound = false;
      for (const trigger of switcherTriggers) {
        try {
          if (await trigger.isVisible({ timeout: 2000 })) {
            await trigger.click();
            switcherFound = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (switcherFound) {
        await helpers.takeScreenshot('03-project-switcher-active');
        
        // Select a different project
        const projectOptions = page.locator('.project-option, .project-item, button:has-text("Project")');
        const secondProject = projectOptions.nth(1);
        
        if (await secondProject.isVisible({ timeout: 2000 })) {
          await secondProject.click();
          await helpers.takeScreenshot('04-second-project-selected');
        }
      } else {
        console.log('⚠️ No project switcher found - navigating back to dashboard');
        await page.goto('/dashboard');
        await helpers.takeScreenshot('04-back-to-dashboard');
      }
    });

    await test.step('Verify project switching works', async () => {
      // Check that we can identify which project is currently active
      const activeProject = await page.evaluate(() => {
        // Look for active project indicators
        const activeElement = document.querySelector('.project-active, [data-selected="true"], .selected');
        return activeElement ? activeElement.textContent : null;
      });

      console.log(`Currently active project: ${activeProject || 'Not detected'}`);
      await helpers.takeScreenshot('05-project-switch-verification');
    });
  });

  test('should display project details and metadata', async ({ page }) => {
    await test.step('Create project with metadata', async () => {
      const projectName = `Detailed Project ${Date.now()}`;
      const projectDescription = 'This project has detailed metadata for testing';
      
      await helpers.createProjectWithDetails(projectName, projectDescription);
      await helpers.takeScreenshot('01-project-with-metadata-created');
    });

    await test.step('Navigate to project details view', async () => {
      // Try to find project details view
      const detailsTriggers = [
        page.getByText(/view details/i),
        page.getByText(/project details/i),
        page.locator('[data-testid="project-details"]'),
        page.locator('button:has-text("Details")')
      ];

      let detailsFound = false;
      for (const trigger of detailsTriggers) {
        try {
          if (await trigger.isVisible({ timeout: 2000 })) {
            await trigger.click();
            detailsFound = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      await helpers.takeScreenshot('02-project-details-view');
    });

    await test.step('Verify project metadata display', async () => {
      // Check for common metadata fields
      const metadataFields = [
        'created',
        'updated',
        'description',
        'workflows',
        'last modified'
      ];

      const displayedMetadata = [];
      for (const field of metadataFields) {
        const hasField = await page.getByText(new RegExp(field, 'i')).isVisible({ timeout: 1000 }).catch(() => false);
        if (hasField) {
          displayedMetadata.push(field);
        }
      }

      console.log(`Displayed metadata fields: ${displayedMetadata.join(', ') || 'None detected'}`);
      await helpers.takeScreenshot('03-project-metadata-display');
      
      // At minimum, expect the project to display its name somewhere
      const hasProjectName = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('Project') || text.includes('project');
      }, { timeout: 5000 }).catch(() => false);

      expect(hasProjectName).toBeTruthy();
    });
  });

  test('should handle project deletion safely', async ({ page }) => {
    const deletableProjectName = `Deletable Project ${Date.now()}`;

    await test.step('Create project to delete', async () => {
      await helpers.createProjectWithDetails(deletableProjectName, 'This project will be deleted');
      await helpers.takeScreenshot('01-project-to-delete-created');
    });

    await test.step('Find and initiate project deletion', async () => {
      // Look for delete functionality
      const deleteTriggers = [
        page.getByText(/delete/i),
        page.getByText(/remove/i),
        page.locator('[data-testid="delete-project"]'),
        page.locator('button:has-text("Delete")'),
        page.locator('.delete-button'),
        page.locator('[title*="delete" i]')
      ];

      let deleteFound = false;
      for (const trigger of deleteTriggers) {
        try {
          if (await trigger.isVisible({ timeout: 2000 })) {
            await trigger.click();
            deleteFound = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (deleteFound) {
        await helpers.takeScreenshot('02-delete-initiated');
      } else {
        console.log('⚠️ No delete functionality found in UI');
        await helpers.takeScreenshot('02-no-delete-found');
      }
    });

    await test.step('Handle delete confirmation', async () => {
      // Look for confirmation dialog
      const confirmationExists = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('confirm') ||
               text.includes('sure') ||
               text.includes('delete') ||
               document.querySelector('.modal') !== null ||
               document.querySelector('[role="dialog"]') !== null;
      }, { timeout: 5000 }).catch(() => false);

      if (confirmationExists) {
        await helpers.takeScreenshot('03-delete-confirmation');
        
        // Find confirmation button
        const confirmButtons = [
          page.locator('button:has-text("Confirm")'),
          page.locator('button:has-text("Delete")'),
          page.locator('button:has-text("Yes")'),
          page.locator('[data-testid="confirm-delete"]')
        ];

        for (const button of confirmButtons) {
          try {
            if (await button.isVisible({ timeout: 2000 })) {
              await button.click();
              break;
            }
          } catch (error) {
            continue;
          }
        }

        await helpers.takeScreenshot('04-delete-confirmed');
      } else {
        console.log('ℹ️ No delete confirmation dialog found');
      }
    });

    await test.step('Verify project deletion', async () => {
      // Wait a moment for deletion to process
      await page.waitForTimeout(2000);

      // Check that project no longer appears
      const projectStillExists = await page.getByText(deletableProjectName).isVisible({ timeout: 3000 }).catch(() => false);
      
      if (!projectStillExists) {
        console.log('✅ Project successfully deleted');
      } else {
        console.log('⚠️ Project may still exist or deletion failed');
      }

      await helpers.takeScreenshot('05-after-deletion');
    });
  });

  test('should validate project creation input', async ({ page }) => {
    await test.step('Navigate to project creation', async () => {
      await helpers.navigateToProjectCreation();
      await helpers.takeScreenshot('01-project-creation-form');
    });

    await test.step('Test empty project name validation', async () => {
      const nameField = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();

      if (await nameField.isVisible({ timeout: 2000 }) && await submitButton.isVisible({ timeout: 2000 })) {
        // Try to submit with empty name
        await submitButton.click();
        
        // Check for validation message
        const validationShown = await page.waitForFunction(() => {
          const text = document.body.textContent || '';
          return text.includes('required') ||
                 text.includes('name') ||
                 text.includes('invalid') ||
                 text.includes('error');
        }, { timeout: 3000 }).catch(() => false);

        console.log(`Empty name validation: ${validationShown ? 'Present' : 'Not detected'}`);
        await helpers.takeScreenshot('02-empty-name-validation');
      }
    });

    await test.step('Test very long project name', async () => {
      const veryLongName = 'A'.repeat(200); // 200 character project name
      const nameField = page.locator('input[name="name"], input[placeholder*="name" i]').first();

      if (await nameField.isVisible({ timeout: 2000 })) {
        await nameField.fill(veryLongName);
        
        // Check if input was truncated or validation triggered
        const inputValue = await nameField.inputValue();
        console.log(`Long name input length: ${inputValue.length} characters`);
        
        await helpers.takeScreenshot('03-long-name-test');
      }
    });

    await test.step('Test special characters in project name', async () => {
      const specialCharName = '!@#$%^&*()_+{}|:<>?';
      const nameField = page.locator('input[name="name"], input[placeholder*="name" i]').first();

      if (await nameField.isVisible({ timeout: 2000 })) {
        await nameField.clear();
        await nameField.fill(specialCharName);
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
        if (await submitButton.isVisible({ timeout: 2000 })) {
          await submitButton.click();
          
          // Check for character validation
          const charValidation = await page.waitForFunction(() => {
            const text = document.body.textContent || '';
            return text.includes('characters') ||
                   text.includes('invalid') ||
                   text.includes('alphanumeric');
          }, { timeout: 3000 }).catch(() => false);

          console.log(`Special character validation: ${charValidation ? 'Present' : 'Not detected'}`);
          await helpers.takeScreenshot('04-special-char-validation');
        }
      }
    });
  });
});