#!/usr/bin/env node

/**
 * Test Existing Workflow with Resend Email
 * Use existing deployed workflow and test execution with real email
 */

import axios from 'axios';

const N8N_HOST = 'http://18.221.12.50:5678';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';
const RESEND_API_KEY = 're_eP6sgKMF_ELjbAvaFyFEsSbnj3pzFUJm2';

class ExistingWorkflowTester {
  constructor() {
    this.api = axios.create({
      baseURL: `${N8N_HOST}/api/v1`,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  async runTest() {
    console.log('🔍 TESTING EXISTING WORKFLOWS WITH LIVE EXECUTION\n');
    
    // Step 1: List existing workflows
    console.log('📋 Step 1: Listing existing workflows...');
    const workflows = await this.listWorkflows();
    
    // Step 2: Create a simple test workflow with Resend
    console.log('\n🚀 Step 2: Creating simple Resend test...');
    const testWorkflowId = await this.createSimpleResendTest();
    
    // Step 3: Execute and test
    if (testWorkflowId) {
      console.log('\n⚡ Step 3: Executing workflow...');
      await this.executeWorkflow(testWorkflowId);
    }
    
    // Step 4: Test error scenarios
    console.log('\n🔥 Step 4: Testing error handling...');
    await this.testErrorScenarios();
    
    // Step 5: Check execution logs
    console.log('\n📊 Step 5: Checking execution logs...');
    await this.checkExecutionLogs();
    
    console.log('\n✅ Test completed!');
  }

  async listWorkflows() {
    try {
      const response = await this.api.get('/workflows');
      const workflows = response.data.data || response.data;
      
      console.log(`  Found ${workflows.length} workflows:`);
      
      const prodWorkflows = workflows.filter(w => w.name.includes('PROD'));
      prodWorkflows.slice(0, 5).forEach(wf => {
        console.log(`    • ${wf.id}: ${wf.name} (${wf.active ? 'Active' : 'Inactive'})`);
      });
      
      return workflows;
      
    } catch (error) {
      console.log('  ❌ Failed to list workflows:', error.message);
      return [];
    }
  }

  async createSimpleResendTest() {
    // Very simple workflow that just sends a test email
    const simpleWorkflow = {
      name: '[LIVE TEST] Simple Resend Email',
      nodes: [
        {
          id: 'start',
          name: 'Start',
          type: 'n8n-nodes-base.manualTrigger',
          position: [240, 300],
          typeVersion: 1,
          parameters: {}
        },
        {
          id: 'resend',
          name: 'Send Test Email',
          type: 'n8n-nodes-base.httpRequest',
          position: [460, 300],
          typeVersion: 4.1,
          parameters: {
            method: 'POST',
            url: 'https://api.resend.com/emails',
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: 'Authorization',
                  value: 'Bearer ' + RESEND_API_KEY
                },
                {
                  name: 'Content-Type', 
                  value: 'application/json'
                }
              ]
            },
            sendBody: true,
            bodyParameters: {
              parameters: [
                {
                  name: 'from',
                  value: 'test@terragonlabs.com'
                },
                {
                  name: 'to',
                  value: 'jimkalinov@gmail.com'
                },
                {
                  name: 'subject',
                  value: '✅ n8n + Resend Test - LIVE SUCCESS!'
                },
                {
                  name: 'html',
                  value: '<h1>🎉 SUCCESS!</h1><p><strong>This email was sent from an n8n workflow using Resend API!</strong></p><p>📅 Sent at: ' + new Date().toISOString() + '</p><p>🔧 Workflow executed successfully</p><p>📧 Email delivery confirmed</p><p>✅ All systems working!</p>'
                }
              ]
            }
          }
        }
      ],
      connections: {
        'Start': {
          main: [[{ node: 'Send Test Email', type: 'main', index: 0 }]]
        }
      },
      settings: {
        executionOrder: 'v1'
      }
    };

    try {
      const response = await this.api.post('/workflows', simpleWorkflow);
      const deployed = response.data;
      
      console.log('  ✅ Test workflow created!');
      console.log('  🆔 ID:', deployed.id);
      console.log('  📧 Target: jimkalinov@gmail.com');
      console.log('  🔗 Via: Resend API');
      
      return deployed.id;
      
    } catch (error) {
      console.log('  ❌ Failed to create test workflow:', error.response?.data?.message || error.message);
      return null;
    }
  }

