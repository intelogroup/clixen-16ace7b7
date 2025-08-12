const http = require('http');
const https = require('https');

const N8N_API_URL = '18.221.12.50';
const N8N_API_PORT = 5678;
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

// Test results storage
const testResults = {
  authentication: {},
  workflows: {},
  executions: {},
  credentials: {},
  nodes: {},
  users: {},
  settings: {},
  health: {}
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: N8N_API_URL,
      port: N8N_API_PORT,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
    
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message,
        success: false
      });
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testAuthentication() {
  console.log('\n🔐 TESTING AUTHENTICATION & BASIC ACCESS\n');
  console.log('═══════════════════════════════════════\n');
  
  // Test basic authentication
  const authTest = await makeRequest('GET', '/workflows?limit=1');
  testResults.authentication.apiKeyValid = authTest.success;
  console.log(`✓ API Key Valid: ${authTest.success ? '✅ YES' : '❌ NO'}`);
  
  // Test without API key
  const noAuthOptions = {
    hostname: N8N_API_URL,
    port: N8N_API_PORT,
    path: '/api/v1/workflows',
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  };
  
  const noAuthTest = await new Promise((resolve) => {
    const req = http.request(noAuthOptions, (res) => {
      resolve({ status: res.statusCode });
    });
    req.on('error', () => resolve({ status: 0 }));
    req.end();
  });
  
  testResults.authentication.requiresAuth = noAuthTest.status === 401;
  console.log(`✓ Auth Required: ${noAuthTest.status === 401 ? '✅ YES' : '❌ NO'} (Status: ${noAuthTest.status})`);
}

async function testWorkflowOperations() {
  console.log('\n📋 TESTING WORKFLOW OPERATIONS\n');
  console.log('═══════════════════════════════════════\n');
  
  // GET - List workflows
  const listWorkflows = await makeRequest('GET', '/workflows');
  testResults.workflows.list = listWorkflows.success;
  console.log(`✓ GET /workflows (List): ${listWorkflows.success ? '✅ YES' : '❌ NO'}`);
  
  // GET - Get specific workflow
  const getWorkflow = await makeRequest('GET', '/workflows/u5YHHT2HKpqyT3oE');
  testResults.workflows.get = getWorkflow.success;
  console.log(`✓ GET /workflows/{id} (Get One): ${getWorkflow.success ? '✅ YES' : '❌ NO'}`);
  
  // POST - Create workflow
  const createData = {
    name: '[TEST] API Capability Test',
    nodes: [
      {
        parameters: {},
        id: 'test-node',
        name: 'Start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [250, 300]
      }
    ],
    connections: {},
    settings: {
      timezone: 'America/New_York'
    }
  };
  
  const createWorkflow = await makeRequest('POST', '/workflows', createData);
  testResults.workflows.create = createWorkflow.success;
  console.log(`✓ POST /workflows (Create): ${createWorkflow.success ? '✅ YES' : '❌ NO'}`);
  
  let testWorkflowId = null;
  if (createWorkflow.success) {
    testWorkflowId = createWorkflow.data.id;
    console.log(`  → Created workflow ID: ${testWorkflowId}`);
  }
  
  // PUT - Update workflow
  if (testWorkflowId) {
    const updateData = {
      name: '[TEST] Updated API Test',
      nodes: createData.nodes,
      connections: createData.connections,
      settings: createData.settings
    };
    const updateWorkflow = await makeRequest('PUT', `/workflows/${testWorkflowId}`, updateData);
    testResults.workflows.update = updateWorkflow.success;
    console.log(`✓ PUT /workflows/{id} (Update): ${updateWorkflow.success ? '✅ YES' : '❌ NO'}`);
  }
  
  // PATCH - Partial update (test if supported)
  if (testWorkflowId) {
    const patchWorkflow = await makeRequest('PATCH', `/workflows/${testWorkflowId}`, { active: true });
    testResults.workflows.patch = patchWorkflow.success;
    console.log(`✓ PATCH /workflows/{id} (Partial): ${patchWorkflow.success ? '✅ YES' : '❌ NO'} ${!patchWorkflow.success ? '(Method: ' + patchWorkflow.data + ')' : ''}`);
  }
  
  // POST - Activate workflow
  if (testWorkflowId) {
    const activateWorkflow = await makeRequest('POST', `/workflows/${testWorkflowId}/activate`);
    testResults.workflows.activate = activateWorkflow.success;
    console.log(`✓ POST /workflows/{id}/activate: ${activateWorkflow.success ? '✅ YES' : '❌ NO'}`);
  }
  
  // POST - Deactivate workflow
  if (testWorkflowId) {
    const deactivateWorkflow = await makeRequest('POST', `/workflows/${testWorkflowId}/deactivate`);
    testResults.workflows.deactivate = deactivateWorkflow.success;
    console.log(`✓ POST /workflows/{id}/deactivate: ${deactivateWorkflow.success ? '✅ YES' : '❌ NO'}`);
  }
  
  // DELETE - Delete workflow
  if (testWorkflowId) {
    const deleteWorkflow = await makeRequest('DELETE', `/workflows/${testWorkflowId}`);
    testResults.workflows.delete = deleteWorkflow.success;
    console.log(`✓ DELETE /workflows/{id}: ${deleteWorkflow.success ? '✅ YES' : '❌ NO'}`);
  }
}

