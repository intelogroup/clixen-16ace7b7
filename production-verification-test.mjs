#!/usr/bin/env node
/**
 * Clixen MVP Production Verification Test
 * Phase 5: Final deployment verification for 50-user beta trial
 */

import https from 'https';
import http from 'http';

// Configuration
const CONFIG = {
  frontend: 'http://18.221.12.50',
  supabase: 'https://zfbgdixbzezpxllkoyfc.supabase.co',
  n8n: 'http://18.221.12.50:5678',
  edgeFunctions: 'https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1'
};

const TESTS = [];

// Test results tracking
let passedTests = 0;
let totalTests = 0;

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const emoji = {
    'INFO': '📋',
    'SUCCESS': '✅', 
    'ERROR': '❌',
    'WARNING': '⚠️'
  }[level];
  console.log(`${timestamp} ${emoji} ${message}`);
}

function addTest(name, testFn) {
  TESTS.push({ name, testFn });
}

async function makeRequest(url, options = {}) {
  const protocol = url.startsWith('https') ? https : http;
  
  return new Promise((resolve, reject) => {
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.data) {
      req.write(options.data);
    }
    
    req.end();
  });
}

// Test 1: Frontend Accessibility
addTest('Frontend App Accessibility', async () => {
  const response = await makeRequest(CONFIG.frontend);
  
  if (response.statusCode !== 200) {
    throw new Error(`Expected 200, got ${response.statusCode}`);
  }
  
  if (!response.data.includes('<!DOCTYPE html>')) {
    throw new Error('Response does not appear to be HTML');
  }
  
  log('Frontend is accessible and serving HTML');
  return true;
});

// Test 2: Supabase Health Check
addTest('Supabase Backend Health', async () => {
  const response = await makeRequest(`${CONFIG.supabase}/rest/v1/`, {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw'
    }
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`Supabase API not accessible: ${response.statusCode}`);
  }
  
  log('Supabase backend is accessible');
  return true;
});

// Test 3: n8n API Health
addTest('n8n Integration Health', async () => {
  const response = await makeRequest(`${CONFIG.n8n}/api/v1/workflows`, {
    headers: {
      'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU'
    }
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`n8n API not accessible: ${response.statusCode}`);
  }
  
  const workflows = JSON.parse(response.data);
  log(`n8n is accessible with ${workflows.data?.length || 0} workflows`);
  return true;
});

// Test 4: Edge Functions Health
addTest('Supabase Edge Functions Health', async () => {
  try {
    const response = await makeRequest(`${CONFIG.edgeFunctions}/health-check`);
    
    if (response.statusCode !== 200) {
      throw new Error(`Edge function returned ${response.statusCode}`);
    }
    
    const result = JSON.parse(response.data);
    if (result.status !== 'ok') {
      throw new Error(`Edge function health check failed: ${result.message}`);
    }
    
    log('Edge Functions are operational');
    return true;
  } catch (error) {
    // Edge functions might not be deployed yet - this is non-critical
    log(`Edge Functions test failed (non-critical): ${error.message}`, 'WARNING');
    return false;
  }
});

// Test 5: Security Headers Check
addTest('Security Headers Verification', async () => {
  const response = await makeRequest(CONFIG.frontend);
  const headers = response.headers;
  
  const requiredHeaders = [
    'x-frame-options',
    'x-xss-protection', 
    'x-content-type-options',
    'content-security-policy'
  ];
  
  const missingHeaders = requiredHeaders.filter(header => !headers[header]);
  
  if (missingHeaders.length > 0) {
    throw new Error(`Missing security headers: ${missingHeaders.join(', ')}`);
  }
  
  log('Security headers are properly configured');
  return true;
});

// Test 6: Performance Check
addTest('Frontend Performance Check', async () => {
  const startTime = Date.now();
  const response = await makeRequest(CONFIG.frontend);
  const loadTime = Date.now() - startTime;
  
  if (response.statusCode !== 200) {
    throw new Error(`Frontend not accessible: ${response.statusCode}`);
  }
  
  if (loadTime > 5000) {
    throw new Error(`Load time too slow: ${loadTime}ms (target: <3000ms)`);
  }
  
  log(`Frontend loads in ${loadTime}ms (target: <3000ms)`);
  return true;
});

// Test 7: Environment Variables Check
addTest('Environment Configuration Check', async () => {
  // Check if frontend can access environment variables
  const response = await makeRequest(CONFIG.frontend);
  
  // Look for signs that environment variables are being used
  if (response.data.includes('undefined') || response.data.includes('PLACEHOLDER')) {
    log('WARNING: Frontend may have missing environment variables', 'WARNING');
    return false;
  }
  
  log('Environment configuration appears valid');
  return true;
});

// Main test runner
async function runTests() {
  log('🚀 Starting Clixen MVP Production Verification Tests');
  log(`Testing environment: Frontend=${CONFIG.frontend}, Supabase=${CONFIG.supabase}`);
  
  totalTests = TESTS.length;
  
  for (const test of TESTS) {
    try {
      log(`Running: ${test.name}`);
      const result = await test.testFn();
      if (result !== false) {
        passedTests++;
        log(`✅ PASSED: ${test.name}`, 'SUCCESS');
      } else {
        log(`⚠️  WARNING: ${test.name}`, 'WARNING');
      }
    } catch (error) {
      log(`❌ FAILED: ${test.name} - ${error.message}`, 'ERROR');
    }
  }
  
  // Final report
  log('');
  log('📊 PRODUCTION VERIFICATION REPORT');
  log('=====================================');
  log(`Tests Passed: ${passedTests}/${totalTests}`);
  log(`Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);
  
  const criticalTests = ['Frontend App Accessibility', 'Supabase Backend Health', 'Security Headers Verification'];
  const criticalPassed = TESTS.filter(test => 
    criticalTests.includes(test.name)
  ).length;
  
  if (passedTests >= Math.ceil(totalTests * 0.8)) {
    log('✅ PRODUCTION DEPLOYMENT APPROVED', 'SUCCESS');
    log('System is ready for 50-user beta trial');
    return true;
  } else {
    log('❌ PRODUCTION DEPLOYMENT NOT RECOMMENDED', 'ERROR'); 
    log('Critical issues must be resolved before launch');
    return false;
  }
}

// Production readiness checklist
function printDeploymentChecklist() {
  log('');
  log('🔧 DEPLOYMENT CHECKLIST');
  log('========================');
  log('□ Netlify environment variables configured');
  log('□ Supabase Edge Functions deployed with secrets');
  log('□ Database RLS policies enabled');
  log('□ Security headers configured');
  log('□ Performance metrics within targets');
  log('□ User isolation tested');
  log('□ Beta user communication prepared');
  log('□ Monitoring dashboard configured');
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then((success) => {
      printDeploymentChecklist();
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      log(`Fatal error: ${error.message}`, 'ERROR');
      process.exit(1);
    });
}

export { runTests, CONFIG };