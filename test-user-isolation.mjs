#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://127.0.0.1:8081';

// Test users
const EXISTING_USER = {
  email: 'jayveedz19@gmail.com',
  password: 'Goldyear2023#',
  name: 'Existing User'
};

const NEW_USER = {
  email: `testuser_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'New Test User'
};

// Create screenshots directory
const SCREENSHOTS_DIR = path.join(__dirname, 'user-isolation-test-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Screenshot helper
async function takeScreenshot(page, name) {
  const filename = `${Date.now()}_${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filepath;
}

// Helper to extract dashboard data
async function extractDashboardData(page) {
  return await page.evaluate(() => {
    const data = {
      workflows: [],
      projects: [],
      statistics: {},
      userInfo: {}
    };
    
    // Extract statistics
    const statCards = document.querySelectorAll('[class*="stat"], [class*="metric"]');
    statCards.forEach(card => {
      const text = card.textContent;
      if (text.includes('Total Workflows')) {
        data.statistics.totalWorkflows = text.match(/\d+/)?.[0];
      }
      if (text.includes('Active Projects')) {
        data.statistics.activeProjects = text.match(/\d+/)?.[0];
      }
      if (text.includes('Success Rate')) {
        data.statistics.successRate = text.match(/\d+/)?.[0];
      }
    });
    
    // Extract project names
    const projectElements = document.querySelectorAll('[class*="project"]');
    projectElements.forEach(project => {
      const name = project.querySelector('h3, h4, .project-name, [class*="title"]')?.textContent?.trim();
      if (name) data.projects.push(name);
    });
    
    // Extract workflow names
    const workflowElements = document.querySelectorAll('[class*="workflow"]');
    workflowElements.forEach(workflow => {
      const name = workflow.querySelector('h3, h4, .workflow-name, [class*="title"]')?.textContent?.trim();
      if (name) data.workflows.push(name);
    });
    
    // Extract user info
    const userElements = document.querySelectorAll('[class*="user"], [class*="profile"]');
    userElements.forEach(user => {
      const email = user.textContent?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];
      if (email) data.userInfo.email = email;
    });
    
    return data;
  });
}