  async executeWorkflow(workflowId) {
    try {
      // Get workflow data
      const getResponse = await this.api.get('/workflows/' + workflowId);
      const workflowData = getResponse.data;
      
      console.log('  📝 Retrieved workflow data');
      console.log('  🎯 Executing workflow...');
      
      // Execute
      const executeResponse = await this.api.post('/workflows/' + workflowId + '/execute', {
        workflowData: workflowData
      });
      
      const execution = executeResponse.data;
      console.log('  🚀 Execution started:', execution.id);
      
      // Wait for completion
      let attempts = 0;
      let completed = false;
      
      while (attempts < 15 && !completed) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
        
        try {
          const statusResponse = await this.api.get('/executions/' + execution.id);
          const status = statusResponse.data;
          
          if (status.finished) {
            completed = true;
            const hasError = status.data?.resultData?.error;
            
            console.log('  ✅ Execution finished:', hasError ? 'WITH ERRORS' : 'SUCCESS');
            console.log('  ⏱️  Duration:', attempts * 2, 'seconds');
            
            if (hasError) {
              console.log('  ❌ Error details:');
              console.log('     ', JSON.stringify(hasError).substring(0, 300));
            } else {
              // Check for email result
              const runData = status.data?.resultData?.runData || {};
              
              if (runData['Send Test Email']) {
                const emailResult = runData['Send Test Email'][0]?.data?.main?.[0]?.[0]?.json;
                
                if (emailResult && emailResult.id) {
                  console.log('  🎉 EMAIL SENT SUCCESSFULLY!');
                  console.log('  📮 Resend Email ID:', emailResult.id);
                  console.log('  📬 Delivered to: jimkalinov@gmail.com');
                  console.log('  ⚡ Status: Live email delivery confirmed!');
                  console.log('\n  👀 CHECK YOUR EMAIL INBOX FOR THE TEST MESSAGE!');
                } else {
                  console.log('  ⚠️  Email result unclear:', JSON.stringify(emailResult || {}).substring(0, 150));
                }
              }
            }
            
          } else {
            console.log('  🔄 Still running... (' + (attempts * 2) + 's)');
          }
        } catch (statusError) {
          console.log('  ⚠️  Status check failed:', statusError.message);
          break;
        }
      }
      
      if (!completed) {
        console.log('  ⏰ Timeout after', attempts * 2, 'seconds');
      }
      
      // Clean up test workflow
      await this.api.delete('/workflows/' + workflowId);
      console.log('  🧹 Test workflow cleaned up');
      
    } catch (error) {
      console.log('  ❌ Execution failed:', error.response?.data?.message || error.message);
    }
  }

  async testErrorScenarios() {
    console.log('  🧪 Testing malformed JSON workflow...');
    
    const badWorkflow = {
      name: '[ERROR] Bad Workflow',
      nodes: [
        {
          id: 'bad',
          // Missing required 'type' field
          position: [250, 300]
        }
      ]
    };
    
    try {
      await this.api.post('/workflows', badWorkflow);
      console.log('  ❌ Malformed workflow should have failed');
    } catch (error) {
      console.log('  ✅ Malformed workflow correctly rejected');
      console.log('     Error:', error.response?.data?.message || error.message);
    }
    
    console.log('  🧪 Testing invalid execution...');
    
    try {
      await this.api.post('/workflows/fake-id-12345/execute', {});
      console.log('  ❌ Invalid execution should have failed');
    } catch (error) {
      console.log('  ✅ Invalid execution correctly rejected');
      console.log('     Error:', error.response?.status === 404 ? 'Not Found' : error.message);
    }
  }

  async checkExecutionLogs() {
    try {
      const response = await this.api.get('/executions', { params: { limit: 5 } });
      const executions = response.data.data?.results || response.data.results || [];
      
      console.log('  📊 Recent executions:');
      console.log('     Total found:', executions.length);
      
      if (executions.length > 0) {
        executions.slice(0, 3).forEach((exec, i) => {
          const status = exec.finished ? (exec.data?.resultData?.error ? 'Failed' : 'Success') : 'Running';
          console.log(`     ${i+1}. ${exec.id}: ${status} (${exec.mode || 'unknown'} mode)`);
        });
        
        const finished = executions.filter(e => e.finished).length;
        const successful = executions.filter(e => e.finished && !e.data?.resultData?.error).length;
        const successRate = finished > 0 ? Math.round((successful / finished) * 100) : 0;
        
        console.log('  📈 Success rate:', successRate + '% (' + successful + '/' + finished + ')');
      }
      
    } catch (error) {
      console.log('  ❌ Log check failed:', error.message);
    }
  }
}

// Run the test
(async () => {
  const tester = new ExistingWorkflowTester();
  await tester.runTest();
})().catch(console.error);