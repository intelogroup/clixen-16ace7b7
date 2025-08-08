#!/usr/bin/env node

/**
 * Complete Flow Test: Direct API + MCP + Webhook Testing
 * Tests the full workflow creation and execution pipeline
 */

import fs from 'fs';

const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

console.log('🚀 Complete Flow Testing: API + MCP + Webhooks');

async function n8nRequest(endpoint, method = 'GET', body = null) {
  const url = `${N8N_API_URL}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
    },
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return await response.json();
}

// Create a proper workflow with correct node connections
function createTestWorkflow() {
  const timestamp = Date.now();
  
  return {
    name: `Complete Test Flow ${timestamp}`,
    nodes: [
      {
        id: "webhook_node_id",
        name: "Webhook",
        type: "n8n-nodes-base.webhook",
        position: [200, 300],
        parameters: {
          path: `flow-test-${timestamp}`,
          httpMethod: "POST"
        }
      },
      {
        id: "function_node_id", 
        name: "Math Calculator",
        type: "n8n-nodes-base.function",
        position: [500, 300],
        parameters: {
          functionCode: `
// Extract input data
const data = $input.first().json;
console.log('Received data:', data);

const { a = 0, b = 0, operation = 'add' } = data;

let result;
let status = 'success';
let error = null;

try {
  switch(operation.toLowerCase()) {
    case 'add':
    case '+':
      result = a + b;
      break;
    case 'subtract':
    case 'sub':
    case '-':
      result = a - b;
      break;
    case 'multiply':
    case 'mul':
    case '*':
      result = a * b;
      break;
    case 'divide':
    case 'div':
    case '/':
      if (b === 0) {
        result = null;
        status = 'error';
        error = 'Division by zero';
      } else {
        result = a / b;
      }
      break;
    case 'power':
    case 'pow':
    case '^':
      result = Math.pow(a, b);
      break;
    default:
      result = null;
      status = 'error';
      error = \`Unknown operation: \${operation}\`;
  }
} catch (e) {
  result = null;
  status = 'error';
  error = e.message;
}

const response = {
  input: { a, b, operation },
  result,
  status,
  error,
  timestamp: new Date().toISOString(),
  message: status === 'success' ? 
    \`\${a} \${operation} \${b} = \${result}\` :
    \`Error: \${error}\`,
  workflowId: 'complete-test-flow'
};

console.log('Sending response:', response);

return [{ json: response }];
`
        }
      },
      {
        id: "response_node_id",
        name: "Send Response", 
        type: "n8n-nodes-base.respondToWebhook",
        position: [800, 300],
        parameters: {
          respondWith: "json",
          responseBody: "={{ $json }}"
        }
      }
    ],
    connections: {
      "webhook_node_id": {
        "main": [[{
          "node": "function_node_id",
          "type": "main", 
          "index": 0
        }]]
      },
      "function_node_id": {
        "main": [[{
          "node": "response_node_id",
          "type": "main",
          "index": 0
        }]]
      }
    },
    settings: {},
    staticData: {}
  };
}

async function testDirectAPIFlow() {
  console.log('\n🔧 Testing Direct API Complete Flow...');
  
  try {
    // 1. Create workflow
    const workflow = createTestWorkflow();
    console.log('📝 Creating workflow:', workflow.name);
    
    const deployment = await n8nRequest('/workflows', 'POST', workflow);
    console.log(`✅ Workflow deployed! ID: ${deployment.id}`);
    
    // 2. Activate workflow
    console.log('⚡ Activating workflow...');
    await n8nRequest(`/workflows/${deployment.id}/activate`, 'POST');
    console.log('✅ Workflow activated');
    
    // 3. Execute workflow manually first (this registers the webhook)
    console.log('🎯 Executing workflow manually to register webhook...');
    const manualExecution = await n8nRequest(`/workflows/${deployment.id}/execute`, 'POST', {});
    console.log('✅ Manual execution triggered:', manualExecution.id);
    
    // Wait a moment for execution to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. Try webhook URL  
    const webhookPath = workflow.nodes[0].parameters.path;
    const testWebhookUrl = `http://18.221.12.50:5678/webhook-test/${deployment.id}/${webhookPath}`;
    const prodWebhookUrl = `http://18.221.12.50:5678/webhook/${webhookPath}`;
    
    console.log(`🔗 Testing webhook URLs:`);
    console.log(`   Test: ${testWebhookUrl}`);
    console.log(`   Prod: ${prodWebhookUrl}`);
    
    const testData = { a: 12, b: 4, operation: 'multiply' };
    
    // Try production webhook first
    let webhookResult = null;
    let webhookUrl = null;
    
    try {
      console.log('🎯 Trying production webhook...');
      const prodResponse = await fetch(prodWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      
      if (prodResponse.ok) {
        webhookResult = await prodResponse.json();
        webhookUrl = prodWebhookUrl;
        console.log('✅ Production webhook successful!');
      } else {
        throw new Error(`Production webhook failed: ${prodResponse.status}`);
      }
    } catch (prodError) {
      console.log(`❌ Production webhook failed: ${prodError.message}`);
      
      try {
        console.log('🎯 Trying test webhook...');
        const testResponse = await fetch(testWebhookUrl, {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testData)
        });
        
        if (testResponse.ok) {
          webhookResult = await testResponse.json();
          webhookUrl = testWebhookUrl;
          console.log('✅ Test webhook successful!');
        } else {
          throw new Error(`Test webhook failed: ${testResponse.status}`);
        }
      } catch (testError) {
        console.log(`❌ Test webhook also failed: ${testError.message}`);
      }
    }
    
    // 5. Get executions
    console.log('📊 Getting workflow executions...');
    const executions = await n8nRequest(`/executions?workflowId=${deployment.id}&limit=5`);
    console.log(`✅ Found ${executions.data?.length || 0} executions`);
    
    return {
      success: true,
      method: 'direct-api',
      workflowId: deployment.id,
      webhookUrl,
      webhookResult,
      executionCount: executions.data?.length || 0,
      testData,
      workflow: workflow.name
    };
    
  } catch (error) {
    console.error('❌ Direct API flow failed:', error.message);
    return {
      success: false,
      method: 'direct-api',
      error: error.message
    };
  }
}

