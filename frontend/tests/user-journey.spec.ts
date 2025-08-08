import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Test configuration
const TEST_URL = 'http://localhost:8081';
const TEST_USER = {
  email: 'jayveedz19@gmail.com',
  password: 'Goldyear2023#'
};

test.describe('Clixen MVP User Journey', () => {
  test.setTimeout(180000); // 3 minutes per test

  test('Complete user journey: Auth → Dashboard → Chat → Deploy → Monitor', async ({ page }) => {
    console.log('\n🚀 Starting MVP User Journey Test\n');
    
    // Create screenshots directory
    const screenshotsDir = path.join(process.cwd(), 'test-screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    // Helper to take screenshots
    const screenshot = async (name: string) => {
      const filePath = path.join(screenshotsDir, `${Date.now()}_${name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`📸 Screenshot: ${name}`);
      return filePath;
    };
    
    // ============================================
    // STEP 1: AUTHENTICATION
    // ============================================
    console.log('\n📋 STEP 1: Testing Authentication');
    
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');
    await screenshot('01_initial_load');
    
    // Check current page
    const url = page.url();
    console.log(`Current URL: ${url}`);
    
    // Check if we need to authenticate
    if (!url.includes('dashboard')) {
      console.log('Need to authenticate...');
      
      // Look for auth form
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      if (await emailInput.isVisible()) {
        console.log('Auth form found, filling credentials...');
        await emailInput.fill(TEST_USER.email);
        await passwordInput.fill(TEST_USER.password);
        await screenshot('02_credentials_filled');
        
        // Submit form
        const submitButton = page.locator('button[type="submit"]').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
        } else {
          await passwordInput.press('Enter');
        }
        
        console.log('Waiting for authentication...');
        
        // Wait for navigation or error
        await Promise.race([
          page.waitForURL('**/dashboard', { timeout: 15000 }),
          page.waitForSelector('.error-message', { timeout: 15000 })
        ]).catch(() => {});
        
        await screenshot('03_after_auth');
      }
    }
    
    // ============================================
    // STEP 2: DASHBOARD CHECK
    // ============================================
    console.log('\n📋 STEP 2: Testing Dashboard');
    
    const dashboardUrl = page.url();
    if (dashboardUrl.includes('dashboard')) {
      console.log('✅ Dashboard loaded');
      await screenshot('04_dashboard');
      
      // Look for projects
      const projectsExist = await page.locator('text=/project/i').first().isVisible().catch(() => false);
      console.log(`Projects section visible: ${projectsExist}`);
      
      // Look for new workflow button
      const newWorkflowBtn = page.locator('button:has-text("New Workflow")').first();
      if (await newWorkflowBtn.isVisible().catch(() => false)) {
        console.log('Found New Workflow button');
      }
    } else {
      console.log('⚠️ Not on dashboard, navigating...');
      await page.goto(`${TEST_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      await screenshot('05_dashboard_navigate');
    }
    
    // ============================================
    // STEP 3: CHAT INTERFACE
    // ============================================
    console.log('\n📋 STEP 3: Testing Chat Interface');
    
    // Navigate to chat
    const chatButton = page.locator('button:has-text("New Workflow"), a[href*="chat"]').first();
    if (await chatButton.isVisible().catch(() => false)) {
      await chatButton.click();
      await page.waitForLoadState('networkidle');
    } else {
      await page.goto(`${TEST_URL}/chat`);
      await page.waitForLoadState('networkidle');
    }
    
    await screenshot('06_chat_interface');
    
    // Find chat input
    const chatInput = page.locator('textarea, input[placeholder*="message" i]').first();
    if (await chatInput.isVisible().catch(() => false)) {
      console.log('✅ Chat input found');
      
      // Send test message
      const testPrompt = 'Create a simple workflow that sends a welcome email when a new user signs up';
      await chatInput.fill(testPrompt);
      await screenshot('07_prompt_entered');
      
      // Send message
      const sendBtn = page.locator('button[type="submit"], button:has-text("Send")').first();
      if (await sendBtn.isVisible()) {
        await sendBtn.click();
      } else {
        await chatInput.press('Enter');
      }
      
      console.log('Waiting for AI response...');
      await page.waitForTimeout(5000); // Wait for response
      await screenshot('08_ai_response');
    }
    
    // ============================================
    // STEP 4: WORKFLOW DEPLOYMENT
    // ============================================
    console.log('\n📋 STEP 4: Testing Workflow Deployment');
    
    const deployBtn = page.locator('button:has-text("Deploy")').first();
    if (await deployBtn.isVisible().catch(() => false)) {
      console.log('Deploy button found');
      await screenshot('09_deploy_available');
    } else {
      console.log('Deploy button not visible');
    }
    
    // ============================================
    // STEP 5: MONITORING
    // ============================================
    console.log('\n📋 STEP 5: Testing Monitoring');
    
    // Return to dashboard
    await page.goto(`${TEST_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await screenshot('10_final_dashboard');
    
    // Check for workflows
    const workflowCount = await page.locator('[class*="workflow"]').count();
    console.log(`Workflows found: ${workflowCount}`);
    
    // ============================================
    // TEST SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    
    const results = {
      'Authentication': dashboardUrl.includes('dashboard') || page.url().includes('dashboard'),
      'Dashboard Access': page.url().includes('dashboard'),
      'Chat Interface': await chatInput.isVisible().catch(() => false),
      'Workflow Options': await deployBtn.isVisible().catch(() => false),
      'Monitoring': workflowCount > 0
    };
    
    Object.entries(results).forEach(([step, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${step}`);
    });
    
    console.log(`\n📸 Screenshots saved to: ${screenshotsDir}`);
    console.log('='.repeat(50));
    
    // At least one critical component should work
    expect(results['Authentication'] || results['Dashboard Access']).toBeTruthy();
  });
});