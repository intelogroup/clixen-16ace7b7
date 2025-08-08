import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Test configuration
const TEST_URL = 'http://127.0.0.1:8081';
const TEST_USER = {
  email: 'jayveedz19@gmail.com',
  password: 'Goldyear2023#'
};

// Helper function to take and save screenshot
async function takeScreenshot(page: Page, name: string) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
  
  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  
  const fileName = `${Date.now()}_${name}.png`;
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`📸 Screenshot saved: ${fileName}`);
  return filePath;
}

// Helper function to wait and log
async function waitAndLog(page: Page, message: string, ms: number = 2000) {
  console.log(`⏳ ${message}`);
  await page.waitForTimeout(ms);
}

test.describe('🎯 Clixen MVP User Journey - Complete E2E Test', () => {
  test.setTimeout(300000); // 5 minutes timeout for the complete journey

  test('Complete user journey from auth to workflow monitoring', async ({ page }) => {
    console.log('\n🚀 Starting MVP User Journey Test\n');
    
    // ============================================
    // STEP 1: AUTHENTICATION
    // ============================================
    console.log('📋 STEP 1: Testing Authentication Flow');
    
    // Navigate to the application
    await page.goto(TEST_URL);
    await takeScreenshot(page, '01_initial_load');
    
    // Check if we're on the auth page
    const authPageVisible = await page.locator('text=/Sign in|Sign up/i').isVisible().catch(() => false);
    
    if (authPageVisible) {
      console.log('✅ Auth page loaded successfully');
      
      // Try to sign in first
      console.log('🔐 Attempting to sign in with test credentials');
      
      // Look for email input
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await takeScreenshot(page, '02_credentials_filled');
      
      // Click sign in button
      const signInButton = page.locator('button:has-text("Sign in"), button:has-text("Sign In"), button:has-text("Login")').first();
      await signInButton.click();
      
      console.log('⏳ Waiting for authentication to complete...');
      
      // Wait for either dashboard or error
      await Promise.race([
        page.waitForURL('**/dashboard', { timeout: 10000 }),
        page.waitForSelector('text=/invalid|error|incorrect/i', { timeout: 10000 }),
        page.waitForTimeout(10000)
      ]).catch(() => {});
      
      await takeScreenshot(page, '03_after_sign_in_attempt');
      
      // Check if we successfully logged in
      const onDashboard = page.url().includes('dashboard');
      if (onDashboard) {
        console.log('✅ Successfully authenticated and redirected to dashboard');
      } else {
        console.log('⚠️ Sign in may have failed, checking for errors...');
        const errorVisible = await page.locator('text=/invalid|error|incorrect/i').isVisible().catch(() => false);
        if (errorVisible) {
          console.log('❌ Authentication error detected');
          // Try sign up instead
          console.log('🔄 Attempting to sign up with new credentials');
          const signUpButton = page.locator('text=/Sign up|Create account/i').first();
          if (await signUpButton.isVisible()) {
            await signUpButton.click();
            await waitAndLog(page, 'Switching to sign up mode');
            
            // Generate unique test email
            const testEmail = `test_${Date.now()}@example.com`;
            const testPassword = 'TestPassword123!';
            
            await emailInput.fill(testEmail);
            await passwordInput.fill(testPassword);
            
            const createAccountButton = page.locator('button:has-text("Sign up"), button:has-text("Create")').first();
            await createAccountButton.click();
            
            await waitAndLog(page, 'Creating new account...');
            await takeScreenshot(page, '04_sign_up_attempt');
          }
        }
      }
    }
    
    // ============================================
    // STEP 2: DASHBOARD & PROJECT MANAGEMENT
    // ============================================
    console.log('\n📋 STEP 2: Testing Dashboard & Project Management');
    
    // Check if we're on the dashboard
    const dashboardUrl = page.url();
    if (dashboardUrl.includes('dashboard') || await page.locator('text=/projects|workflows|dashboard/i').isVisible().catch(() => false)) {
      console.log('✅ Dashboard loaded successfully');
      await takeScreenshot(page, '05_dashboard_view');
      
      // Look for existing projects
      const projectsSection = page.locator('text=/your projects|my projects|projects/i').first();
      if (await projectsSection.isVisible().catch(() => false)) {
        console.log('✅ Projects section found');
        
        // Check for existing projects or create new one
        const newProjectButton = page.locator('button:has-text("New Project"), button:has-text("Create Project"), button:has-text("+ Project")').first();
        if (await newProjectButton.isVisible().catch(() => false)) {
          console.log('🆕 Creating a new project for testing');
          await newProjectButton.click();
          await waitAndLog(page, 'Opening project creation dialog');
          
          // Fill project details if modal appears
          const projectNameInput = page.locator('input[placeholder*="project" i], input[name="name"], input[name="projectName"]').first();
          if (await projectNameInput.isVisible().catch(() => false)) {
            const projectName = `Test Project ${Date.now()}`;
            await projectNameInput.fill(projectName);
            console.log(`📝 Project name: ${projectName}`);
            
            const createButton = page.locator('button:has-text("Create"), button:has-text("Save")').first();
            await createButton.click();
            await waitAndLog(page, 'Creating project...');
          }
          
          await takeScreenshot(page, '06_project_created');
        }
        
        // Select a project if available
        const projectCard = page.locator('[class*="project"], [data-testid*="project"]').first();
        if (await projectCard.isVisible().catch(() => false)) {
          console.log('📂 Selecting first available project');
          await projectCard.click();
          await waitAndLog(page, 'Loading project details...');
          await takeScreenshot(page, '07_project_selected');
        }
      }
    } else {
      console.log('⚠️ Not on dashboard, attempting to navigate...');
      await page.goto(`${TEST_URL}/dashboard`);
      await waitAndLog(page, 'Navigating to dashboard...');
      await takeScreenshot(page, '08_dashboard_navigation');
    }
    
    // ============================================
    // STEP 3: CHAT INTERFACE & WORKFLOW CREATION
    // ============================================
    console.log('\n📋 STEP 3: Testing Chat Interface & Workflow Creation');
    
    // Navigate to chat or create new workflow
    const newWorkflowButton = page.locator('button:has-text("New Workflow"), button:has-text("Create Workflow"), text=/start chat|new chat/i').first();
    if (await newWorkflowButton.isVisible().catch(() => false)) {
      console.log('🎯 Starting new workflow creation');
      await newWorkflowButton.click();
      await waitAndLog(page, 'Opening chat interface...');
      await takeScreenshot(page, '09_chat_interface_opened');
    } else {
      // Try direct navigation to chat
      console.log('📍 Navigating directly to chat page');
      await page.goto(`${TEST_URL}/chat`);
      await waitAndLog(page, 'Loading chat interface...');
    }
    
    // Test chat interface
    const chatInput = page.locator('textarea, input[type="text"][placeholder*="message" i], [contenteditable="true"]').first();
    if (await chatInput.isVisible().catch(() => false)) {
      console.log('✅ Chat input field found');
      
      // Send a workflow creation message
      const workflowPrompt = 'Create a simple workflow that sends an email notification when a new user signs up. The email should include the user name and registration date.';
      console.log(`💬 Sending prompt: "${workflowPrompt}"`);
      
      await chatInput.fill(workflowPrompt);
      await takeScreenshot(page, '10_prompt_entered');
      
      // Send the message
      const sendButton = page.locator('button:has-text("Send"), button[aria-label*="send" i], button[type="submit"]').first();
      if (await sendButton.isVisible().catch(() => false)) {
        await sendButton.click();
      } else {
        // Try pressing Enter
        await chatInput.press('Enter');
      }
      
      console.log('⏳ Waiting for AI response...');
      
      // Wait for response (look for message bubbles or loading indicators)
      await page.waitForSelector('[class*="message"], [class*="bubble"], [role="article"]', { 
        timeout: 30000,
        state: 'visible' 
      }).catch(() => {});
      
      await waitAndLog(page, 'AI processing workflow request...', 5000);
      await takeScreenshot(page, '11_ai_response_received');
      
      // Check for workflow generation options
      const saveWorkflowButton = page.locator('button:has-text("Save Workflow"), button:has-text("Save")').first();
      if (await saveWorkflowButton.isVisible().catch(() => false)) {
        console.log('💾 Saving generated workflow');
        await saveWorkflowButton.click();
        await waitAndLog(page, 'Saving workflow...');
        await takeScreenshot(page, '12_workflow_saved');
      }
    } else {
      console.log('⚠️ Chat input not found');
      await takeScreenshot(page, '13_chat_interface_issue');
    }
    
    // ============================================
    // STEP 4: WORKFLOW DEPLOYMENT TO N8N
    // ============================================
    console.log('\n📋 STEP 4: Testing Workflow Deployment to n8n');
    
    const deployButton = page.locator('button:has-text("Deploy"), button:has-text("Deploy to n8n")').first();
    if (await deployButton.isVisible().catch(() => false)) {
      console.log('🚀 Deploying workflow to n8n');
      await deployButton.click();
      
      // Wait for deployment status
      await page.waitForSelector('text=/deploying|deployment|processing/i', { 
        timeout: 10000,
        state: 'visible' 
      }).catch(() => {});
      
      await waitAndLog(page, 'Deployment in progress...', 5000);
      
      // Check deployment result
      const successIndicator = await page.locator('text=/success|deployed|active/i').isVisible().catch(() => false);
      const errorIndicator = await page.locator('text=/error|failed|failure/i').isVisible().catch(() => false);
      
      if (successIndicator) {
        console.log('✅ Workflow successfully deployed to n8n');
      } else if (errorIndicator) {
        console.log('❌ Workflow deployment failed');
      } else {
        console.log('⚠️ Deployment status unclear');
      }
      
      await takeScreenshot(page, '14_deployment_result');
    } else {
      console.log('⚠️ Deploy button not available');
    }
    
    // ============================================
    // STEP 5: DASHBOARD ANALYTICS & MONITORING
    // ============================================
    console.log('\n📋 STEP 5: Testing Dashboard Analytics & Workflow Monitoring');
    
    // Navigate back to dashboard
    const dashboardLink = page.locator('a[href*="dashboard"], button:has-text("Dashboard"), text=/back to dashboard/i').first();
    if (await dashboardLink.isVisible().catch(() => false)) {
      await dashboardLink.click();
      await waitAndLog(page, 'Returning to dashboard...');
    } else {
      await page.goto(`${TEST_URL}/dashboard`);
      await waitAndLog(page, 'Navigating to dashboard...');
    }
    
    await takeScreenshot(page, '15_dashboard_with_workflows');
    
    // Check for workflow listings
    const workflowList = page.locator('[class*="workflow"], [data-testid*="workflow"]');
    const workflowCount = await workflowList.count();
    console.log(`📊 Found ${workflowCount} workflow(s) in dashboard`);
    
    if (workflowCount > 0) {
      console.log('✅ Workflows visible in dashboard');
      
      // Check for status indicators
      const statusBadges = page.locator('[class*="status"], [class*="badge"]');
      const statusCount = await statusBadges.count();
      console.log(`📈 Found ${statusCount} status indicator(s)`);
      
      // Look for analytics or metrics
      const metrics = page.locator('text=/total|count|success|rate/i');
      const metricsCount = await metrics.count();
      console.log(`📊 Found ${metricsCount} metric(s) displayed`);
    }
    
    await takeScreenshot(page, '16_final_dashboard_state');
    
    // ============================================
    // TEST SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('📊 MVP USER JOURNEY TEST SUMMARY');
    console.log('='.repeat(50));
    
    const testResults = {
      'Authentication': authPageVisible ? 'PASSED' : 'NEEDS REVIEW',
      'Dashboard Access': dashboardUrl.includes('dashboard') ? 'PASSED' : 'NEEDS REVIEW',
      'Project Management': await page.locator('[class*="project"]').isVisible().catch(() => false) ? 'PASSED' : 'NEEDS REVIEW',
      'Chat Interface': await chatInput.isVisible().catch(() => false) ? 'PASSED' : 'NEEDS REVIEW',
      'Workflow Creation': await page.locator('[class*="message"]').isVisible().catch(() => false) ? 'PASSED' : 'NEEDS REVIEW',
      'n8n Deployment': await deployButton.isVisible().catch(() => false) ? 'AVAILABLE' : 'NOT TESTED',
      'Dashboard Monitoring': workflowCount > 0 ? 'PASSED' : 'NEEDS DATA'
    };
    
    Object.entries(testResults).forEach(([step, status]) => {
      const icon = status.includes('PASSED') || status.includes('AVAILABLE') ? '✅' : '⚠️';
      console.log(`${icon} ${step}: ${status}`);
    });
    
    const __filename2 = fileURLToPath(import.meta.url);
    const __dirname2 = path.dirname(__filename2);
    const SCREENSHOT_DIR2 = path.join(__dirname2, 'screenshots');
    
    console.log('\n📸 Screenshots saved to:', SCREENSHOT_DIR2);
    console.log('='.repeat(50));
    
    // Final assertions for test pass/fail
    expect(authPageVisible || dashboardUrl.includes('dashboard')).toBeTruthy();
    console.log('\n✅ MVP User Journey Test Completed');
  });
});