async function testWebhookCalculations(webhookInfo) {
  if (!webhookInfo.success || !webhookInfo.webhookUrl) {
    console.log('\n⏭️ Skipping calculation tests - no working webhook');
    return { success: false, error: 'No webhook available' };
  }
  
  console.log('\n🧮 Testing Various Calculations...');
  
  const calculations = [
    { a: 15, b: 3, operation: 'add', expected: 18 },
    { a: 20, b: 5, operation: 'subtract', expected: 15 },
    { a: 7, b: 6, operation: 'multiply', expected: 42 },
    { a: 24, b: 4, operation: 'divide', expected: 6 },
    { a: 2, b: 3, operation: 'power', expected: 8 },
    { a: 10, b: 0, operation: 'divide', expected: 'error' }
  ];
  
  const results = [];
  
  for (const calc of calculations) {
    try {
      console.log(`🔢 Testing: ${calc.a} ${calc.operation} ${calc.b}`);
      
      const response = await fetch(webhookInfo.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calc)
      });
      
      if (response.ok) {
        const result = await response.json();
        const passed = calc.expected === 'error' ? 
          result.status === 'error' : 
          result.result === calc.expected;
          
        console.log(`${passed ? '✅' : '❌'} ${result.message || result.error}`);
        
        results.push({
          ...calc,
          actual: result.result,
          passed,
          response: result
        });
      } else {
        console.log(`❌ HTTP ${response.status}`);
        results.push({
          ...calc,
          passed: false,
          error: `HTTP ${response.status}`
        });
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      results.push({
        ...calc,
        passed: false,
        error: error.message
      });
    }
  }
  
  const passedCount = results.filter(r => r.passed).length;
  console.log(`📊 Calculation Tests: ${passedCount}/${results.length} passed`);
  
  return {
    success: passedCount > 0,
    passedCount,
    totalCount: results.length,
    results,
    method: 'webhook-calculations'
  };
}

async function runCompleteFlow() {
  const allResults = {
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  try {
    // Test 1: Direct API complete flow
    console.log('🎬 Starting complete flow test...');
    const apiResult = await testDirectAPIFlow();
    allResults.tests.push(apiResult);
    
    // Test 2: Webhook calculations (if API worked)
    const calcResult = await testWebhookCalculations(apiResult);
    allResults.tests.push(calcResult);
    
    // Summary
    console.log('\n📋 COMPLETE FLOW RESULTS');
    console.log('========================');
    
    const successCount = allResults.tests.filter(t => t.success).length;
    console.log(`✅ Successful tests: ${successCount}/${allResults.tests.length}`);
    
    allResults.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      const method = test.method || 'unknown';
      const detail = test.success ? 
        (test.workflowId ? `(ID: ${test.workflowId})` : 
         test.passedCount ? `(${test.passedCount}/${test.totalCount})` : '') :
        `(${test.error})`;
      
      console.log(`${status} ${method} ${detail}`);
    });
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS FOR INTEGRATION');
    console.log('==================================');
    
    if (apiResult.success) {
      console.log('🎯 Direct n8n API deployment: ✅ WORKING');
      console.log('   ➜ Use for server-side workflow creation');
      console.log('   ➜ Activate workflows immediately after creation');
      console.log('   ➜ Execute manually once to register webhooks');
    }
    
    if (calcResult.success) {
      console.log('🔌 Webhook execution: ✅ WORKING');
      console.log(`   ➜ ${calcResult.passedCount}/${calcResult.totalCount} calculation types working`);
      console.log('   ➜ Use for real-time workflow triggering');
    }
    
    console.log('\n🔧 INTEGRATION STEPS:');
    console.log('1. Deploy workflow via direct API');
    console.log('2. Activate workflow immediately');
    console.log('3. Execute once manually to register webhook');
    console.log('4. Use production webhook URLs for triggers');
    console.log('5. Add MCP for validation and complex operations');
    
    // Save results
    fs.writeFileSync('./complete-flow-results.json', JSON.stringify(allResults, null, 2));
    console.log('\n💾 Complete results saved to complete-flow-results.json');
    
    return allResults;
    
  } catch (error) {
    console.error('💥 Complete flow test crashed:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Run the complete test
runCompleteFlow().then(results => {
  const successCount = results.tests ? 
    results.tests.filter(t => t.success).length : 0;
  const totalCount = results.tests ? results.tests.length : 0;
  
  console.log(`\n🏁 Complete flow test finished: ${successCount}/${totalCount} successful`);
  process.exit(successCount > 0 ? 0 : 1);
}).catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});