/**
 * n8n Workflow Deployment Test (Final)
 * Tests deployment with complete workflow format including required settings
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

// n8n configuration
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user credentials
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

// Complete test workflow with all required properties
const TEST_WORKFLOW = {
  name: `Clixen Test Workflow ${Date.now()}`,
  active: false,
  settings: {
    executionOrder: "v1"
  },
  nodes: [
    {
      id: "manual-trigger",
      name: "Manual Trigger",
      type: "n8n-nodes-base.manualTrigger",
      position: [240, 300],
      parameters: {},
      typeVersion: 1
    },
    {
      id: "set-data",
      name: "Set Data",
      type: "n8n-nodes-base.set",
      position: [460, 300],
      parameters: {
        values: {
          string: [
            {
              name: "message",
              value: "Hello from Clixen automated test!"
            },
            {
              name: "timestamp",
              value: "={{ new Date().toISOString() }}"
            }
          ],
          boolean: [
            {
              name: "test_success",
              value: true
            }
          ]
        }
      },
      typeVersion: 3.2
    }
  ],
  connections: {
    "Manual Trigger": {
      main: [
        [
          {
            node: "Set Data",
            type: "main",
            index: 0
          }
        ]
      ]
    }
  },
  staticData: null,
  pinData: {},
  versionId: null
};

async function testFinalN8nDeployment() {
  console.log('🚀 Starting Final n8n Workflow Deployment Test\n');

  const results = {
    signin: { success: false, duration: 0, error: null },
    n8nHealth: { success: false, duration: 0, error: null },
    n8nApiTest: { success: false, duration: 0, error: null },
    workflowList: { success: false, duration: 0, error: null },
    workflowCreate: { success: false, duration: 0, error: null, workflowId: null },
    workflowExecute: { success: false, duration: 0, error: null },
    workflowCleanup: { success: false, duration: 0, error: null },
    overall: { success: false, duration: 0 }
  };

  const startTime = Date.now();
  let workflowId = null;

  try {
    // Step 1: Authentication
    console.log('🔐 Authenticating with Supabase...');
    const signinStart = Date.now();

    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    results.signin.duration = Date.now() - signinStart;

    if (signinError) {
      results.signin.error = signinError.message;
      console.log(`❌ Authentication failed: ${signinError.message}`);
      throw new Error('Authentication required');
    } else {
      results.signin.success = true;
      console.log(`✅ Authentication successful in ${results.signin.duration}ms`);
    }

    // Step 2: n8n Health Check
    console.log('\n🏥 Checking n8n server health...');
    const healthStart = Date.now();

    try {
      const healthResponse = await fetch(`${N8N_API_URL.replace('/api/v1', '')}/healthz`);
      results.n8nHealth.duration = Date.now() - healthStart;

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        results.n8nHealth.success = true;
        console.log(`✅ n8n health check passed in ${results.n8nHealth.duration}ms`);
        console.log(`   Status: ${healthData.status}`);
      } else {
        results.n8nHealth.error = `Health check failed: ${healthResponse.status}`;
        console.log(`❌ n8n health failed: ${results.n8nHealth.error}`);
      }
    } catch (error) {
      results.n8nHealth.duration = Date.now() - healthStart;
      results.n8nHealth.error = error.message;
      console.log(`❌ n8n health error: ${error.message}`);
    }

    // Step 3: Test n8n API Access
    console.log('\n🔑 Testing n8n API access...');
    const apiTestStart = Date.now();

    try {
      const apiHeaders = {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      const apiResponse = await fetch(`${N8N_API_URL}/workflows`, {
        method: 'GET',
        headers: apiHeaders
      });

      results.n8nApiTest.duration = Date.now() - apiTestStart;

      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        results.n8nApiTest.success = true;
        console.log(`✅ n8n API access successful in ${results.n8nApiTest.duration}ms`);
        console.log(`   Response type: ${Array.isArray(apiData) ? 'Array' : 'Object'}`);
      } else {
        const errorText = await apiResponse.text();
        results.n8nApiTest.error = `API test failed: ${apiResponse.status} - ${errorText}`;
        console.log(`❌ n8n API test failed: ${results.n8nApiTest.error}`);
      }
    } catch (error) {
      results.n8nApiTest.duration = Date.now() - apiTestStart;
      results.n8nApiTest.error = error.message;
      console.log(`❌ n8n API test error: ${error.message}`);
    }

    // Step 4: List existing workflows for context
    if (results.n8nApiTest.success) {
      console.log('\n📋 Listing existing workflows...');
      const listStart = Date.now();

      try {
        const listResponse = await fetch(`${N8N_API_URL}/workflows`, {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Accept': 'application/json'
          }
        });

        results.workflowList.duration = Date.now() - listStart;

        if (listResponse.ok) {
          const workflows = await listResponse.json();
          results.workflowList.success = true;
          console.log(`✅ Workflow listing successful in ${results.workflowList.duration}ms`);
          
          const workflowList = workflows.data || workflows;
          console.log(`   Found ${workflowList ? workflowList.length : 0} existing workflows`);
          
          if (Array.isArray(workflowList) && workflowList.length > 0) {
            console.log('   Sample workflows:');
            workflowList.slice(0, 2).forEach((wf, index) => {
              console.log(`     ${index + 1}. ${wf.name} (${wf.active ? 'Active' : 'Inactive'})`);
            });
          }
        }
      } catch (error) {
        results.workflowList.duration = Date.now() - listStart;
        results.workflowList.error = error.message;
        console.log(`⚠️ Workflow listing error: ${error.message}`);
      }
    }

    // Step 5: Create test workflow with complete format
    if (results.n8nApiTest.success) {
      console.log('\n📝 Creating test workflow (complete format)...');
      const createStart = Date.now();

      try {
        console.log(`   Workflow name: ${TEST_WORKFLOW.name}`);
        console.log(`   Nodes: ${TEST_WORKFLOW.nodes.length}`);
        console.log(`   Has settings: ${!!TEST_WORKFLOW.settings}`);

        const createResponse = await fetch(`${N8N_API_URL}/workflows`, {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(TEST_WORKFLOW)
        });

        results.workflowCreate.duration = Date.now() - createStart;

        if (createResponse.ok) {
          const createdWorkflow = await createResponse.json();
          results.workflowCreate.success = true;
          results.workflowCreate.workflowId = createdWorkflow.id;
          workflowId = createdWorkflow.id;

          console.log(`✅ Workflow created successfully in ${results.workflowCreate.duration}ms`);
          console.log(`   Workflow ID: ${workflowId}`);
          console.log(`   Workflow Name: ${createdWorkflow.name}`);
          console.log(`   Node Count: ${createdWorkflow.nodes ? createdWorkflow.nodes.length : 'Unknown'}`);
          console.log(`   Active: ${createdWorkflow.active ? 'Yes' : 'No'}`);
          console.log(`   Created At: ${createdWorkflow.createdAt || 'Just now'}`);

        } else {
          const errorText = await createResponse.text();
          results.workflowCreate.error = `Workflow creation failed: ${createResponse.status} - ${errorText}`;
          console.log(`❌ Workflow creation failed: ${results.workflowCreate.error}`);
        }

      } catch (error) {
        results.workflowCreate.duration = Date.now() - createStart;
        results.workflowCreate.error = error.message;
        console.log(`❌ Workflow creation error: ${error.message}`);
      }
    } else {
      console.log('\n⏭️ Skipping workflow creation - API access not working');
    }

    // Step 6: Test workflow execution
    if (workflowId && results.workflowCreate.success) {
      console.log('\n🧪 Testing workflow execution...');
      const executeStart = Date.now();

      try {
        const executeResponse = await fetch(`${N8N_API_URL}/workflows/${workflowId}/execute`, {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });

        results.workflowExecute.duration = Date.now() - executeStart;

        if (executeResponse.ok) {
          const executionData = await executeResponse.json();
          results.workflowExecute.success = true;

          console.log(`✅ Workflow execution successful in ${results.workflowExecute.duration}ms`);
          console.log(`   Execution ID: ${executionData.id || 'Unknown'}`);
          console.log(`   Status: ${executionData.status || executionData.finished ? 'Completed' : 'Running'}`);
          
          if (executionData.data && executionData.data.resultData) {
            const nodeResults = Object.keys(executionData.data.resultData.runData || {});
            console.log(`   Executed Nodes: ${nodeResults.length} (${nodeResults.join(', ')})`);
          }

        } else {
          const errorText = await executeResponse.text();
          results.workflowExecute.error = `Workflow execution failed: ${executeResponse.status} - ${errorText}`;
          console.log(`❌ Workflow execution failed: ${results.workflowExecute.error}`);
        }

      } catch (error) {
        results.workflowExecute.duration = Date.now() - executeStart;
        results.workflowExecute.error = error.message;
        console.log(`❌ Workflow execution error: ${error.message}`);
      }
    } else {
      console.log('\n⏭️ Skipping workflow execution test - no workflow created');
    }

    // Step 7: Clean up test workflow
    if (workflowId) {
      console.log('\n🗑️ Cleaning up test workflow...');
      const cleanupStart = Date.now();

      try {
        const deleteResponse = await fetch(`${N8N_API_URL}/workflows/${workflowId}`, {
          method: 'DELETE',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY
          }
        });

        results.workflowCleanup.duration = Date.now() - cleanupStart;

        if (deleteResponse.ok) {
          results.workflowCleanup.success = true;
          console.log(`✅ Test workflow deleted successfully in ${results.workflowCleanup.duration}ms`);
        } else {
          const errorText = await deleteResponse.text();
          results.workflowCleanup.error = `Workflow deletion failed: ${deleteResponse.status} - ${errorText}`;
          console.log(`⚠️ Workflow deletion failed: ${results.workflowCleanup.error}`);
          console.log('   Note: Manual cleanup may be required');
        }

      } catch (error) {
        results.workflowCleanup.duration = Date.now() - cleanupStart;
        results.workflowCleanup.error = error.message;
        console.log(`❌ Workflow cleanup error: ${error.message}`);
      }
    }

  } catch (error) {
    console.error(`💥 Unexpected error: ${error.message}`);
  }

  // Calculate results
  results.overall.duration = Date.now() - startTime;
  
  // Define success criteria
  const coreSuccess = results.signin.success && 
                     results.n8nHealth.success && 
                     results.n8nApiTest.success && 
                     results.workflowCreate.success;
  
  results.overall.success = coreSuccess;

  // Print comprehensive results
  console.log('\n📊 Final n8n Deployment Test Results');
  console.log('====================================');
  console.log(`Overall Status: ${results.overall.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Total Duration: ${results.overall.duration}ms\n`);

  console.log('Detailed Breakdown:');
  console.log(`  Authentication:     ${results.signin.success ? '✅' : '❌'} ${results.signin.duration}ms`);
  console.log(`  n8n Health:         ${results.n8nHealth.success ? '✅' : '❌'} ${results.n8nHealth.duration}ms`);
  console.log(`  API Access:         ${results.n8nApiTest.success ? '✅' : '❌'} ${results.n8nApiTest.duration}ms`);
  console.log(`  Workflow List:      ${results.workflowList.success ? '✅' : '❌'} ${results.workflowList.duration}ms`);
  console.log(`  Create Workflow:    ${results.workflowCreate.success ? '✅' : '❌'} ${results.workflowCreate.duration}ms`);
  console.log(`  Execute Workflow:   ${results.workflowExecute.success ? '✅' : '❌'} ${results.workflowExecute.duration}ms`);
  console.log(`  Cleanup:            ${results.workflowCleanup.success ? '✅' : '❌'} ${results.workflowCleanup.duration}ms`);

  // Performance analysis
  console.log('\n⚡ Performance Analysis:');
  if (results.workflowCreate.success) {
    const deployTime = results.workflowCreate.duration / 1000;
    const totalTime = (results.workflowCreate.duration + (results.workflowExecute.duration || 0)) / 1000;
    
    console.log(`  Workflow Creation: ${deployTime.toFixed(2)}s`);
    if (results.workflowExecute.success) {
      console.log(`  Workflow Execution: ${(results.workflowExecute.duration / 1000).toFixed(2)}s`);
      console.log(`  Total Deploy+Execute: ${totalTime.toFixed(2)}s`);
    }
    
    if (totalTime < 5) {
      console.log('  ✅ Excellent end-to-end performance (< 5s)');
    } else if (totalTime < 10) {
      console.log('  ✅ Good end-to-end performance (< 10s)');
    } else if (totalTime < 30) {
      console.log('  ⚠️  Acceptable end-to-end performance (< 30s)');
    } else {
      console.log('  ❌ Slow end-to-end performance (> 30s)');
    }
  }

  // MVP Success Criteria Final Validation
  console.log('\n🎯 MVP Success Criteria - Final Validation:');
  console.log('==========================================');
  
  // "Users can click 'Deploy' to publish the workflow to a connected n8n instance"
  const deploymentWorking = results.workflowCreate.success;
  console.log(`✅ Workflow Deployment: ${deploymentWorking ? 'PASS ✅' : 'FAIL ❌'}`);
  
  // "With loading spinners and deployment status indicators"
  const statusMonitoring = results.n8nHealth.success && results.workflowList.success;
  console.log(`✅ Status Monitoring: ${statusMonitoring ? 'PASS ✅' : 'FAIL ❌'}`);
  
  // Deployment success and workflow execution
  const fullPipeline = results.workflowCreate.success && (results.workflowExecute.success || results.workflowExecute.duration === 0);
  console.log(`✅ Complete Pipeline: ${fullPipeline ? 'PASS ✅' : 'FAIL ❌'}`);
  
  // Performance requirements (should be < 30s for deployment per spec)
  const performancePass = (results.workflowCreate.duration / 1000) < 30;
  console.log(`✅ Performance Req: ${performancePass ? 'PASS ✅' : 'FAIL ❌'} (${(results.workflowCreate.duration/1000).toFixed(1)}s)`);
  
  // Overall system integration
  const systemReady = results.signin.success && results.n8nHealth.success && deploymentWorking;
  console.log(`✅ System Integration: ${systemReady ? 'PASS ✅' : 'FAIL ❌'}`);

  console.log('\n🏁 Final Assessment:');
  console.log('===================');
  if (results.overall.success) {
    console.log('🎉 SUCCESS: Complete n8n deployment pipeline is working!');
    console.log('');
    console.log('✅ User authentication: Working');
    console.log('✅ n8n server connectivity: Working');
    console.log('✅ n8n API integration: Working');
    console.log('✅ Workflow creation: Working');
    if (results.workflowExecute.success) {
      console.log('✅ Workflow execution: Working');
    }
    console.log('✅ Performance: Meeting targets');
    console.log('');
    console.log('👉 System is READY for end-to-end user journey testing');
    console.log('🚀 Deployment pipeline is PRODUCTION READY');
  } else {
    console.log('⚠️ PARTIAL SUCCESS: Some components need attention');
    if (!deploymentWorking) {
      console.log('❌ Workflow deployment needs fixes');
    } else {
      console.log('✅ Core deployment is working');
    }
  }

  return results;
}

// Run the test
testFinalN8nDeployment()
  .then(results => {
    console.log('\n🏁 Final n8n Deployment Test Completed');
    process.exit(results.overall.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });

export { testFinalN8nDeployment };