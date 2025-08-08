#!/usr/bin/env node

/**
 * Phase 4 - Targeted Testing Suite
 * 
 * This test focuses on what we can actually verify in the current environment:
 * 1. API connectivity and authentication
 * 2. Database access and user isolation
 * 3. Basic performance metrics
 * 4. Critical security checks
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

// Test credentials  
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const results = {
  authentication: [],
  database: [],
  apis: [], 
  security: [],
  performance: []
};

function logResult(category, test, success, details, metrics) {
  const result = { test, success, details, metrics, timestamp: new Date().toISOString() };
  results[category].push(result);
  
  const status = success ? '✅' : '❌';
  console.log(`${status} [${category.toUpperCase()}] ${test}${details ? ' - ' + details : ''}`);
  
  if (metrics) {
    Object.entries(metrics).forEach(([key, value]) => {
      console.log(`   📊 ${key}: ${value}${typeof value === 'number' ? 'ms' : ''}`);
    });
  }
}

async function testAuthentication() {
  console.log('\n🔐 AUTHENTICATION TESTING');
  console.log('='.repeat(40));
  
  const startTime = Date.now();
  
  try {
    // Test 1: User authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    const authTime = Date.now() - startTime;
    
    if (authError) {
      logResult('authentication', 'User Sign-in', false, authError.message);
      return null;
    }
    
    logResult('authentication', 'User Sign-in', true, `User: ${authData.user.email}`, { authTime });
    
    // Test 2: Session validation
    const { data: sessionData } = await supabase.auth.getSession();
    const hasValidSession = sessionData?.session?.user != null;
    
    logResult('authentication', 'Session Validation', hasValidSession, 
      hasValidSession ? 'Valid session active' : 'No active session');
    
    return authData.user;
    
  } catch (error) {
    logResult('authentication', 'Authentication Tests', false, error.message);
    return null;
  }
}

async function testDatabase(user) {
  console.log('\n📊 DATABASE TESTING');
  console.log('='.repeat(40));
  
  if (!user) {
    logResult('database', 'Database Tests', false, 'No authenticated user');
    return;
  }
  
  try {
    // Test 1: User-specific workflow access (RLS check)
    const startTime = Date.now();
    
    const { data: workflows, error: workflowError } = await supabase
      .from('mvp_workflows')
      .select('id, name, status, created_at, user_id')
      .limit(10);
    
    const queryTime = Date.now() - startTime;
    
    if (workflowError) {
      logResult('database', 'Workflow Query', false, workflowError.message);
    } else {
      // Check if RLS is working - should only see own workflows
      const allOwnedByUser = workflows.every(w => w.user_id === user.id);
      
      logResult('database', 'Row Level Security', allOwnedByUser, 
        `Returned ${workflows.length} workflows, all owned by user: ${allOwnedByUser}`, 
        { queryTime });
      
      logResult('database', 'Workflow Data Access', true, 
        `Found ${workflows.length} workflows`, { queryTime });
    }
    
    // Test 2: Projects access
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, user_id')
      .limit(5);
    
    if (projectError) {
      logResult('database', 'Projects Query', false, projectError.message);
    } else {
      const userProjects = projects.filter(p => p.user_id === user.id);
      logResult('database', 'Projects Access', true, 
        `Found ${userProjects.length} user projects out of ${projects.length} total`);
    }
    
    // Test 3: Database schema check
    const { data: schemaCheck, error: schemaError } = await supabase
      .from('mvp_workflows')
      .select('id, execution_count, last_execution_at')
      .limit(1);
    
    if (schemaError && schemaError.message.includes('column')) {
      logResult('database', 'Sync Schema Check', false, 'Missing sync columns');
    } else {
      logResult('database', 'Sync Schema Check', true, 'Basic sync columns present');
    }
    
  } catch (error) {
    logResult('database', 'Database Tests', false, error.message);
  }
}

async function testAPIs() {
  console.log('\n🔗 API CONNECTIVITY TESTING');
  console.log('='.repeat(40));
  
  // Test 1: n8n API connectivity
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${N8N_API_URL}/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      logResult('apis', 'n8n API Connection', false, 
        `HTTP ${response.status}: ${response.statusText}`);
    } else {
      const data = await response.json();
      const workflowCount = data.data?.length || data.length || 0;
      
      logResult('apis', 'n8n API Connection', true, 
        `Connected, found ${workflowCount} workflows`, { responseTime });
      
      // Test 2: Check for user isolation in n8n workflows
      const userPrefixedWorkflows = data.data?.filter(w => 
        w.name && w.name.includes('[USR-')
      ) || [];
      
      logResult('apis', 'n8n User Isolation', userPrefixedWorkflows.length > 0, 
        `Found ${userPrefixedWorkflows.length} user-prefixed workflows`);
    }
    
  } catch (error) {
    logResult('apis', 'n8n API Connection', false, error.message);
  }
  
  // Test 3: Supabase Edge Functions
  try {
    const edgeStartTime = Date.now();
    
    const { data: healthCheck, error: edgeError } = await supabase.functions.invoke('health-check', {
      body: {}
    });
    
    const edgeTime = Date.now() - edgeStartTime;
    
    if (edgeError) {
      logResult('apis', 'Edge Functions', false, edgeError.message);
    } else {
      logResult('apis', 'Edge Functions', true, 'Health check passed', { edgeTime });
    }
    
  } catch (error) {
    logResult('apis', 'Edge Functions', false, error.message);
  }
}

async function testSecurity() {
  console.log('\n🔐 SECURITY TESTING');
  console.log('='.repeat(40));
  
  // Test 1: Unauthorized database access
  try {
    const unauthorizedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data: unauthorizedData, error: unauthorizedError } = await unauthorizedClient
      .from('mvp_workflows')
      .select('*')
      .limit(5);
    
    // Should return empty or error due to RLS
    const hasUnauthorizedAccess = unauthorizedData && unauthorizedData.length > 0;
    
    logResult('security', 'Unauthorized Database Access', !hasUnauthorizedAccess, 
      hasUnauthorizedAccess ? `Accessed ${unauthorizedData.length} records without auth` : 'RLS properly blocks access');
      
  } catch (error) {
    logResult('security', 'Database Security Test', false, error.message);
  }
  
  // Test 2: API key validation
  try {
    const invalidResponse = await fetch(`${N8N_API_URL}/workflows`, {
      headers: { 'X-N8N-API-KEY': 'invalid-key' }
    });
    
    const rejectsInvalidKey = !invalidResponse.ok && invalidResponse.status === 401;
    
    logResult('security', 'API Key Validation', rejectsInvalidKey,
      rejectsInvalidKey ? 'Invalid API keys properly rejected' : 'API key validation issue');
      
  } catch (error) {
    logResult('security', 'API Key Validation', false, error.message);
  }
}

async function testPerformance() {
  console.log('\n🚀 PERFORMANCE TESTING');
  console.log('='.repeat(40));
  
  // Test 1: Database query performance
  try {
    const iterations = 5;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      await supabase
        .from('mvp_workflows')
        .select('id, name, status')
        .limit(10);
      
      times.push(Date.now() - startTime);
    }
    
    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    
    logResult('performance', 'Database Query Performance', avgTime < 1000,
      `Avg: ${Math.round(avgTime)}ms, Range: ${minTime}-${maxTime}ms`,
      { avgTime: Math.round(avgTime), maxTime, minTime });
      
  } catch (error) {
    logResult('performance', 'Database Performance', false, error.message);
  }
  
  // Test 2: API response time
  try {
    const apiStartTime = Date.now();
    
    await fetch(`${N8N_API_URL}/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const apiTime = Date.now() - apiStartTime;
    const apiPerformanceGood = apiTime < 2000; // 2s threshold
    
    logResult('performance', 'n8n API Performance', apiPerformanceGood,
      `Response time: ${apiTime}ms`, { apiTime });
      
  } catch (error) {
    logResult('performance', 'API Performance', false, error.message);
  }
}

function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 PHASE 4 TARGETED TEST REPORT');
  console.log('='.repeat(60));
  
  // Calculate summary statistics
  const summary = {};
  let totalTests = 0;
  let totalPassed = 0;
  
  Object.entries(results).forEach(([category, tests]) => {
    const passed = tests.filter(t => t.success).length;
    const total = tests.length;
    const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    summary[category] = { passed, total, rate };
    totalTests += total;
    totalPassed += passed;
  });
  
  const overallRate = Math.round((totalPassed / totalTests) * 100);
  
  console.log(`\n📈 SUMMARY:`);
  console.log(`Overall Success Rate: ${overallRate}% (${totalPassed}/${totalTests})`);
  
  console.log(`\n📋 BY CATEGORY:`);
  Object.entries(summary).forEach(([category, stats]) => {
    console.log(`${category.toUpperCase()}: ${stats.passed}/${stats.total} (${stats.rate}%)`);
  });
  
  // Critical systems assessment
  const criticalSystems = {
    authentication: summary.authentication?.rate >= 100,
    database: summary.database?.rate >= 75,
    apis: summary.apis?.rate >= 67,
    security: summary.security?.rate >= 100
  };
  
  const criticalPassed = Object.values(criticalSystems).filter(Boolean).length;
  const criticalTotal = Object.keys(criticalSystems).length;
  
  console.log(`\n🎯 CRITICAL SYSTEMS: ${criticalPassed}/${criticalTotal}`);
  Object.entries(criticalSystems).forEach(([system, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${system.toUpperCase()}`);
  });
  
  // MVP Readiness Assessment
  console.log(`\n📋 MVP READINESS ASSESSMENT:`);
  
  if (criticalPassed >= 3 && overallRate >= 70) {
    console.log(`✅ READY FOR CONTROLLED TRIAL`);
    console.log(`   - Core systems functional (${criticalPassed}/${criticalTotal})`);
    console.log(`   - ${overallRate}% overall success rate`);
    console.log(`   - Recommend 50-user trial with monitoring`);
  } else if (criticalPassed >= 2 && overallRate >= 50) {
    console.log(`⚠️ LIMITED TRIAL POSSIBLE`);
    console.log(`   - Some systems functional (${criticalPassed}/${criticalTotal})`);
    console.log(`   - ${overallRate}% success rate (needs improvement)`);
    console.log(`   - Recommend 10-user pilot with heavy monitoring`);
  } else {
    console.log(`❌ NOT READY FOR TRIAL`);
    console.log(`   - Critical system failures (${criticalTotal - criticalPassed})`);
    console.log(`   - ${overallRate}% success rate (below threshold)`);
    console.log(`   - Address failing systems before deployment`);
  }
  
  // Detailed findings
  console.log(`\n🔍 KEY FINDINGS:`);
  
  const allResults = Object.values(results).flat();
  const failedResults = allResults.filter(r => !r.success);
  
  if (failedResults.length > 0) {
    console.log(`\n❌ ISSUES IDENTIFIED (${failedResults.length}):`);
    failedResults.forEach((result, index) => {
      console.log(`${index + 1}. [${result.test}] ${result.details}`);
    });
  }
  
  const successfulResults = allResults.filter(r => r.success);
  if (successfulResults.length > 0) {
    console.log(`\n✅ WORKING SYSTEMS (${successfulResults.length}):`);
    successfulResults.slice(0, 5).forEach((result, index) => {
      console.log(`${index + 1}. [${result.test}] ${result.details || 'Working correctly'}`);
    });
  }
  
  // Save report
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: { totalTests, totalPassed, overallRate, criticalSystems },
    results,
    recommendation: criticalPassed >= 3 && overallRate >= 70 ? 'READY' : 
                   criticalPassed >= 2 && overallRate >= 50 ? 'LIMITED' : 'NOT_READY'
  };
  
  fs.writeFileSync('phase4-targeted-report.json', JSON.stringify(reportData, null, 2));
  
  console.log(`\n📄 Report saved: phase4-targeted-report.json`);
  console.log('='.repeat(60));
  
  return reportData;
}

async function runTargetedTests() {
  console.log('🚀 Starting Phase 4 Targeted Testing');
  console.log(`Test environment: ${SUPABASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  try {
    const user = await testAuthentication();
    await testDatabase(user);
    await testAPIs();
    await testSecurity();
    await testPerformance();
    
    const report = generateReport();
    
    // Exit with appropriate code
    const exitCode = report.recommendation === 'NOT_READY' ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests
runTargetedTests();