async function testExecutionOperations() {
  console.log('\n⚡ TESTING EXECUTION OPERATIONS\n');
  console.log('═══════════════════════════════════════\n');
  
  // GET - List executions
  const listExecutions = await makeRequest('GET', '/executions');
  testResults.executions.list = listExecutions.success;
  console.log(`✓ GET /executions (List): ${listExecutions.success ? '✅ YES' : '❌ NO'}`);
  
  // POST - Execute workflow manually
  const executeWorkflow = await makeRequest('POST', '/workflows/u5YHHT2HKpqyT3oE/execute');
  testResults.executions.execute = executeWorkflow.success;
  console.log(`✓ POST /workflows/{id}/execute: ${executeWorkflow.success ? '✅ YES' : '❌ NO'} ${!executeWorkflow.success ? '(' + executeWorkflow.data + ')' : ''}`);
  
  // POST - Test webhook
  const testWebhook = await makeRequest('POST', '/webhook-test/test-webhook-id');
  testResults.executions.webhook = testWebhook.success;
  console.log(`✓ POST /webhook-test/{id}: ${testWebhook.success ? '✅ YES' : '❌ NO'} ${!testWebhook.success ? '(' + testWebhook.status + ')' : ''}`);
  
  // GET - Execution details (if we have executions)
  if (listExecutions.success && listExecutions.data.data && listExecutions.data.data.length > 0) {
    const execId = listExecutions.data.data[0].id;
    const getExecution = await makeRequest('GET', `/executions/${execId}`);
    testResults.executions.get = getExecution.success;
    console.log(`✓ GET /executions/{id}: ${getExecution.success ? '✅ YES' : '❌ NO'}`);
    
    // DELETE - Delete execution
    const deleteExecution = await makeRequest('DELETE', `/executions/${execId}`);
    testResults.executions.delete = deleteExecution.success;
    console.log(`✓ DELETE /executions/{id}: ${deleteExecution.success ? '✅ YES' : '❌ NO'}`);
  }
}

async function testCredentialOperations() {
  console.log('\n🔑 TESTING CREDENTIAL OPERATIONS\n');
  console.log('═══════════════════════════════════════\n');
  
  // GET - List credentials
  const listCredentials = await makeRequest('GET', '/credentials');
  testResults.credentials.list = listCredentials.success;
  console.log(`✓ GET /credentials (List): ${listCredentials.success ? '✅ YES' : '❌ NO'}`);
  
  // GET - List credential types
  const listCredentialTypes = await makeRequest('GET', '/credential-types');
  testResults.credentials.types = listCredentialTypes.success;
  console.log(`✓ GET /credential-types: ${listCredentialTypes.success ? '✅ YES' : '❌ NO'}`);
  
  // POST - Create credential (test)
  const createCredential = await makeRequest('POST', '/credentials', {
    name: 'Test API Credential',
    type: 'httpHeaderAuth',
    data: {
      name: 'Authorization',
      value: 'Bearer test-token'
    }
  });
  testResults.credentials.create = createCredential.success;
  console.log(`✓ POST /credentials (Create): ${createCredential.success ? '✅ YES' : '❌ NO'} ${!createCredential.success ? '(' + (createCredential.data.message || createCredential.status) + ')' : ''}`);
  
  if (createCredential.success) {
    const credId = createCredential.data.id;
    
    // DELETE - Delete credential
    const deleteCredential = await makeRequest('DELETE', `/credentials/${credId}`);
    testResults.credentials.delete = deleteCredential.success;
    console.log(`✓ DELETE /credentials/{id}: ${deleteCredential.success ? '✅ YES' : '❌ NO'}`);
  }
}

async function testNodeOperations() {
  console.log('\n🔧 TESTING NODE INFORMATION\n');
  console.log('═══════════════════════════════════════\n');
  
  // GET - List node types
  const listNodeTypes = await makeRequest('GET', '/node-types');
  testResults.nodes.types = listNodeTypes.success;
  console.log(`✓ GET /node-types: ${listNodeTypes.success ? '✅ YES' : '❌ NO'}`);
  
  if (listNodeTypes.success && listNodeTypes.data.data) {
    console.log(`  → Available nodes: ${listNodeTypes.data.data.length}`);
  }
}