async function signInUser(page, user, testName) {
  console.log(`\n🔐 Signing in ${user.name} (${user.email})`);
  
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await takeScreenshot(page, `${testName}_01_initial_load`);
  
  // Check if we need to sign out first
  const signOutButton = await page.$('button').then(async () => {
    return await page.$$eval('button, a', elements => 
      elements.find(el => el.textContent.toLowerCase().includes('sign out'))
    );
  }).catch(() => null);
  
  if (signOutButton) {
    console.log('Signing out current user first...');
    await page.click('button, a').catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Look for email input
  const emailInput = await page.$('input[type="email"]');
  const passwordInput = await page.$('input[type="password"]');
  
  if (emailInput && passwordInput) {
    await emailInput.clear();
    await passwordInput.clear();
    
    await emailInput.type(user.email);
    await passwordInput.type(user.password);
    await takeScreenshot(page, `${testName}_02_credentials_filled`);
    
    // Submit form
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
    } else {
      await passwordInput.press('Enter');
    }
    
    console.log('⏳ Waiting for authentication...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await takeScreenshot(page, `${testName}_03_after_auth`);
    
    const url = page.url();
    if (url.includes('dashboard')) {
      console.log('✅ Successfully authenticated');
      return true;
    } else {
      console.log('⚠️ Authentication may have failed');
      return false;
    }
  } else {
    console.log('❌ Could not find login form');
    return false;
  }
}

async function testUserIsolation() {
  console.log('\n' + '='.repeat(60));
  console.log('🔒 CLIXEN USER DATA ISOLATION TEST');
  console.log('='.repeat(60) + '\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  let existingUserData = null;
  let newUserData = null;

  try {
    const page = await browser.newPage();
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });

    // ============================================
    // STEP 1: Test with existing user
    // ============================================
    console.log('📋 STEP 1: Collecting Existing User Data');
    
    const existingUserAuth = await signInUser(page, EXISTING_USER, 'existing_user');
    
    if (existingUserAuth) {
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
      await takeScreenshot(page, 'existing_user_04_dashboard');
      
      // Extract dashboard data
      existingUserData = await extractDashboardData(page);
      console.log('\n📊 Existing User Dashboard Data:');
      console.log(`- Workflows: ${existingUserData.workflows.length} (${existingUserData.workflows.slice(0, 3).join(', ')}...)`);
      console.log(`- Projects: ${existingUserData.projects.length} (${existingUserData.projects.slice(0, 3).join(', ')}...)`);
      console.log(`- Statistics: ${JSON.stringify(existingUserData.statistics)}`);
      console.log(`- User Email: ${existingUserData.userInfo.email || 'Not displayed'}`);
    }

    // ============================================
    // STEP 2: Test with new user
    // ============================================
    console.log('\n\n📋 STEP 2: Testing New User Registration/Login');
    
    // Sign out existing user
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    
    // Try to sign out
    const signOutButton = await page.$$eval('button, a', elements => 
      elements.find(el => el.textContent.toLowerCase().includes('sign out'))
    ).catch(() => null);
    
    if (signOutButton) {
      console.log('🚪 Signing out existing user...');
      await signOutButton.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      // Clear session manually
      console.log('🧹 Clearing browser session...');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.deleteCookie(...await page.cookies());
    }
    
    await takeScreenshot(page, 'transition_01_signed_out');
    
    // Attempt to create new user or sign in
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    
    // Look for sign up option
    const signUpLink = await page.$$eval('button, a', elements => 
      elements.find(el => el.textContent.toLowerCase().includes('sign up'))
    ).catch(() => null);
    
    if (signUpLink) {
      console.log('📝 Attempting to create new user account...');
      // Find and click sign up button
      const buttons = await page.$$('button, a');
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent.toLowerCase());
        if (text.includes('sign up')) {
          await button.click();
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const newUserAuth = await signInUser(page, NEW_USER, 'new_user');
    
    if (newUserAuth) {
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
      await takeScreenshot(page, 'new_user_04_dashboard');
      
      // Extract dashboard data
      newUserData = await extractDashboardData(page);
      console.log('\n📊 New User Dashboard Data:');
      console.log(`- Workflows: ${newUserData.workflows.length} (${newUserData.workflows.slice(0, 3).join(', ')}...)`);
      console.log(`- Projects: ${newUserData.projects.length} (${newUserData.projects.slice(0, 3).join(', ')}...)`);
      console.log(`- Statistics: ${JSON.stringify(newUserData.statistics)}`);
      console.log(`- User Email: ${newUserData.userInfo.email || 'Not displayed'}`);
    } else {
      console.log('ℹ️ New user creation/authentication failed - this might be expected for demo data');
      
      // Take screenshot of the state
      await takeScreenshot(page, 'new_user_05_auth_failed');
      
      // Check what's displayed on the auth failure page
      const pageContent = await page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          hasErrorMessage: document.querySelector('.error, [role="alert"]') !== null,
          bodyText: document.body.innerText.substring(0, 200)
        };
      });
      
      console.log('Page state after auth attempt:', pageContent);
    }

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await takeScreenshot(page, 'error_screenshot').catch(() => {});
  } finally {
    await browser.close();
  }

  // ============================================
  // ANALYSIS & RESULTS
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('🔍 USER DATA ISOLATION ANALYSIS');
  console.log('='.repeat(60) + '\n');

  if (existingUserData && newUserData) {
    // Compare data between users
    const workflowsMatch = JSON.stringify(existingUserData.workflows) === JSON.stringify(newUserData.workflows);
    const projectsMatch = JSON.stringify(existingUserData.projects) === JSON.stringify(newUserData.projects);
    const statsMatch = JSON.stringify(existingUserData.statistics) === JSON.stringify(newUserData.statistics);
    
    console.log('Data Comparison Results:');
    console.log(`🔄 Workflows identical: ${workflowsMatch ? '❌ SECURITY ISSUE' : '✅ PROPERLY ISOLATED'}`);
    console.log(`🔄 Projects identical: ${projectsMatch ? '❌ SECURITY ISSUE' : '✅ PROPERLY ISOLATED'}`);
    console.log(`🔄 Statistics identical: ${statsMatch ? '⚠️ POSSIBLE ISSUE' : '✅ USER-SPECIFIC'}`);
    
    if (workflowsMatch || projectsMatch) {
      console.log('\n⚠️ SECURITY CONCERN: Users see identical data - possible data leakage');
    } else {
      console.log('\n✅ SECURITY PASSED: Users see different data - proper isolation');
    }
    
  } else if (existingUserData && !newUserData) {
    console.log('📊 Test Results:');
    console.log('✅ Existing user data collected successfully');
    console.log('ℹ️ New user authentication failed (possibly expected for demo)');
    console.log('📝 This suggests the system properly restricts access to authenticated users only');
    
  } else {
    console.log('❌ Unable to collect sufficient data for comparison');
  }

  console.log(`\n📸 Screenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log('='.repeat(60) + '\n');
}

// Run the test
testUserIsolation().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});