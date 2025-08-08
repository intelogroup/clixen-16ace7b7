#!/usr/bin/env node

/**
 * Simple Direct API Test for n8n
 */

import fs from 'fs';

const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

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

  console.log(`📡 ${method} ${url}`);
  if (body) {
    console.log(`📝 Body: ${JSON.stringify(body, null, 2)}`);
  }

  const response = await fetch(url, options);
  const responseText = await response.text();
  
  console.log(`📊 Status: ${response.status} ${response.statusText}`);
  console.log(`📄 Response: ${responseText}`);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${responseText}`);
  }

  return JSON.parse(responseText);
}

async function testSimpleWorkflow() {
  console.log('🚀 Testing Simple Direct API Workflow Deployment');
  
  try {
    // 1. Test connection
    console.log('\n1️⃣ Testing connection...');
    await n8nRequest('/workflows?limit=1');
    console.log('✅ Connection successful');
    
    // 2. Create minimal workflow
    console.log('\n2️⃣ Creating minimal webhook workflow...');
    const minimalWorkflow = {
      name: "Test Webhook Math Calculator " + Date.now(),
      nodes: [
        {
          id: "webhook1",
          name: "Webhook",
          type: "n8n-nodes-base.webhook",
          position: [200, 200],
          parameters: {
            path: "test-math",
            httpMethod: "POST"
          }
        },
        {
          id: "response1", 
          name: "Respond",
          type: "n8n-nodes-base.respondToWebhook",
          position: [500, 200],
          parameters: {
            respondWith: "json",
            responseBody: "={{ { message: 'Hello from n8n', received: $json } }}"
          }
        }
      ],
      connections: {
        "Webhook": {
          "main": [[{
            "node": "Respond",
            "type": "main",
            "index": 0
          }]]
        }
      },
      settings: {},
      staticData: {}
    };
    
    const deployment = await n8nRequest('/workflows', 'POST', minimalWorkflow);
    console.log(`✅ Workflow deployed! ID: ${deployment.id}`);
    
    // 3. Activate workflow
    console.log('\n3️⃣ Activating workflow...');
    const activation = await n8nRequest(`/workflows/${deployment.id}/activate`, 'POST');
    console.log(`✅ Workflow activated: ${activation.active}`);
    
    // 4. Test webhook
    console.log('\n4️⃣ Testing webhook...');
    const webhookUrl = `http://18.221.12.50:5678/webhook/test-math`;
    console.log(`🔗 Webhook URL: ${webhookUrl}`);
    
    const testData = { a: 5, b: 3, operation: "add" };
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    const webhookResult = await webhookResponse.text();
    console.log(`📊 Webhook Status: ${webhookResponse.status}`);
    console.log(`📄 Webhook Response: ${webhookResult}`);
    
    if (webhookResponse.ok) {
      console.log('✅ Webhook test successful!');
    }
    
    return {
      success: true,
      workflowId: deployment.id,
      webhookUrl,
      result: webhookResult
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

testSimpleWorkflow().then(result => {
  console.log('\n🏁 Final Result:', result);
  fs.writeFileSync('simple-test-result.json', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});