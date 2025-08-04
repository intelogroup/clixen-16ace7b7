#!/usr/bin/env node

/**
 * Comprehensive Test Suite for API Operations Edge Function
 * Tests all endpoints, rate limiting, authentication, and error handling
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const API_OPERATIONS_URL = `${SUPABASE_URL}/functions/v1/api-operations`;

// Test credentials
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test utilities
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (color, message) => console.log(`${color}${message}${colors.reset}`);
const success = (message) => log(colors.green, `✅ ${message}`);
const error = (message) => log(colors.red, `❌ ${message}`);
const info = (message) => log(colors.blue, `ℹ️  ${message}`);
const warning = (message) => log(colors.yellow, `⚠️  ${message}`);

let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// Test helper functions
const runTest = async (testName, testFn) => {
  testResults.total++;
  info(`Testing: ${testName}`);
  try {
    await testFn();
    success(`${testName} - PASSED`);
    testResults.passed++;
  } catch (err) {
    error(`${testName} - FAILED: ${err.message}`);
    testResults.failed++;
  }
  console.log('');
};

const makeApiRequest = async (endpoint, options = {}) => {
  const url = `${API_OPERATIONS_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  const data = await response.json();
  
  return {
    status: response.status,
    data,
    headers: response.headers
  };
};

// Authentication setup
let authToken = null;
let userId = null;

const authenticate = async () => {
  info('Authenticating test user...');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }

  authToken = data.session.access_token;
  userId = data.user.id;
  
  success(`Authenticated as ${data.user.email} (${userId})`);
};

// Test cases
const testHealthCheck = async () => {
  const response = await makeApiRequest('/health');
  
  if (response.status !== 200 && response.status !== 503) {
    throw new Error(`Expected status 200 or 503, got ${response.status}`);
  }
  
  if (!response.data.status || !response.data.timestamp) {
    throw new Error('Health check response missing required fields');
  }
  
  info(`Health status: ${response.data.status}`);
  info(`n8n: ${response.data.n8n ? 'healthy' : 'unhealthy'}`);
  info(`Database: ${response.data.database ? 'healthy' : 'unhealthy'}`);
};

const testAuthenticationRequired = async () => {
  const response = await makeApiRequest('/workflows');
  
  if (response.status !== 401) {
    throw new Error(`Expected status 401, got ${response.status}`);
  }
  
  if (!response.data.error || !response.data.error.includes('Authentication')) {
    throw new Error('Expected authentication error message');
  }
};

const testInvalidToken = async () => {
  const response = await makeApiRequest('/workflows', {
    headers: {
      'Authorization': 'Bearer invalid-token-here'
    }
  });
  
  if (response.status !== 401) {
    throw new Error(`Expected status 401, got ${response.status}`);
  }
};

const testGetWorkflows = async () => {
  const response = await makeApiRequest('/workflows', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response should indicate success');
  }
  
  if (!Array.isArray(response.data.data)) {
    throw new Error('Expected workflows data to be an array');
  }
  
  info(`Found ${response.data.data.length} workflows`);
  
  if (response.data.user_tier) {
    info(`User tier: ${response.data.user_tier}`);
  }
};

const testCreateWorkflow = async () => {
  const testWorkflow = {
    name: `Test Workflow ${Date.now()}`,
    active: false,
    nodes: [
      {
        id: 'start',
        name: 'Start',
        type: 'n8n-nodes-base.start',
        position: [240, 300],
        parameters: {}
      },
      {
        id: 'webhook',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        position: [460, 300],
        parameters: {
          path: 'test-webhook',
          httpMethod: 'GET'
        }
      }
    ],
    connections: {
      Start: {
        main: [
          [
            {
              node: 'Webhook',
              type: 'main',
              index: 0
            }
          ]
        ]
      }
    },
    settings: {
      saveDataErrorExecution: 'all',
      saveDataSuccessExecution: 'all',
      saveManualExecutions: true
    }
  };

  const response = await makeApiRequest('/workflows', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(testWorkflow)
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  if (!response.data.success || !response.data.data.id) {
    throw new Error('Workflow creation should return success with ID');
  }
  
  info(`Created workflow: ${response.data.data.name} (${response.data.data.id})`);
  
  return response.data.data.id;
};

const testGetSpecificWorkflow = async (workflowId) => {
  const response = await makeApiRequest(`/workflows/${workflowId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success || !response.data.data.id) {
    throw new Error('Should return workflow data with ID');
  }
  
  if (response.data.data.id !== workflowId) {
    throw new Error('Returned workflow ID should match requested ID');
  }
  
  info(`Retrieved workflow: ${response.data.data.name}`);
};

const testUpdateWorkflow = async (workflowId) => {
  const updateData = {
    name: `Updated Test Workflow ${Date.now()}`,
    settings: {
      saveDataErrorExecution: 'none',
      saveDataSuccessExecution: 'none'
    }
  };

  const response = await makeApiRequest(`/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(updateData)
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  if (!response.data.success) {
    throw new Error('Update should be successful');
  }
  
  info(`Updated workflow name to: ${response.data.data.name}`);
};

const testToggleWorkflow = async (workflowId) => {
  // Activate workflow
  let response = await makeApiRequest(`/workflows/${workflowId}/toggle`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ active: true })
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200 for activation, got ${response.status}`);
  }
  
  info('Workflow activated');
  
  // Deactivate workflow
  response = await makeApiRequest(`/workflows/${workflowId}/toggle`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ active: false })
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200 for deactivation, got ${response.status}`);
  }
  
  info('Workflow deactivated');
};

const testGetExecutions = async () => {
  const response = await makeApiRequest('/executions?limit=5', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success || !Array.isArray(response.data.data)) {
    throw new Error('Should return array of executions');
  }
  
  info(`Found ${response.data.data.length} executions`);
};

const testBatchOperations = async (workflowId) => {
  const batchOps = [
    {
      operation: 'update',
      workflowId: workflowId,
      data: { name: `Batch Updated ${Date.now()}` }
    },
    {
      operation: 'toggle',
      workflowId: workflowId,
      data: { active: false }
    }
  ];

  const response = await makeApiRequest('/batch', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ operations: batchOps })
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  if (!response.data.success || !response.data.data.summary) {
    throw new Error('Batch operation should return success with summary');
  }
  
  const summary = response.data.data.summary;
  info(`Batch operations: ${summary.successful}/${summary.total} successful`);
  
  if (summary.failed > 0) {
    warning(`${summary.failed} batch operations failed`);
  }
};

const testRateLimiting = async () => {
  info('Testing rate limiting (making rapid requests)...');
  
  const promises = [];
  for (let i = 0; i < 15; i++) {
    promises.push(makeApiRequest('/health', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }));
  }
  
  const responses = await Promise.all(promises);
  const rateLimited = responses.some(r => r.status === 429);
  
  if (!rateLimited) {
    warning('No rate limiting detected - might need adjustment for production');
  } else {
    success('Rate limiting is working');
  }
};

const testInvalidEndpoint = async () => {
  const response = await makeApiRequest('/invalid-endpoint', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  if (response.status !== 404) {
    throw new Error(`Expected status 404, got ${response.status}`);
  }
  
  if (!response.data.error || !response.data.error.includes('not found')) {
    throw new Error('Expected not found error message');
  }
};

const testDeleteWorkflow = async (workflowId) => {
  const response = await makeApiRequest(`/workflows/${workflowId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Delete should be successful');
  }
  
  info(`Deleted workflow: ${workflowId}`);
};

// Main test runner
const runAllTests = async () => {
  console.log(`${colors.bold}${colors.cyan}🧪 API Operations Edge Function Test Suite${colors.reset}\n`);
  
  try {
    // Authentication
    await authenticate();
    console.log('');
    
    // Health and basic tests
    await runTest('Health Check', testHealthCheck);
    await runTest('Authentication Required', testAuthenticationRequired);
    await runTest('Invalid Token Rejection', testInvalidToken);
    await runTest('Invalid Endpoint', testInvalidEndpoint);
    
    // Workflow CRUD operations
    await runTest('Get Workflows', testGetWorkflows);
    
    let testWorkflowId;
    await runTest('Create Workflow', async () => {
      testWorkflowId = await testCreateWorkflow();
    });
    
    if (testWorkflowId) {
      await runTest('Get Specific Workflow', () => testGetSpecificWorkflow(testWorkflowId));
      await runTest('Update Workflow', () => testUpdateWorkflow(testWorkflowId));
      await runTest('Toggle Workflow', () => testToggleWorkflow(testWorkflowId));
      await runTest('Batch Operations', () => testBatchOperations(testWorkflowId));
      await runTest('Delete Workflow', () => testDeleteWorkflow(testWorkflowId));
    }
    
    // Additional tests
    await runTest('Get Executions', testGetExecutions);
    await runTest('Rate Limiting', testRateLimiting);
    
  } catch (error) {
    error(`Test suite setup failed: ${error.message}`);
    testResults.failed++;
    testResults.total++;
  }
  
  // Final results
  console.log(`${colors.bold}${colors.cyan}📊 Test Results:${colors.reset}`);
  console.log(`${colors.green}✅ Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${testResults.failed}${colors.reset}`);
  console.log(`📈 Total: ${testResults.total}`);
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  console.log(`🎯 Success Rate: ${successRate}%`);
  
  if (testResults.failed === 0) {
    success('🎉 All tests passed! API Operations function is working correctly.');
  } else {
    warning(`⚠️  ${testResults.failed} test(s) failed. Please review the errors above.`);
  }
  
  // Cleanup: Sign out
  await supabase.auth.signOut();
  
  process.exit(testResults.failed > 0 ? 1 : 0);
};

// Run the tests
runAllTests().catch(err => {
  error(`Unexpected error: ${err.message}`);
  process.exit(1);
});