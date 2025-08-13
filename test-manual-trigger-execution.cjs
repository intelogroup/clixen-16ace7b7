#!/usr/bin/env node

/**
 * Test Manual Trigger Execution
 * Attempts to execute the weather workflow via manual trigger
 */

const https = require('https');

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0';
const WORKFLOW_ID = '6B3DcZz4jOGR9fIi';

async function testWorkflowExecution() {
  console.log('🧪 Testing Manual Trigger Execution');
  console.log(`📋 Workflow ID: ${WORKFLOW_ID}`);
  
  // Test different execution endpoints
  const endpoints = [
    `/api/v1/workflows/${WORKFLOW_ID}/execute`,
    `/api/v1/workflows/${WORKFLOW_ID}/run`,
    `/api/v1/workflows/${WORKFLOW_ID}/trigger`,
    `/api/v1/workflows/${WORKFLOW_ID}/test`,
    `/api/v1/executions`
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🔗 Testing endpoint: ${endpoint}`);
    
    try {
      const result = await makeRequest('n8nio-n8n-7xzf6n.sliplane.app', endpoint, 'POST', {
        workflowId: WORKFLOW_ID,
        mode: 'manual',
        startNodes: ['manual-trigger-001']
      });
      
      console.log(`✅ Status: ${result.status}`);
      if (result.status === 200 || result.status === 201) {
        console.log('🎉 Execution successful!');
        console.log('📊 Result:', JSON.stringify(result.data, null, 2));
        return result;
      } else {
        console.log(`❌ Response: ${JSON.stringify(result.data)}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  // Try checking recent executions to see if any manual triggers worked
  console.log('\n📊 Checking recent executions...');
  try {
    const executions = await makeRequest('n8nio-n8n-7xzf6n.sliplane.app', '/api/v1/executions', 'GET');
    const ourExecutions = executions.data.data?.filter(e => e.workflowId === WORKFLOW_ID) || [];
    
    console.log(`🔍 Found ${ourExecutions.length} executions for our workflow:`);
    ourExecutions.forEach((exec, i) => {
      console.log(`${i + 1}. ID: ${exec.id}, Mode: ${exec.mode}, Status: ${exec.status}, Started: ${exec.startedAt}`);
    });
    
    if (ourExecutions.length > 0) {
      const latest = ourExecutions[0];
      console.log('\n📋 Getting details of latest execution...');
      const details = await makeRequest('n8nio-n8n-7xzf6n.sliplane.app', `/api/v1/executions/${latest.id}`, 'GET');
      console.log(`📊 Execution result: ${JSON.stringify(details.data, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ Error checking executions: ${error.message}`);
  }
}

function makeRequest(hostname, path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path,
      method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run the test
testWorkflowExecution();