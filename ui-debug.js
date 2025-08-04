import { chromium } from '@playwright/test';
import { promises as fs } from 'fs';

async function debugUIElements() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🔍 Debugging UI Elements...');
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Check what page we're on
    const currentUrl = page.url();
    const title = await page.title();
    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`📄 Page Title: ${title}`);
    
    // Check for auth elements
    const authElements = await page.evaluate(() => {
      return {
        emailInput: !!document.querySelector('input[type="email"]'),
        passwordInput: !!document.querySelector('input[type="password"]'),
        submitButton: !!document.querySelector('button[type="submit"]'),
        loginForm: !!document.querySelector('form'),
        authText: document.body.textContent.includes('Sign in') || document.body.textContent.includes('Login')
      };
    });
    
    console.log('🔐 Auth Elements:', authElements);
    
    // Take screenshot of current state
    await page.screenshot({ 
      path: '/root/repo/screenshots/debug-current-page.png',
      fullPage: true 
    });
    
    // Try to navigate directly to dashboard
    console.log('🎯 Navigating to dashboard...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const dashboardUrl = page.url();
    console.log(`📍 Dashboard URL: ${dashboardUrl}`);
    
    // Check for dashboard elements
    const dashboardElements = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const classNames = Array.from(allElements).map(el => el.className).filter(c => c);
      
      return {
        hasLayout: !!document.querySelector('[class*="layout"], [class*="sidebar"], [class*="nav"]'),
        hasSidebar: !!document.querySelector('[class*="lg:fixed"], [class*="sidebar"]'),
        hasBottomNav: !!document.querySelector('[class*="bottom-0"], [class*="fixed"]'),
        hasGradients: !!document.querySelector('[class*="gradient"]'),
        hasCards: !!document.querySelector('[class*="card"], [class*="bg-"]'),
        totalElements: allElements.length,
        uniqueClasses: [...new Set(classNames)].slice(0, 20) // First 20 unique classes for debugging
      };
    });
    
    console.log('🎨 Dashboard Elements:', dashboardElements);
    
    // Take dashboard screenshot
    await page.screenshot({ 
      path: '/root/repo/screenshots/debug-dashboard.png',
      fullPage: true 
    });
    
    // Check HTML structure
    const htmlStructure = await page.evaluate(() => {
      const body = document.body;
      const mainElements = Array.from(body.children).map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        childrenCount: el.children.length
      }));
      
      return {
        bodyClasses: body.className,
        mainElements: mainElements,
        hasReactRoot: !!document.querySelector('#root'),
        bodyInnerText: body.innerText.substring(0, 200) // First 200 chars
      };
    });
    
    console.log('🏗️  HTML Structure:', htmlStructure);
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await browser.close();
  }
}

debugUIElements().catch(console.error);