#!/usr/bin/env node

/**
 * N8N Deployment Test Script
 * Tests multiple deployment approaches:
 * 1. Direct REST API calls
 * 2. MCP integration  
 * 3. Webhook triggers
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const N8N_API_URL = process.env.N8N_API_URL || 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

console.log('🚀 Starting N8N Deployment Testing...');
console.log(`API URL: ${N8N_API_URL}`);

// Load test workflow
const workflowPath = join(__dirname, 'test-simple-workflow.json');
const testWorkflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

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

  try {
    console.log(`📡 Making request: ${method} ${url}`);
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    throw error;
  }
}

async function testDirectAPI() {
  console.log('\n🔧 Testing Direct REST API Deployment...');
  
  try {
    // Test connection
    console.log('1. Testing connection...');
    const healthCheck = await n8nRequest('/workflows?limit=1');
    console.log('✅ Connection successful');
    
    // Deploy workflow
    console.log('2. Deploying test workflow...');
    const deployment = await n8nRequest('/workflows', 'POST', testWorkflow);
    console.log(`✅ Workflow deployed! ID: ${deployment.id}`);
    
    // Activate workflow
    console.log('3. Activating workflow...');
    const activation = await n8nRequest(`/workflows/${deployment.id}/activate`, 'POST');
    console.log(`✅ Workflow activated: ${activation.active}`);
    
    // Get webhook URL
    console.log('4. Getting webhook info...');
    const webhookUrl = `http://18.221.12.50:5678/webhook/calculate`;
    console.log(`✅ Webhook URL: ${webhookUrl}`);
    
    return {
      success: true,
      workflowId: deployment.id,
      webhookUrl,
      method: 'direct-api'
    };
    
  } catch (error) {
    console.error('❌ Direct API test failed:', error.message);
    return {
      success: false,
      error: error.message,
      method: 'direct-api'
    };
  }
}

async function testWebhookTrigger(workflowInfo) {
  if (!workflowInfo.success || !workflowInfo.webhookUrl) {
    console.log('\n⏭️  Skipping webhook test - no valid workflow deployed');
    return { success: false, error: 'No webhook URL available' };
  }
  
  console.log('\n🎯 Testing Webhook Trigger...');
  
  try {
    const testData = {
      a: 15,
      b: 3,
      operation: 'multiply'
    };
    
    console.log(`Testing calculation: ${testData.a} ${testData.operation} ${testData.b}`);
    
    const response = await fetch(workflowInfo.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Webhook triggered successfully!');
    console.log(`📊 Result: ${JSON.stringify(result, null, 2)}`);
    
    return {
      success: true,
      input: testData,
      output: result,
      method: 'webhook'
    };
    
  } catch (error) {
    console.error('❌ Webhook test failed:', error.message);
    return {
      success: false,
      error: error.message,
      method: 'webhook'
    };
  }
}

async function testMCPIntegration() {
  console.log('\n🔌 Testing MCP Integration...');
  
  try {
    // Import MCP client dynamically
    const { spawn } = await import('child_process');
    
    return new Promise((resolve) => {
      const mcpProcess = spawn('node', [
        './backend/mcp/n8n-integration-server.js'
      ], {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      let output = '';
      let testComplete = false;
      
      mcpProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log(`📡 MCP Output: ${data.toString().trim()}`);
        
        if (output.includes('started successfully') && !testComplete) {
          testComplete = true;
          
          // Send test command to MCP (simulate test-n8n-connection)
          const testCommand = JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'test-n8n-connection',
              arguments: {}
            }
          });
          
          mcpProcess.stdin.write(testCommand + '\n');
          
          // Give it time to respond
          setTimeout(() => {
            mcpProcess.kill();
            resolve({
              success: true,
              output: output.trim(),
              method: 'mcp'
            });
          }, 3000);
        }
      });
      
      mcpProcess.stderr.on('data', (data) => {
        console.error(`🚨 MCP Error: ${data.toString().trim()}`);
      });
      
      mcpProcess.on('error', (error) => {
        console.error('❌ MCP process error:', error.message);
        resolve({
          success: false,
          error: error.message,
          method: 'mcp'
        });
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!testComplete) {
          mcpProcess.kill();
          resolve({
            success: false,
            error: 'MCP test timeout',
            method: 'mcp'
          });
        }
      }, 10000);
    });
    
  } catch (error) {
    console.error('❌ MCP test failed:', error.message);
    return {
      success: false,
      error: error.message,
      method: 'mcp'
    };
  }
}

async function runAllTests() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  try {
    // Test 1: Direct API
    const directApiResult = await testDirectAPI();
    results.tests.push(directApiResult);
    
    // Test 2: Webhook (if direct API worked)
    const webhookResult = await testWebhookTrigger(directApiResult);
    results.tests.push(webhookResult);
    
    // Test 3: MCP Integration
    const mcpResult = await testMCPIntegration();
    results.tests.push(mcpResult);
    
    // Summary
    console.log('\n📋 TEST SUMMARY');
    console.log('================');
    
    const successCount = results.tests.filter(t => t.success).length;
    const totalCount = results.tests.length;
    
    console.log(`✅ Passed: ${successCount}/${totalCount}`);
    
    results.tests.forEach((test, i) => {
      const status = test.success ? '✅' : '❌';
      console.log(`${status} ${test.method}: ${test.success ? 'PASSED' : test.error}`);
    });
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('==================');
    
    const successful = results.tests.filter(t => t.success).map(t => t.method);
    
    if (successful.length > 0) {
      console.log(`🎯 Use these working methods: ${successful.join(', ')}`);
      
      if (successful.includes('direct-api')) {
        console.log('🔧 Direct API is working - best for server-side deployment');
      }
      if (successful.includes('webhook')) {
        console.log('🎯 Webhooks are working - workflows can be triggered');
      }
      if (successful.includes('mcp')) {
        console.log('🔌 MCP integration is working - best for complex validation');
      }
    } else {
      console.log('❌ All tests failed - check n8n configuration');
    }
    
    // Save results
    fs.writeFileSync(
      './test-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\n💾 Results saved to test-results.json');
    
    return results;
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then((results) => {
      const successCount = results.tests ? results.tests.filter(t => t.success).length : 0;
      const totalCount = results.tests ? results.tests.length : 0;
      
      console.log(`\n🏁 Tests completed: ${successCount}/${totalCount} passed`);
      process.exit(successCount === totalCount ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Test suite crashed:', error);
      process.exit(1);
    });
}

export { runAllTests };