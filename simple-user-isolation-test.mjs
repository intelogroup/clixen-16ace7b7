#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://127.0.0.1:8081';
const EXISTING_USER = {
  email: 'jayveedz19@gmail.com',
  password: 'Goldyear2023#'
};

const SCREENSHOTS_DIR = path.join(__dirname, 'user-isolation-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function takeScreenshot(page, name) {
  const filename = `${Date.now()}_${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot: ${filename}`);
  return filepath;
}

async function extractDashboardInfo(page) {
  return await page.evaluate(() => {
    // Extract visible text content
    const workflows = Array.from(document.querySelectorAll('*'))
      .filter(el => el.textContent.match(/workflow/i))
      .map(el => el.textContent.trim())
      .filter(text => text.length > 0 && text.length < 100)
      .slice(0, 10);
    
    const projects = Array.from(document.querySelectorAll('*'))
      .filter(el => el.textContent.match(/project|automation|pipeline|bot/i))
      .map(el => el.textContent.trim())
      .filter(text => text.length > 5 && text.length < 50)
      .slice(0, 10);
    
    // Get statistics numbers
    const numbers = Array.from(document.querySelectorAll('*'))
      .map(el => el.textContent.match(/\d+/))
      .filter(match => match)
      .map(match => match[0])
      .slice(0, 10);
    
    // Get user info
    const userInfo = {
      currentUrl: window.location.href,
      pageTitle: document.title,
      hasUserProfile: document.querySelector('[class*="user"], [class*="profile"]') !== null
    };
    
    return {
      workflows,
      projects,
      numbers,
      userInfo,
      pageContent: document.body.innerText.substring(0, 300)
    };
  });
}

async function loginUser(page, user) {
  console.log(`🔐 Logging in user: ${user.email}`);
  
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await takeScreenshot(page, 'login_page');
  
  const emailInput = await page.$('input[type="email"]');
  const passwordInput = await page.$('input[type="password"]');
  
  if (emailInput && passwordInput) {
    await emailInput.type(user.email);
    await passwordInput.type(user.password);
    
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
    } else {
      await passwordInput.press('Enter');
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    const url = page.url();
    
    if (url.includes('dashboard')) {
      console.log('✅ Successfully logged in');
      return true;
    }
  }
  
  console.log('⚠️ Login failed or redirected elsewhere');
  return false;
}

async function testUserIsolation() {
  console.log('\n🔒 TESTING USER DATA ISOLATION\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    // Test 1: Authenticated user dashboard
    console.log('📋 TEST 1: Authenticated User Dashboard');
    const page1 = await browser.newPage();
    
    const loginSuccess = await loginUser(page1, EXISTING_USER);
    
    if (loginSuccess) {
      await page1.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
      await takeScreenshot(page1, 'authenticated_dashboard');
      
      const authenticatedData = await extractDashboardInfo(page1);
      console.log('\n📊 Authenticated User Data:');
      console.log(`- Projects found: ${authenticatedData.projects.length}`);
      console.log(`- Workflows found: ${authenticatedData.workflows.length}`);
      console.log(`- Numbers displayed: ${authenticatedData.numbers.join(', ')}`);
      console.log(`- Page URL: ${authenticatedData.userInfo.currentUrl}`);
      
      await page1.close();
      
      // Test 2: Unauthenticated access attempt
      console.log('\n📋 TEST 2: Unauthenticated Access Attempt');
      const page2 = await browser.newPage();
      
      // Try to access dashboard directly without authentication
      await page2.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
      await takeScreenshot(page2, 'unauthenticated_dashboard_attempt');
      
      const unauthenticatedData = await extractDashboardInfo(page2);
      console.log('\n📊 Unauthenticated Access Data:');
      console.log(`- Projects found: ${unauthenticatedData.projects.length}`);
      console.log(`- Workflows found: ${unauthenticatedData.workflows.length}`);
      console.log(`- Numbers displayed: ${unauthenticatedData.numbers.join(', ')}`);
      console.log(`- Page URL: ${unauthenticatedData.userInfo.currentUrl}`);
      console.log(`- Page content preview: ${unauthenticatedData.pageContent.substring(0, 100)}...`);
      
      await page2.close();
      
      // Test 3: Fresh session (incognito-like)
      console.log('\n📋 TEST 3: Fresh Browser Session');
      const page3 = await browser.newPage();
      
      // Clear all storage
      await page3.evaluateOnNewDocument(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      await page3.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await takeScreenshot(page3, 'fresh_session');
      
      const freshSessionData = await extractDashboardInfo(page3);
      console.log('\n📊 Fresh Session Data:');
      console.log(`- Page URL: ${freshSessionData.userInfo.currentUrl}`);
      console.log(`- Page content preview: ${freshSessionData.pageContent.substring(0, 100)}...`);
      
      await page3.close();
      
      // Analysis
      console.log('\n' + '='.repeat(50));
      console.log('🔍 SECURITY ANALYSIS');
      console.log('='.repeat(50));
      
      // Check if unauthenticated users can see authenticated data
      const hasUnauthorizedData = (
        unauthenticatedData.projects.length > 0 || 
        unauthenticatedData.workflows.length > 2 ||
        unauthenticatedData.userInfo.currentUrl.includes('dashboard')
      );
      
      if (hasUnauthorizedData) {
        console.log('❌ SECURITY ISSUE: Unauthenticated users can access dashboard data');
        console.log('⚠️ This indicates potential data leakage or insufficient authentication checks');
      } else {
        console.log('✅ SECURITY PASSED: Unauthenticated users properly redirected');
        console.log('✅ Dashboard data only accessible to authenticated users');
      }
      
      // Check if fresh sessions show the same data
      const freshSessionShowsData = freshSessionData.userInfo.currentUrl.includes('dashboard');
      
      if (freshSessionShowsData) {
        console.log('⚠️ WARNING: Fresh sessions can access dashboard - check authentication');
      } else {
        console.log('✅ AUTHENTICATION: Fresh sessions properly require login');
      }
      
    } else {
      console.log('❌ Could not test user isolation - authentication failed');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log(`\n📸 Screenshots saved to: ${SCREENSHOTS_DIR}`);
}

testUserIsolation().catch(console.error);