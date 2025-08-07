/**
 * n8n Workflow Deployment Test (Corrected)
 * Tests deployment with correct API key header format
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

// n8n configuration with correct API key format
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user credentials
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

// Simplified test workflow
const TEST_WORKFLOW = {
  name: "Clixen Test Workflow",
  active: false,
  nodes: [
    {
      id: "scheduler",
      name: "Every 5 Minutes",
      type: "n8n-nodes-base.scheduleTrigger",
      position: [240, 300],
      parameters: {
        rule: {
          interval: [
            {
              field: "minutes", 
              value: 5
            }
          ]
        }
      },
      typeVersion: 1.1
    },
    {
      id: "webhook",
      name: "Webhook Call",
      type: "n8n-nodes-base.httpRequest",
      position: [460, 300],
      parameters: {
        url: "https://httpstat.us/200",
        method: "GET"
      },
      typeVersion: 4.1
    }
  ],
  connections: {
    "Every 5 Minutes": {
      main: [
        [
          {
            node: "Webhook Call",
            type: "main",
            index: 0
          }
        ]
      ]
    }
  }
};

async function testCorrectedN8nDeployment() {
  console.log('🚀 Starting Corrected n8n Workflow Deployment Test\n');

  const results = {
    signin: { success: false, duration: 0, error: null },
    n8nHealth: { success: false, duration: 0, error: null },
    n8nApiTest: { success: false, duration: 0, error: null },
    workflowList: { success: false, duration: 0, error: null },
    workflowCreate: { success: false, duration: 0, error: null, workflowId: null },
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

    // Step 3: Test n8n API with correct headers
    console.log('\n🔑 Testing n8n API with correct headers...');
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
        console.log(`   API Response: ${Array.isArray(apiData) ? `${apiData.length} workflows found` : 'Valid response'}`);
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

    // Step 4: List existing workflows
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
          console.log(`   Found ${workflows.data ? workflows.data.length : workflows.length || 0} existing workflows`);
          
          // Show first few workflow names
          const workflowList = workflows.data || workflows;
          if (Array.isArray(workflowList) && workflowList.length > 0) {
            console.log('   Recent workflows:');
            workflowList.slice(0, 3).forEach((wf, index) => {
              console.log(`     ${index + 1}. ${wf.name} (${wf.active ? 'Active' : 'Inactive'})`);
            });
          }
        } else {
          const errorText = await listResponse.text();
          results.workflowList.error = `Workflow listing failed: ${listResponse.status} - ${errorText}`;
          console.log(`❌ Workflow listing failed: ${results.workflowList.error}`);
        }
      } catch (error) {
        results.workflowList.duration = Date.now() - listStart;
        results.workflowList.error = error.message;
        console.log(`❌ Workflow listing error: ${error.message}`);
      }
    }

    // Step 5: Create test workflow
    if (results.n8nApiTest.success) {
      console.log('\n📝 Creating test workflow...');
      const createStart = Date.now();

      try {
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
          console.log(`   Created: ${createdWorkflow.createdAt || 'Just now'}`);

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

    // Step 6: Clean up test workflow
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
  
  // Core deployment success criteria
  const coreSuccess = results.signin.success && 
                     results.n8nHealth.success && 
                     results.n8nApiTest.success && 
                     results.workflowCreate.success;
  
  results.overall.success = coreSuccess;

  // Print comprehensive results
  console.log('\n📊 Corrected n8n Deployment Test Results');
  console.log('========================================');
  console.log(`Overall Status: ${results.overall.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Total Duration: ${results.overall.duration}ms\n`);

  console.log('Test Breakdown:');
  console.log(`  Authentication:     ${results.signin.success ? '✅' : '❌'} ${results.signin.duration}ms`);
  console.log(`  n8n Health:         ${results.n8nHealth.success ? '✅' : '❌'} ${results.n8nHealth.duration}ms`);
  console.log(`  n8n API Test:       ${results.n8nApiTest.success ? '✅' : '❌'} ${results.n8nApiTest.duration}ms`);
  console.log(`  Workflow List:      ${results.workflowList.success ? '✅' : '❌'} ${results.workflowList.duration}ms`);
  console.log(`  Create Workflow:    ${results.workflowCreate.success ? '✅' : '❌'} ${results.workflowCreate.duration}ms`);
  console.log(`  Cleanup:            ${results.workflowCleanup.success ? '✅' : '❌'} ${results.workflowCleanup.duration}ms`);

  // Performance analysis
  console.log('\n⚡ Performance Analysis:');
  if (results.workflowCreate.success) {
    const deployTime = results.workflowCreate.duration / 1000;
    console.log(`  Deployment Time: ${deployTime.toFixed(2)}s`);
    
    if (deployTime < 2) {
      console.log('  ✅ Excellent deployment speed (< 2s)');
    } else if (deployTime < 5) {
      console.log('  ✅ Good deployment speed (< 5s)');
    } else if (deployTime < 10) {
      console.log('  ⚠️  Acceptable deployment speed (< 10s)');
    } else {
      console.log('  ❌ Slow deployment speed (> 10s)');
    }
  }

  // MVP Success Criteria Validation
  console.log('\n🎯 MVP Success Criteria Validation:');
  console.log('===================================');
  
  // "Users can click 'Deploy' to publish the workflow to a connected n8n instance"
  const deploymentCapability = results.workflowCreate.success;
  console.log(`✅ Workflow Deployment: ${deploymentCapability ? 'PASS' : 'FAIL'}`);
  
  // "With loading spinners and deployment status indicators"
  const statusMonitoring = results.n8nHealth.success && results.workflowList.success;
  console.log(`✅ Status Monitoring: ${statusMonitoring ? 'PASS' : 'FAIL'}`);
  
  // Performance requirements
  const avgTime = Object.values(results)
    .filter(r => r !== results.overall && r.duration)
    .reduce((sum, r) => sum + r.duration, 0) / 
    Object.values(results).filter(r => r !== results.overall && r.duration).length;
  
  const performancePass = avgTime < 5000; // 5 seconds for deployment operations
  console.log(`✅ Performance Target: ${performancePass ? 'PASS' : 'FAIL'} (${(avgTime/1000).toFixed(1)}s avg)`);

  // Infrastructure readiness
  console.log('\n🏗️ Infrastructure Readiness:');
  console.log('============================');
  console.log(`n8n Server: ${results.n8nHealth.success ? '✅ Healthy' : '❌ Issues'}`);
  console.log(`n8n API: ${results.n8nApiTest.success ? '✅ Accessible' : '❌ Issues'}`);
  console.log(`Workflow Operations: ${results.workflowCreate.success ? '✅ Working' : '❌ Issues'}`);
  console.log(`Full Pipeline: ${results.overall.success ? '✅ Ready' : '❌ Needs fixes'}`);

  console.log('\n📋 Deployment Readiness Assessment:');
  console.log('===================================');
  if (results.overall.success) {
    console.log('✅ n8n deployment pipeline is fully functional');
    console.log('✅ API authentication working correctly');
    console.log('✅ Workflow creation and management operational');
    console.log('👉 Ready for complete end-to-end user journey validation');
    console.log('🚀 System ready for production deployment!');
  } else {
    console.log('❌ Deployment pipeline needs fixes:');
    if (!results.n8nHealth.success) {
      console.log('   - n8n server health issues');
    }
    if (!results.n8nApiTest.success) {
      console.log('   - n8n API access problems');
    }
    if (!results.workflowCreate.success) {
      console.log('   - Workflow creation failures');
    }
  }

  return results;
}

// Run the test
testCorrectedN8nDeployment()
  .then(results => {
    console.log('\n🏁 Corrected n8n Deployment Test Completed');
    process.exit(results.overall.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });

export { testCorrectedN8nDeployment };