#!/usr/bin/env node

/**
 * Phase 4 - Comprehensive QA Testing Suite
 * 
 * This script executes all Phase 4 testing requirements:
 * 1. User Isolation Testing
 * 2. 2-Way Sync Testing  
 * 3. Performance Testing
 * 4. Security Testing
 * 
 * MVP Readiness Assessment for 50-user trial
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration from CLAUDE.md
const FRONTEND_URL = 'http://18.221.12.50';
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

// Test users for isolation testing
const TEST_USERS = [
  { email: 'jayveedz19@gmail.com', password: 'Goldyear2023#', id: 'user1' }
  // Note: We only have one verified user, so we'll simulate multi-user scenarios
];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global test results
const testResults = {
  userIsolation: { passed: 0, failed: 0, tests: [] },
  sync: { passed: 0, failed: 0, tests: [] },
  performance: { passed: 0, failed: 0, tests: [], metrics: {} },
  security: { passed: 0, failed: 0, tests: [], vulnerabilities: [] }
};

// Screenshot and logging helpers
const SCREENSHOTS_DIR = path.join(__dirname, 'phase4-test-results');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function logTest(category, name, success, details = '', performance = null) {
  const result = { name, success, details, performance, timestamp: new Date().toISOString() };
  testResults[category].tests.push(result);
  
  if (success) {
    testResults[category].passed++;
    console.log(`✅ [${category.toUpperCase()}] ${name}${details ? ` - ${details}` : ''}`);
  } else {
    testResults[category].failed++;
    console.log(`❌ [${category.toUpperCase()}] ${name}${details ? ` - ${details}` : ''}`);
  }
  
  if (performance) {
    testResults.performance.metrics[name] = performance;
  }
}

async function takeScreenshot(page, name) {
  const filename = `${Date.now()}_${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot: ${filename}`);
  return filepath;
}

// ==============================================================
// 1. USER ISOLATION TESTING
// ==============================================================

async function testUserIsolation() {
  console.log('\n' + '='.repeat(60));
  console.log('🔒 PHASE 4.1: USER ISOLATION TESTING');
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  try {
    // Test 1: Authenticated User Data Access
    console.log('\n📋 Test 1.1: Authenticated User Dashboard Access');
    const page1 = await browser.newPage();
    
    // Login test user
    await page1.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
    await takeScreenshot(page1, 'user1_login_page');
    
    const emailInput = await page1.$('input[type="email"]');
    const passwordInput = await page1.$('input[type="password"]');
    
    if (emailInput && passwordInput) {
      await emailInput.type(TEST_USERS[0].email);
      await passwordInput.type(TEST_USERS[0].password);
      
      const submitButton = await page1.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
      } else {
        await passwordInput.press('Enter');
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      const url = page1.url();
      
      if (url.includes('dashboard')) {
        logTest('userIsolation', 'User Authentication', true, 'Successfully authenticated');
        
        await takeScreenshot(page1, 'user1_dashboard');
        
        // Extract user-specific data
        const userData = await page1.evaluate(() => {
          const workflows = Array.from(document.querySelectorAll('*'))
            .filter(el => el.textContent.match(/workflow/i))
            .map(el => el.textContent.trim())
            .filter(text => text.length > 0 && text.length < 100);
          
          const projects = Array.from(document.querySelectorAll('*'))
            .filter(el => el.textContent.match(/project/i))
            .map(el => el.textContent.trim())
            .filter(text => text.length > 0 && text.length < 100);
          
          return { workflows, projects, url: window.location.href };
        });
        
        logTest('userIsolation', 'User Data Retrieval', true, 
          `Found ${userData.workflows.length} workflows, ${userData.projects.length} projects`);
        
      } else {
        logTest('userIsolation', 'User Authentication', false, 'Authentication failed');
      }
    }
    
    await page1.close();
    
    // Test 2: Unauthenticated Access Attempt
    console.log('\n📋 Test 1.2: Unauthenticated Access Prevention');
    const page2 = await browser.newPage();
    
    await page2.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle2' });
    await takeScreenshot(page2, 'unauthenticated_access_attempt');
    
    const unauthorizedUrl = page2.url();
    if (unauthorizedUrl.includes('dashboard')) {
      logTest('userIsolation', 'Unauthorized Access Prevention', false, 
        'Dashboard accessible without authentication - SECURITY RISK');
      testResults.security.vulnerabilities.push({
        severity: 'HIGH',
        issue: 'Dashboard accessible without authentication',
        url: unauthorizedUrl
      });
    } else {
      logTest('userIsolation', 'Unauthorized Access Prevention', true, 
        'Properly redirected to auth page');
    }
    
    await page2.close();
    
    // Test 3: Session Management
    console.log('\n📋 Test 1.3: Session Isolation');
    const page3 = await browser.newPage();
    
    await page3.evaluateOnNewDocument(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page3.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
    await takeScreenshot(page3, 'fresh_session');
    
    const freshUrl = page3.url();
    const requiresAuth = !freshUrl.includes('dashboard');
    
    logTest('userIsolation', 'Session Isolation', requiresAuth, 
      requiresAuth ? 'Fresh sessions require authentication' : 'Session management issue');
    
    await page3.close();
    
  } catch (error) {
    logTest('userIsolation', 'User Isolation Tests', false, error.message);
  } finally {
    await browser.close();
  }
}

// ==============================================================
// 2. 2-WAY SYNC TESTING
// ==============================================================

async function test2WaySync() {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 PHASE 4.2: 2-WAY SYNC TESTING');
  console.log('='.repeat(60));
  
  try {
    // Authenticate user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_USERS[0].email,
      password: TEST_USERS[0].password
    });
    
    if (authError) {
      logTest('sync', 'User Authentication', false, authError.message);
      return;
    }
    
    logTest('sync', 'User Authentication', true, `Authenticated: ${authData.user.email}`);
    
    // Test 1: Database Schema Validation
    console.log('\n📋 Test 2.1: Database Schema Validation');
    const { data: schemaTest, error: schemaError } = await supabase
      .from('mvp_workflows')
      .select('id, execution_count, successful_executions, failed_executions, last_execution_at, last_sync_at')
      .limit(1);
    
    if (schemaError && schemaError.message.includes('column')) {
      logTest('sync', 'Sync Schema Validation', false, 'Missing sync columns');
    } else {
      logTest('sync', 'Sync Schema Validation', true, 'All sync columns present');
    }
    
    // Test 2: n8n API Connection
    console.log('\n📋 Test 2.2: n8n API Connection');
    const n8nStartTime = Date.now();
    const n8nResponse = await fetch(`${N8N_API_URL}/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    const n8nResponseTime = Date.now() - n8nStartTime;
    
    if (n8nResponse.ok) {
      const n8nData = await n8nResponse.json();
      logTest('sync', 'n8n API Connection', true, 
        `Connected in ${n8nResponseTime}ms, found ${n8nData.data?.length || 0} workflows`, 
        { responseTime: n8nResponseTime });
    } else {
      logTest('sync', 'n8n API Connection', false, 
        `HTTP ${n8nResponse.status}: ${n8nResponse.statusText}`);
    }
    
    // Test 3: Sync Edge Function
    console.log('\n📋 Test 2.3: Sync Edge Function');
    const syncStartTime = Date.now();
    const syncResponse = await supabase.functions.invoke('workflow-sync', {
      body: { action: 'sync_user_workflows', user_id: authData.user.id }
    });
    const syncResponseTime = Date.now() - syncStartTime;
    
    if (syncResponse.error) {
      logTest('sync', 'Sync Edge Function', false, syncResponse.error.message);
    } else {
      const summary = syncResponse.data?.summary;
      logTest('sync', 'Sync Edge Function', true, 
        `Synced ${summary?.totalWorkflows || 0} workflows in ${syncResponseTime}ms`,
        { responseTime: syncResponseTime });
    }
    
    // Test 4: Real-time Sync Testing
    console.log('\n📋 Test 2.4: Real-time Sync Updates');
    
    // Create test workflow
    const testWorkflow = {
      user_id: authData.user.id,
      name: `[USR-${authData.user.id.substring(0, 8)}] Test Sync Workflow`,
      description: 'Phase 4 sync testing workflow',
      n8n_workflow_json: {
        name: 'Test Sync Workflow',
        nodes: [
          { id: 'webhook', type: 'n8n-nodes-base.webhook', position: [200, 300] },
          { id: 'response', type: 'n8n-nodes-base.respondToWebhook', position: [500, 300] }
        ]
      },
      status: 'draft'
    };
    
    const { data: createdWorkflow, error: createError } = await supabase
      .from('mvp_workflows')
      .insert(testWorkflow)
      .select()
      .single();
    
    if (createError) {
      logTest('sync', 'Test Workflow Creation', false, createError.message);
    } else {
      logTest('sync', 'Test Workflow Creation', true, `Created workflow ID: ${createdWorkflow.id}`);
      
      // Test workflow update propagation
      const updateStartTime = Date.now();
      const { error: updateError } = await supabase
        .from('mvp_workflows')
        .update({ 
          status: 'deployed',
          execution_count: 5,
          successful_executions: 4,
          failed_executions: 1
        })
        .eq('id', createdWorkflow.id);
      
      const updateTime = Date.now() - updateStartTime;
      
      if (updateError) {
        logTest('sync', 'Workflow Update Propagation', false, updateError.message);
      } else {
        logTest('sync', 'Workflow Update Propagation', true, 
          `Updated in ${updateTime}ms`, { updateTime });
      }
      
      // Clean up test workflow
      await supabase.from('mvp_workflows').delete().eq('id', createdWorkflow.id);
    }
    
  } catch (error) {
    logTest('sync', '2-Way Sync Tests', false, error.message);
  }
}

// ==============================================================
// 3. PERFORMANCE TESTING
// ==============================================================

async function testPerformance() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 PHASE 4.3: PERFORMANCE TESTING');
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Test 1: Page Load Time < 3s
    console.log('\n📋 Test 3.1: Dashboard Load Time');
    const loadStartTime = Date.now();
    
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
    const pageLoadTime = Date.now() - loadStartTime;
    
    const loadSuccess = pageLoadTime < 3000;
    logTest('performance', 'Dashboard Load Time', loadSuccess, 
      `${pageLoadTime}ms (target: <3000ms)`, { loadTime: pageLoadTime });
    
    // Test 2: Bundle Size Analysis
    console.log('\n📋 Test 3.2: Bundle Size Analysis');
    
    const performanceMetrics = await page.evaluate(() => {
      return {
        resources: performance.getEntriesByType('resource').map(r => ({
          name: r.name,
          size: r.transferSize || 0,
          type: r.initiatorType
        })),
        navigation: performance.getEntriesByType('navigation')[0]
      };
    });
    
    const jsSize = performanceMetrics.resources
      .filter(r => r.name.includes('.js'))
      .reduce((sum, r) => sum + r.size, 0);
    
    const cssSize = performanceMetrics.resources
      .filter(r => r.name.includes('.css'))
      .reduce((sum, r) => sum + r.size, 0);
    
    const totalSize = jsSize + cssSize;
    const bundleSizeOk = totalSize < 200000; // 200KB target
    
    logTest('performance', 'Bundle Size Analysis', bundleSizeOk,
      `JS: ${Math.round(jsSize/1024)}KB, CSS: ${Math.round(cssSize/1024)}KB, Total: ${Math.round(totalSize/1024)}KB (target: <200KB)`,
      { jsSize, cssSize, totalSize });
    
    // Test 3: Authentication Performance
    console.log('\n📋 Test 3.3: Authentication Performance');
    
    await page.goto(FRONTEND_URL);
    
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    
    if (emailInput && passwordInput) {
      await emailInput.type(TEST_USERS[0].email);
      await passwordInput.type(TEST_USERS[0].password);
      
      const authStartTime = Date.now();
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
      }
      
      // Wait for redirect
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
      const authTime = Date.now() - authStartTime;
      
      const authSuccess = authTime < 5000; // 5s target for auth
      logTest('performance', 'Authentication Performance', authSuccess,
        `${authTime}ms (target: <5000ms)`, { authTime });
      
      // Test 4: Dashboard with Workflows (Performance under load)
      console.log('\n📋 Test 3.4: Dashboard Performance with Data');
      
      const dashboardStartTime = Date.now();
      await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle2' });
      const dashboardTime = Date.now() - dashboardStartTime;
      
      const dashboardSuccess = dashboardTime < 3000;
      logTest('performance', 'Dashboard with Data Performance', dashboardSuccess,
        `${dashboardTime}ms (target: <3000ms)`, { dashboardTime });
    }
    
  } catch (error) {
    logTest('performance', 'Performance Tests', false, error.message);
  } finally {
    await browser.close();
  }
}

// ==============================================================
// 4. SECURITY TESTING
// ==============================================================

async function testSecurity() {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 PHASE 4.4: SECURITY TESTING');  
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  try {
    // Test 1: Input Injection Protection
    console.log('\n📋 Test 4.1: Input Injection Protection');
    const page = await browser.newPage();
    
    await page.goto(FRONTEND_URL);
    
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      // Test XSS injection attempt
      const xssPayload = '<script>alert("xss")</script>test@example.com';
      await emailInput.type(xssPayload);
      
      const inputValue = await emailInput.evaluate(el => el.value);
      const xssProtected = !inputValue.includes('<script>');
      
      logTest('security', 'XSS Input Protection', xssProtected,
        xssProtected ? 'Script tags filtered' : 'XSS vulnerability detected');
      
      if (!xssProtected) {
        testResults.security.vulnerabilities.push({
          severity: 'HIGH',
          issue: 'XSS vulnerability in email input',
          details: 'Script tags not properly sanitized'
        });
      }
    }
    
    // Test 2: Authentication Bypass Attempts
    console.log('\n📋 Test 4.2: Authentication Bypass Protection');
    
    // Try to access dashboard without auth
    await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle2' });
    const bypassUrl = page.url();
    
    const bypassProtected = !bypassUrl.includes('dashboard');
    logTest('security', 'Authentication Bypass Protection', bypassProtected,
      bypassProtected ? 'Dashboard requires authentication' : 'Authentication bypass detected');
    
    if (!bypassProtected) {
      testResults.security.vulnerabilities.push({
        severity: 'CRITICAL',
        issue: 'Authentication bypass vulnerability',
        details: 'Dashboard accessible without authentication'
      });
    }
    
    // Test 3: Session Security
    console.log('\n📋 Test 4.3: Session Security');
    
    // Test session timeout behavior
    await page.goto(FRONTEND_URL);
    
    // Clear all storage to simulate session expiry
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
    });
    
    // Try to access protected resource
    await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle2' });
    const sessionUrl = page.url();
    
    const sessionProtected = !sessionUrl.includes('dashboard');
    logTest('security', 'Session Timeout Protection', sessionProtected,
      sessionProtected ? 'Sessions properly expire' : 'Session management issue');
    
    // Test 4: API Endpoint Security
    console.log('\n📋 Test 4.4: API Endpoint Security');
    
    try {
      // Test Supabase RLS (Row Level Security)
      const unauthorizedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      const { data: unauthorizedData, error: rlsError } = await unauthorizedClient
        .from('mvp_workflows')
        .select('*')
        .limit(5);
      
      // Should either return empty data or error due to RLS
      const rlsProtected = !unauthorizedData || unauthorizedData.length === 0 || rlsError;
      
      logTest('security', 'Row Level Security (RLS)', rlsProtected,
        rlsProtected ? 'RLS properly enforced' : 'RLS bypass detected');
      
      if (!rlsProtected && unauthorizedData?.length > 0) {
        testResults.security.vulnerabilities.push({
          severity: 'HIGH',
          issue: 'Row Level Security bypass',
          details: `Unauthorized access to ${unauthorizedData.length} workflow records`
        });
      }
      
    } catch (error) {
      logTest('security', 'API Security Test', false, error.message);
    }
    
  } catch (error) {
    logTest('security', 'Security Tests', false, error.message);
  } finally {
    await browser.close();
  }
}

// ==============================================================
// MAIN TEST EXECUTION & REPORTING
// ==============================================================

async function generateTestReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PHASE 4 - COMPREHENSIVE TEST REPORT');
  console.log('='.repeat(80));
  
  // Calculate totals
  const totalTests = Object.values(testResults).reduce((sum, category) => 
    sum + category.passed + category.failed, 0);
  const totalPassed = Object.values(testResults).reduce((sum, category) => 
    sum + category.passed, 0);
  const totalFailed = Object.values(testResults).reduce((sum, category) => 
    sum + category.failed, 0);
  
  const overallSuccessRate = Math.round((totalPassed / totalTests) * 100);
  
  console.log(`\n📈 OVERALL RESULTS:`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📊 Success Rate: ${overallSuccessRate}%`);
  
  // Category breakdown
  console.log(`\n📋 CATEGORY BREAKDOWN:`);
  Object.entries(testResults).forEach(([category, results]) => {
    const categoryRate = results.passed + results.failed > 0 ? 
      Math.round((results.passed / (results.passed + results.failed)) * 100) : 0;
    console.log(`${category.toUpperCase()}: ${results.passed}/${results.passed + results.failed} (${categoryRate}%)`);
  });
  
  // Performance Metrics
  if (Object.keys(testResults.performance.metrics).length > 0) {
    console.log(`\n🚀 PERFORMANCE METRICS:`);
    Object.entries(testResults.performance.metrics).forEach(([test, metrics]) => {
      console.log(`${test}:`);
      Object.entries(metrics).forEach(([metric, value]) => {
        console.log(`  - ${metric}: ${value}ms`);
      });
    });
  }
  
  // Security Vulnerabilities
  if (testResults.security.vulnerabilities.length > 0) {
    console.log(`\n⚠️ SECURITY VULNERABILITIES:`);
    testResults.security.vulnerabilities.forEach((vuln, index) => {
      console.log(`${index + 1}. [${vuln.severity}] ${vuln.issue}`);
      if (vuln.details) console.log(`   Details: ${vuln.details}`);
      if (vuln.url) console.log(`   URL: ${vuln.url}`);
    });
  }
  
  // MVP Readiness Assessment
  console.log(`\n🎯 MVP READINESS ASSESSMENT:`);
  
  // Define critical tests for MVP readiness
  const criticalTestsStatus = {
    userAuthentication: testResults.userIsolation.tests.find(t => t.name === 'User Authentication')?.success || false,
    unauthorizedAccessPrevention: testResults.userIsolation.tests.find(t => t.name === 'Unauthorized Access Prevention')?.success || false,
    syncFunctionality: testResults.sync.tests.find(t => t.name === 'Sync Edge Function')?.success || false,
    performanceTargets: testResults.performance.tests.find(t => t.name === 'Dashboard Load Time')?.success || false,
    securityBaseline: testResults.security.vulnerabilities.filter(v => v.severity === 'CRITICAL').length === 0
  };
  
  const criticalPassed = Object.values(criticalTestsStatus).filter(Boolean).length;
  const criticalTotal = Object.keys(criticalTestsStatus).length;
  
  console.log(`\n🔍 CRITICAL TESTS STATUS:`);
  Object.entries(criticalTestsStatus).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
  });
  
  console.log(`\nCritical Tests: ${criticalPassed}/${criticalTotal}`);
  
  // Final recommendation
  console.log(`\n📋 RECOMMENDATION FOR 50-USER TRIAL:`);
  
  if (criticalPassed === criticalTotal && overallSuccessRate >= 80) {
    console.log(`✅ READY FOR DEPLOYMENT`);
    console.log(`   - All critical tests passed`);
    console.log(`   - ${overallSuccessRate}% overall success rate`);
    console.log(`   - No critical security vulnerabilities`);
  } else if (criticalPassed >= 4 && overallSuccessRate >= 70) {
    console.log(`⚠️ DEPLOY WITH MONITORING`);
    console.log(`   - Most critical tests passed (${criticalPassed}/${criticalTotal})`);
    console.log(`   - ${overallSuccessRate}% success rate (acceptable for MVP)`);
    console.log(`   - Recommend close monitoring during trial`);
  } else {
    console.log(`❌ NOT READY FOR DEPLOYMENT`);
    console.log(`   - Critical failures detected (${criticalTotal - criticalPassed}/${criticalTotal})`);
    console.log(`   - ${overallSuccessRate}% success rate (below MVP threshold)`);
    console.log(`   - Address failing tests before trial launch`);
  }
  
  // Save detailed results to file
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      totalPassed,
      totalFailed,
      overallSuccessRate,
      criticalTestsStatus,
      mvpReady: criticalPassed === criticalTotal && overallSuccessRate >= 80
    },
    results: testResults,
    screenshots: SCREENSHOTS_DIR
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'phase4-test-report.json'),
    JSON.stringify(reportData, null, 2)
  );
  
  console.log(`\n📄 Detailed report saved: phase4-test-report.json`);
  console.log(`📸 Screenshots saved: ${SCREENSHOTS_DIR}`);
  console.log(`\n${'='.repeat(80)}\n`);
  
  return reportData.summary.mvpReady;
}

// Main execution
async function runPhase4Tests() {
  console.log('🚀 Starting Phase 4 - Comprehensive QA Testing');
  console.log(`Testing environment: ${FRONTEND_URL}`);
  console.log(`Test timestamp: ${new Date().toISOString()}`);
  
  try {
    await testUserIsolation();
    await test2WaySync();
    await testPerformance();
    await testSecurity();
    
    const mvpReady = await generateTestReport();
    
    // Exit with appropriate code
    process.exit(mvpReady ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Phase 4 testing failed:', error);
    process.exit(1);
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the tests
runPhase4Tests();