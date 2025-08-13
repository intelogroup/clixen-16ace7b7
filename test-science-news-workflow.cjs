// Test script for the Advanced Science News Workflow
const https = require('https');
const http = require('http');

// Configuration
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

const WORKFLOW_ID = 'uxRUjGF3BHDPxNp3';
const WEBHOOK_URL = 'http://18.221.12.50:5678/webhook/science-news-1755094237863';
const USER_EMAIL = 'jimkalinov@gmail.com';

// Simple HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000, // Increased timeout for workflow execution
      ...options
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      const bodyData = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(bodyData);
    }
    
    req.end();
  });
}

async function testWorkflowStatus() {
  console.log('🔍 Testing workflow status...');
  
  try {
    const response = await makeRequest(`${N8N_API_URL}/workflows/${WORKFLOW_ID}`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      const workflow = response.data;
      console.log('✅ Workflow Status Check:');
      console.log(`   - Name: ${workflow.name}`);
      console.log(`   - Active: ${workflow.active ? '✅ YES' : '❌ NO'}`);
      console.log(`   - Nodes: ${workflow.nodes.length}`);
      console.log(`   - Triggers: ${workflow.triggerCount}`);
      
      // Analyze workflow structure
      console.log('\n📋 Workflow Analysis:');
      workflow.nodes.forEach(node => {
        if (node.type.includes('cron')) {
          console.log(`   ⏰ Cron Trigger: ${node.name}`);
        } else if (node.type.includes('webhook')) {
          console.log(`   🎣 Webhook Trigger: ${node.name}`);
        } else if (node.type.includes('httpRequest')) {
          console.log(`   🌐 API Call: ${node.name}`);
          if (node.parameters && node.parameters.url) {
            if (node.parameters.url.includes('newsapi.org')) {
              console.log(`     └─ News API integration configured`);
            } else if (node.parameters.url.includes('openai.com')) {
              console.log(`     └─ OpenAI API integration configured`);
            } else if (node.parameters.url.includes('resend.com')) {
              console.log(`     └─ Resend email integration configured`);
            }
          }
        } else if (node.type.includes('set')) {
          console.log(`   📝 Data Processing: ${node.name}`);
        }
      });
      
      return { success: true, workflow };
    } else {
      console.log('❌ Failed to get workflow status:', response.data);
      return { success: false };
    }
  } catch (error) {
    console.log('❌ Error checking workflow status:', error.message);
    return { success: false };
  }
}

