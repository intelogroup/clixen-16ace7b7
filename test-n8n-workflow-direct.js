/**
 * Direct n8n Workflow Testing Script
 * Tests workflow creation and validation against real n8n API
 */

import fetch from 'node-fetch';

// n8n Configuration
const N8N_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

// Test workflow structures with different complexities
const testWorkflows = [
  {
    name: 'Simple Test Workflow - Basic n8n Structure',
    workflow: {
      "name": "Simple Test Workflow",
      "nodes": [
        {
          "parameters": {
            "path": "simple-test",
            "options": {}
          },
          "id": "webhook-node",
          "name": "Webhook Trigger",
          "type": "n8n-nodes-base.webhook",
          "typeVersion": 1,
          "position": [240, 300]
        },
        {
          "parameters": {
            "values": {
              "string": [
                {
                  "name": "message",
                  "value": "Test successful"
                }
              ]
            }
          },
          "id": "set-node",
          "name": "Set Response",
          "type": "n8n-nodes-base.set",
          "typeVersion": 1,
          "position": [460, 300]
        },
        {
          "parameters": {},
          "id": "response-node",
          "name": "Respond to Webhook",
          "type": "n8n-nodes-base.respondToWebhook",
          "typeVersion": 1,
          "position": [680, 300]
        }
      ],
      "connections": {
        "Webhook Trigger": {
          "main": [
            [
              {
                "node": "Set Response",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Set Response": {
          "main": [
            [
              {
                "node": "Respond to Webhook",
                "type": "main",
                "index": 0
              }
            ]
          ]
        }
      },
      "active": false,
      "settings": {},
      "staticData": {}
    }
  },
  {
    name: 'Complex Workflow - AI Agent Generated Structure',
    workflow: {
      "name": "User Data Processing Workflow",
      "nodes": [
        {
          "parameters": {
            "path": "process-user-data",
            "options": {}
          },
          "id": "webhook-trigger",
          "name": "User Data Webhook",
          "type": "n8n-nodes-base.webhook",
          "typeVersion": 1,
          "position": [240, 300]
        },
        {
          "parameters": {
            "conditions": {
              "string": [
                {
                  "value1": "={{$json.email}}",
                  "operation": "isNotEmpty"
                },
                {
                  "value1": "={{$json.email}}",
                  "operation": "regex",
                  "value2": "^[^@]+@[^@]+\\.[^@]+$"
                }
              ]
            }
          },
          "id": "validate-email",
          "name": "Validate Email",
          "type": "n8n-nodes-base.if",
          "typeVersion": 1,
          "position": [460, 300]
        },
        {
          "parameters": {
            "values": {
              "string": [
                {
                  "name": "email",
                  "value": "={{$json.email.toLowerCase()}}"
                },
                {
                  "name": "phone",
                  "value": "={{$json.phone.replace(/[^0-9]/g, '')}}"
                },
                {
                  "name": "processed_at",
                  "value": "={{$now}}"
                }
              ]
            }
          },
          "id": "transform-data",
          "name": "Transform User Data",
          "type": "n8n-nodes-base.set",
          "typeVersion": 1,
          "position": [680, 200]
        },
        {
          "parameters": {
            "method": "POST",
            "url": "https://zfbgdixbzezpxllkoyfc.supabase.co/rest/v1/conversations",
            "options": {
              "headers": {
                "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig",
                "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig",
                "Content-Type": "application/json"
              }
            },
            "sendBody": true,
            "bodyContentType": "json",
            "jsonBody": "{ \"title\": \"User Registration: {{$json.email}}\", \"user_id\": \"550e8400-e29b-41d4-a716-446655440000\", \"workflow_summary\": \"Processed user data: {{$json}}\" }"
          },
          "id": "store-supabase",
          "name": "Store in Supabase",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4,
          "position": [900, 200]
        },
        {
          "parameters": {
            "values": {
              "string": [
                {
                  "name": "error",
                  "value": "Invalid or missing email address"
                }
              ]
            }
          },
          "id": "error-response",
          "name": "Error Response",
          "type": "n8n-nodes-base.set",
          "typeVersion": 1,
          "position": [680, 400]
        },
        {
          "parameters": {},
          "id": "success-response",
          "name": "Success Response",
          "type": "n8n-nodes-base.respondToWebhook",
          "typeVersion": 1,
          "position": [1120, 200]
        },
        {
          "parameters": {},
          "id": "error-webhook-response",
          "name": "Error Webhook Response",
          "type": "n8n-nodes-base.respondToWebhook",
          "typeVersion": 1,
          "position": [900, 400]
        }
      ],
      "connections": {
        "User Data Webhook": {
          "main": [
            [
              {
                "node": "Validate Email",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Validate Email": {
          "main": [
            [
              {
                "node": "Transform User Data",
                "type": "main",
                "index": 0
              }
            ],
            [
              {
                "node": "Error Response",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Transform User Data": {
          "main": [
            [
              {
                "node": "Store in Supabase",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Store in Supabase": {
          "main": [
            [
              {
                "node": "Success Response",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Error Response": {
          "main": [
            [
              {
                "node": "Error Webhook Response",
                "type": "main",
                "index": 0
              }
            ]
          ]
        }
      },
      "active": false,
      "settings": {},
      "staticData": {}
    }
  },
  {
    name: 'Broken Workflow - Common AI Agent Errors',
    workflow: {
      "name": "Broken Workflow Example",
      "nodes": [
        {
          "parameters": {
            "path": "broken-test"
          },
          "id": "webhook-node",
          "name": "Webhook Trigger",
          "type": "n8n-nodes-base.webhook",
          "typeVersion": 1,
          "position": [240, 300]
        },
        {
          "parameters": {
            "method": "GET",
            "url": "invalid-url-format"
          },
          "id": "http-node",
          "name": "HTTP Request",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4,
          "position": [460, 300]
        },
        {
          "parameters": {},
          "id": "missing-target",
          "name": "Missing Connection Target",
          "type": "n8n-nodes-base.set",
          "typeVersion": 1,
          "position": [680, 300]
        }
      ],
      "connections": {
        "Webhook Trigger": {
          "main": [
            [
              {
                "node": "HTTP Request",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "HTTP Request": {
          "main": [
            [
              {
                "node": "NonExistent Node",
                "type": "main",
                "index": 0
              }
            ]
          ]
        }
      },
      "active": false,
      "settings": {},
      "staticData": {}
    }
  }
];

// Test functions
async function testN8nConnection() {
  console.log('🔗 Testing n8n API connection...');
  
  try {
    const response = await fetch(`${N8N_URL}/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ n8n API connection successful');
    console.log(`📊 Current workflows in n8n: ${data.data?.length || 0}`);
    
    return true;
  } catch (error) {
    console.error('❌ n8n connection failed:', error.message);
    return false;
  }
}

async function testWorkflowDeployment(testCase) {
  console.log(`\n🚀 Testing: ${testCase.name}`);
  console.log('📤 Deploying workflow to n8n...');
  
  try {
    const response = await fetch(`${N8N_URL}/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCase.workflow)
    });

    const responseText = await response.text();
    
    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log('✅ Workflow deployed successfully!');
      console.log(`📋 Workflow ID: ${result.data?.id || 'Unknown'}`);
      console.log(`🏷️  Workflow Name: ${result.data?.name || 'Unknown'}`);
      
      return {
        success: true,
        workflowId: result.data?.id,
        data: result.data
      };
    } else {
      console.log('❌ Deployment failed:');
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
        console.log('🔍 Error Analysis:');
        
        if (errorData.message) {
          console.log(`   Message: ${errorData.message}`);
        }
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
          console.log('   Specific Errors:');
          errorData.errors.forEach((error, index) => {
            console.log(`     ${index + 1}. ${error}`);
          });
        }
        
        if (errorData.code) {
          console.log(`   Error Code: ${errorData.code}`);
        }
        
      } catch (parseError) {
        console.log('📄 Raw error response:', responseText);
        errorData = { raw: responseText };
      }
      
      return {
        success: false,
        error: errorData,
        status: response.status
      };
    }
    
  } catch (error) {
    console.error('❌ Deployment test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function analyzeWorkflowErrors(results) {
  console.log('\n📊 ERROR ANALYSIS SUMMARY\n');
  
  const errorPatterns = new Map();
  const successCount = results.filter(r => r.result.success).length;
  const failureCount = results.length - successCount;
  
  console.log(`✅ Successful deployments: ${successCount}`);
  console.log(`❌ Failed deployments: ${failureCount}`);
  
  results.forEach((test, index) => {
    if (!test.result.success) {
      console.log(`\n❌ Failure ${index + 1}: ${test.name}`);
      
      const error = test.result.error;
      if (error.message) {
        console.log(`   Error: ${error.message}`);
        
        // Categorize common error patterns
        if (error.message.includes('validation')) {
          errorPatterns.set('validation', (errorPatterns.get('validation') || 0) + 1);
        } else if (error.message.includes('node')) {
          errorPatterns.set('node_structure', (errorPatterns.get('node_structure') || 0) + 1);
        } else if (error.message.includes('connection')) {
          errorPatterns.set('connection_errors', (errorPatterns.get('connection_errors') || 0) + 1);
        } else {
          errorPatterns.set('other', (errorPatterns.get('other') || 0) + 1);
        }
      }
      
      if (test.result.status) {
        console.log(`   HTTP Status: ${test.result.status}`);
      }
    }
  });
  
  if (errorPatterns.size > 0) {
    console.log('\n🔍 Error Pattern Analysis:');
    for (const [pattern, count] of errorPatterns) {
      console.log(`   ${pattern}: ${count} occurrence(s)`);
    }
  }
}

async function cleanupTestWorkflows() {
  console.log('\n🧹 Cleaning up test workflows...');
  
  try {
    // Get all workflows
    const response = await fetch(`${N8N_URL}/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log('⚠️  Could not fetch workflows for cleanup');
      return;
    }
    
    const data = await response.json();
    const testWorkflowIds = [];
    
    // Find workflows that are our test workflows
    data.data?.forEach(workflow => {
      const testNames = ['Simple Test Workflow', 'User Data Processing Workflow', 'Broken Workflow Example'];
      if (testNames.some(name => workflow.name.includes(name))) {
        testWorkflowIds.push(workflow.id);
      }
    });
    
    console.log(`🗑️  Found ${testWorkflowIds.length} test workflows to remove`);
    
    // Delete each test workflow
    for (const workflowId of testWorkflowIds) {
      try {
        const deleteResponse = await fetch(`${N8N_URL}/workflows/${workflowId}`, {
          method: 'DELETE',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json'
          }
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Deleted workflow ${workflowId}`);
        } else {
          console.log(`⚠️  Could not delete workflow ${workflowId}`);
        }
      } catch (error) {
        console.log(`❌ Error deleting workflow ${workflowId}:`, error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Cleanup failed:', error.message);
  }
}

// Main test execution
async function runWorkflowTests() {
  console.log('🤖 n8n Workflow AI Agent Testing Suite\n');
  console.log('This test suite validates AI-generated workflows against the real n8n engine.\n');

  // Test connection first
  const connectionOk = await testN8nConnection();
  if (!connectionOk) {
    console.log('❌ Cannot proceed without n8n connection');
    process.exit(1);
  }

  // Test each workflow
  const results = [];
  
  for (const testCase of testWorkflows) {
    const result = await testWorkflowDeployment(testCase);
    results.push({
      name: testCase.name,
      result
    });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Analyze results
  await analyzeWorkflowErrors(results);
  
  // Clean up
  await cleanupTestWorkflows();
  
  console.log('\n🎯 Test Suite Complete!');
  
  const successRate = (results.filter(r => r.result.success).length / results.length) * 100;
  console.log(`📊 Success Rate: ${successRate.toFixed(1)}%`);
  
  if (successRate < 50) {
    console.log('❌ Critical: AI agent workflow generation needs improvement');
    process.exit(1);
  } else if (successRate < 80) {
    console.log('⚠️  Warning: AI agent workflow generation needs refinement');
    process.exit(0);
  } else {
    console.log('✅ Excellent: AI agent workflow generation is working well');
    process.exit(0);
  }
}

// Run tests
runWorkflowTests().catch(error => {
  console.error('❌ Critical test failure:', error);
  process.exit(1);
});