async function testUserAndSettings() {
  console.log('\n👤 TESTING USER & SETTINGS\n');
  console.log('═══════════════════════════════════════\n');
  
  // GET - Current user
  const getCurrentUser = await makeRequest('GET', '/users/me');
  testResults.users.me = getCurrentUser.success;
  console.log(`✓ GET /users/me: ${getCurrentUser.success ? '✅ YES' : '❌ NO'} ${!getCurrentUser.success ? '(' + getCurrentUser.status + ')' : ''}`);
  
  // GET - Settings
  const getSettings = await makeRequest('GET', '/settings');
  testResults.settings.get = getSettings.success;
  console.log(`✓ GET /settings: ${getSettings.success ? '✅ YES' : '❌ NO'} ${!getSettings.success ? '(' + getSettings.status + ')' : ''}`);
  
  // GET - Version
  const getVersion = await makeRequest('GET', '/version');
  testResults.settings.version = getVersion.success;
  console.log(`✓ GET /version: ${getVersion.success ? '✅ YES' : '❌ NO'} ${!getVersion.success ? '(' + getVersion.status + ')' : ''}`);
}

async function testHealthAndStatus() {
  console.log('\n💚 TESTING HEALTH & STATUS\n');
  console.log('═══════════════════════════════════════\n');
  
  // GET - Health check
  const healthCheck = await makeRequest('GET', '/health');
  testResults.health.check = healthCheck.success;
  console.log(`✓ GET /health: ${healthCheck.success ? '✅ YES' : '❌ NO'} ${!healthCheck.success ? '(' + healthCheck.status + ')' : ''}`);
  
  // GET - Metrics (if available)
  const getMetrics = await makeRequest('GET', '/metrics');
  testResults.health.metrics = getMetrics.success;
  console.log(`✓ GET /metrics: ${getMetrics.success ? '✅ YES' : '❌ NO'} ${!getMetrics.success ? '(' + getMetrics.status + ')' : ''}`);
}

function generateSummary() {
  console.log('\n\n📊 COMPREHENSIVE API CAPABILITY SUMMARY\n');
  console.log('═══════════════════════════════════════\n');
  
  const capabilities = {
    '✅ FULLY WORKING': [],
    '⚠️ PARTIAL/LIMITED': [],
    '❌ NOT AVAILABLE': []
  };
  
  // Categorize capabilities
  for (const [category, tests] of Object.entries(testResults)) {
    for (const [operation, result] of Object.entries(tests)) {
      const fullName = `${category}.${operation}`;
      if (result === true) {
        capabilities['✅ FULLY WORKING'].push(fullName);
      } else if (result === false) {
        capabilities['❌ NOT AVAILABLE'].push(fullName);
      } else {
        capabilities['⚠️ PARTIAL/LIMITED'].push(fullName);
      }
    }
  }
  
  // Print categorized results
  for (const [status, items] of Object.entries(capabilities)) {
    if (items.length > 0) {
      console.log(`${status} (${items.length} operations):`);
      items.forEach(item => console.log(`  • ${item}`));
      console.log();
    }
  }
  
  // Calculate success rate
  const total = Object.values(testResults).reduce((acc, cat) => 
    acc + Object.keys(cat).length, 0
  );
  const successful = Object.values(testResults).reduce((acc, cat) => 
    acc + Object.values(cat).filter(v => v === true).length, 0
  );
  
  console.log('📈 SUCCESS RATE:');
  console.log(`   ${successful}/${total} operations working (${Math.round(successful/total * 100)}%)\n`);
  
  return { capabilities, successRate: successful/total };
}

async function main() {
  console.log('🔬 N8N API COMPREHENSIVE CAPABILITY TEST');
  console.log('========================================');
  console.log(`🔗 API URL: http://${N8N_API_URL}:${N8N_API_PORT}`);
  console.log(`🔑 API Key: ${N8N_API_KEY.substring(0, 20)}...`);
  console.log(`📅 Test Date: ${new Date().toISOString()}\n`);
  
  try {
    await testAuthentication();
    await testWorkflowOperations();
    await testExecutionOperations();
    await testCredentialOperations();
    await testNodeOperations();
    await testUserAndSettings();
    await testHealthAndStatus();
    
    const summary = generateSummary();
    
    // Export results
    require('fs').writeFileSync(
      '/root/repo/backend/n8n-api-test-results.json',
      JSON.stringify({ 
        timestamp: new Date().toISOString(),
        results: testResults,
        summary: summary
      }, null, 2)
    );
    
    console.log('💾 Full results saved to: /root/repo/backend/n8n-api-test-results.json\n');
    
  } catch (error) {
    console.error('❌ Test Error:', error);
  }
}

main();