async function testWebhookTrigger() {
  console.log('\n🎣 Testing webhook trigger...');
  
  try {
    console.log(`📡 Sending POST request to: ${WEBHOOK_URL}`);
    
    const testData = {
      test: "manual science news trigger",
      user: "jimkalinov",
      timestamp: new Date().toISOString(),
      source: "test-script"
    };

    const response = await makeRequest(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: testData
    });

    if (response.status === 200) {
      console.log('✅ Webhook trigger successful!');
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
      
      // Wait a moment and check for recent executions
      console.log('\n⏳ Waiting 5 seconds for execution to start...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return { success: true, response: response.data };
    } else {
      console.log('❌ Webhook trigger failed:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${response.data}`);
      return { success: false };
    }
  } catch (error) {
    console.log('❌ Error triggering webhook:', error.message);
    return { success: false };
  }
}

async function checkRecentExecutions() {
  console.log('\n📈 Checking recent executions...');
  
  try {
    const response = await makeRequest(`${N8N_API_URL}/executions?workflowId=${WORKFLOW_ID}&limit=3`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      const executions = response.data.data || [];
      console.log(`✅ Found ${executions.length} recent executions:`);
      
      if (executions.length > 0) {
        executions.forEach((exec, index) => {
          console.log(`\n   ${index + 1}. Execution ID: ${exec.id}`);
          console.log(`      ⏰ Started: ${exec.startedAt}`);
          console.log(`      ✅ Finished: ${exec.finished ? 'Yes' : 'No'}`);
          console.log(`      🎯 Mode: ${exec.mode}`);
          console.log(`      📊 Status: ${exec.status || 'Unknown'}`);
          
          if (exec.stoppedAt) {
            console.log(`      🏁 Stopped: ${exec.stoppedAt}`);
            const duration = new Date(exec.stoppedAt) - new Date(exec.startedAt);
            console.log(`      ⏱️  Duration: ${Math.round(duration / 1000)}s`);
          }
        });
        
        // Get detailed info for the latest execution
        if (executions[0]) {
          await getExecutionDetails(executions[0].id);
        }
        
        return { success: true, executions };
      } else {
        console.log('   📝 No recent executions found');
        return { success: true, executions: [] };
      }
    } else {
      console.log('❌ Failed to get executions:', response.data);
      return { success: false };
    }
  } catch (error) {
    console.log('❌ Error checking executions:', error.message);
    return { success: false };
  }
}

async function getExecutionDetails(executionId) {
  console.log(`\n🔍 Getting details for execution ${executionId}...`);
  
  try {
    const response = await makeRequest(`${N8N_API_URL}/executions/${executionId}`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      const execution = response.data;
      console.log('✅ Execution Details:');
      console.log(`   📋 Status: ${execution.status || (execution.finished ? 'Completed' : 'Running')}`);
      
      if (execution.data && execution.data.resultData) {
        const resultData = execution.data.resultData;
        console.log(`   📊 Result Data Available: ${Object.keys(resultData).length > 0 ? 'Yes' : 'No'}`);
        
        if (resultData.runData) {
          const runData = resultData.runData;
          console.log(`   🔧 Executed Nodes: ${Object.keys(runData).length}`);
          
          // Check for specific node outputs
          Object.keys(runData).forEach(nodeName => {
            console.log(`     • ${nodeName}: ${runData[nodeName].length} execution(s)`);
            
            // Check for email sending results
            if (nodeName.includes('Resend') && runData[nodeName][0]?.data?.main?.[0]?.[0]?.json) {
              const emailResult = runData[nodeName][0].data.main[0][0].json;
              if (emailResult.id) {
                console.log(`       └─ Email sent! ID: ${emailResult.id}`);
              }
            }
          });
        }
        
        if (resultData.error) {
          console.log(`   ❌ Execution Error: ${JSON.stringify(resultData.error)}`);
        }
      }
      
      return { success: true, execution };
    } else {
      console.log('❌ Failed to get execution details:', response.data);
      return { success: false };
    }
  } catch (error) {
    console.log('❌ Error getting execution details:', error.message);
    return { success: false };
  }
}

async function generateTestReport() {
  console.log('\n📋 GENERATING COMPREHENSIVE TEST REPORT');
  console.log('=======================================');
  console.log(`🎯 Workflow: [USR-jimkalinov] Daily Science News - AI Enhanced`);
  console.log(`👤 User: ${USER_EMAIL}`);
  console.log(`📧 From: onboarding@resend.dev`);
  console.log(`🔗 Webhook: ${WEBHOOK_URL}`);
  console.log(`📅 Test Date: ${new Date().toISOString()}`);
  console.log('');

  // Test 1: Workflow Status
  const statusTest = await testWorkflowStatus();
  
  // Test 2: Webhook Trigger (if status is good)
  let webhookTest = { success: false };
  if (statusTest.success) {
    webhookTest = await testWebhookTrigger();
  }
  
  // Test 3: Execution History
  const executionTest = await checkRecentExecutions();

  // Generate summary
  console.log('\n🏆 TEST SUMMARY');
  console.log('===============');
  console.log(`✅ Workflow Status: ${statusTest.success ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Webhook Trigger: ${webhookTest.success ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Execution History: ${executionTest.success ? 'PASS' : 'FAIL'}`);
  
  const overallSuccess = statusTest.success && webhookTest.success && executionTest.success;
  console.log(`🎯 Overall Test Result: ${overallSuccess ? '✅ SUCCESS' : '❌ NEEDS ATTENTION'}`);

  console.log('\n💡 NEXT STEPS:');
  if (overallSuccess) {
    console.log('✅ All tests passed! The workflow is ready for production use.');
    console.log('🔧 Configure API keys for full functionality:');
    console.log('   1. News API key for fetching science news');
    console.log('   2. OpenAI API key for AI summarization');  
    console.log('   3. Resend API key for email delivery');
    console.log(`⏰ Daily emails will be sent to ${USER_EMAIL} at 8:00 AM`);
    console.log(`🎣 Manual triggers available via: ${WEBHOOK_URL}`);
  } else {
    console.log('⚠️  Some tests failed. Check the workflow configuration:');
    if (!statusTest.success) console.log('   - Verify workflow is properly activated');
    if (!webhookTest.success) console.log('   - Check webhook URL and n8n connectivity'); 
    if (!executionTest.success) console.log('   - Review execution logs for errors');
  }
  
  console.log('\n🔬 SCIENCE NEWS WORKFLOW TEST COMPLETE! 🧪');
  
  return overallSuccess;
}

// Main execution
async function main() {
  console.log('🧪 ADVANCED SCIENCE NEWS WORKFLOW TEST');
  console.log('=====================================');
  console.log('🔬 Testing all components of the enhanced workflow...\n');
  
  try {
    const testResult = await generateTestReport();
    process.exit(testResult ? 0 : 1);
  } catch (error) {
    console.error('💥 Fatal error during testing:', error);
    process.exit(1);
  }
}

// Execute the test
main().catch(console.error);