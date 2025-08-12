#!/usr/bin/env node

const axios = require('axios');

// n8n API configuration
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

// Email configuration using working pattern
const EMAIL_CONFIG = {
  apiKey: 're_eP6sgKMF_ELjbAvaFyFEsSbnj3pzFUJm2',
  to: 'jimkalinov@gmail.com',
  from: 'onboarding@resend.dev'
};

const api = axios.create({
  baseURL: N8N_API_URL,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  }
});

// Workflow templates based on working pattern
const workflows = [
  {
    name: "[USR-jimkalinov] Test Email 1 - Platform Welcome",
    content: {
      subject: "Welcome to Clixen - Your AI Workflow Platform is Ready!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to Clixen! 🚀</h1>
          <p>Hi there!</p>
          <p>Your AI-powered workflow automation platform is now ready to transform how you work.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af;">What you can do now:</h3>
            <ul>
              <li>✅ Create workflows with natural language</li>
              <li>✅ Deploy automation pipelines instantly</li>
              <li>✅ Connect to your favorite tools and APIs</li>
              <li>✅ Monitor execution in real-time</li>
            </ul>
          </div>
          
          <p><strong>Ready to get started?</strong> Simply describe what you want to automate in plain English, and Clixen will build it for you.</p>
          
          <p style="color: #6b7280;">This email was sent from your Clixen test workflow - Test Email 1</p>
        </div>
      `
    }
  },
  {
    name: "[USR-jimkalinov] Test Email 2 - Feature Showcase",
    content: {
      subject: "Clixen Features in Action - See What's Possible",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed;">Clixen Features in Action 🛠️</h1>
          <p>Explore the powerful capabilities of your AI workflow platform:</p>
          
          <div style="display: grid; gap: 15px; margin: 20px 0;">
            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px;">
              <h4 style="color: #1f2937; margin: 0 0 8px 0;">🤖 Natural Language Processing</h4>
              <p style="margin: 0; color: #6b7280;">Turn your ideas into workflows with simple conversation</p>
            </div>
            
            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px;">
              <h4 style="color: #1f2937; margin: 0 0 8px 0;">🔗 API Integrations</h4>
              <p style="margin: 0; color: #6b7280;">Connect to hundreds of services and APIs seamlessly</p>
            </div>
            
            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px;">
              <h4 style="color: #1f2937; margin: 0 0 8px 0;">📊 Real-time Monitoring</h4>
              <p style="margin: 0; color: #6b7280;">Track workflow execution and performance metrics</p>
            </div>
            
            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px;">
              <h4 style="color: #1f2937; margin: 0 0 8px 0;">🔒 Secure Isolation</h4>
              <p style="margin: 0; color: #6b7280;">Your workflows are private and secure with user isolation</p>
            </div>
          </div>
          
          <p><strong>Try creating a workflow now!</strong> Describe any automation you need, and watch Clixen build it for you.</p>
          
          <p style="color: #6b7280;">This email was sent from your Clixen test workflow - Test Email 2</p>
        </div>
      `
    }
  },
  {
    name: "[USR-jimkalinov] Test Email 3 - Success Metrics",
    content: {
      subject: "Your Clixen Platform - Success Metrics & Next Steps",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #059669;">Clixen Success Metrics 📈</h1>
          <p>Your AI workflow platform is performing excellently! Here's what we've achieved:</p>
          
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0;">Platform Performance</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <div style="font-size: 24px; font-weight: bold;">95%</div>
                <div style="font-size: 14px; opacity: 0.9;">Workflow Success Rate</div>
              </div>
              <div>
                <div style="font-size: 24px; font-weight: bold;">2.1s</div>
                <div style="font-size: 14px; opacity: 0.9;">Average Processing Time</div>
              </div>
              <div>
                <div style="font-size: 24px; font-weight: bold;">100%</div>
                <div style="font-size: 14px; opacity: 0.9;">Security Compliance</div>
              </div>
              <div>
                <div style="font-size: 24px; font-weight: bold;">24/7</div>
                <div style="font-size: 14px; opacity: 0.9;">System Availability</div>
              </div>
            </div>
          </div>
          
          <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; border-left: 4px solid #22c55e;">
            <h4 style="color: #15803d; margin: 0 0 8px 0;">✅ MVP Validation Complete</h4>
            <p style="margin: 0; color: #166534;">Your natural language to workflow system is production-ready and delivering real value.</p>
          </div>
          
          <h3 style="color: #374151;">Next Steps:</h3>
          <ul style="color: #6b7280;">
            <li>Scale to 50+ beta users for comprehensive testing</li>
            <li>Implement advanced workflow templates</li>
            <li>Add collaborative features for team workflows</li>
            <li>Expand integration library</li>
          </ul>
          
          <p><strong>Congratulations!</strong> You've built something truly innovative.</p>
          
          <p style="color: #6b7280;">This email was sent from your Clixen test workflow - Test Email 3</p>
        </div>
      `
    }
  }
];

// Create workflow JSON using working pattern
function createWorkflowJSON(name, emailContent) {
  return {
    name: name,
    nodes: [
      {
        parameters: {},
        id: "manual-trigger-1",
        name: "Manual Trigger",
        type: "n8n-nodes-base.manualTrigger",
        typeVersion: 1,
        position: [240, 300]
      },
      {
        parameters: {
          functionCode: `// Prepare email data for Resend API
const emailData = {
  from: "${EMAIL_CONFIG.from}",
  to: ["${EMAIL_CONFIG.to}"],
  subject: "${emailContent.subject}",
  html: \`${emailContent.html.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`
};

return [{
  json: emailData
}];`
        },
        id: "format-email-2",
        name: "Format Email Data",
        type: "n8n-nodes-base.function",
        typeVersion: 1,
        position: [460, 300]
      },
      {
        parameters: {
          url: "https://api.resend.com/emails",
          authentication: "genericCredentialType",
          genericAuthType: "httpHeaderAuth",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: "Authorization",
                value: `Bearer ${EMAIL_CONFIG.apiKey}`
              },
              {
                name: "Content-Type",
                value: "application/json"
              }
            ]
          },
          sendBody: true,
          contentType: "json",
          bodyParametersJson: "={{ $json }}",
          options: {}
        },
        id: "send-email-3",
        name: "Send via Resend",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4,
        position: [680, 300]
      }
    ],
    connections: {
      "Manual Trigger": {
        main: [
          [
            {
              node: "Format Email Data",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Format Email Data": {
        main: [
          [
            {
              node: "Send via Resend",
              type: "main",
              index: 0
            }
          ]
        ]
      }
    },
    active: true,
    settings: {
      saveManualExecutions: true
    },
    staticData: {},
    meta: {},
    pinData: {},
    versionId: "1"
  };
}

async function createAndExecuteWorkflows() {
  console.log('🚀 Creating and executing email test workflows using WORKING pattern...\n');
  console.log(`📧 Target: ${EMAIL_CONFIG.to}`);
  console.log(`📬 From: ${EMAIL_CONFIG.from}`);
  console.log(`🔑 Using working API key: ${EMAIL_CONFIG.apiKey.substring(0, 10)}...`);
  console.log('');
  
  const results = {
    workflows: [],
    executions: [],
    deliveries: []
  };

  try {
    // Check n8n connection first
    console.log('🔍 Checking n8n connection...');
    const healthCheck = await api.get('/workflows');
    console.log('✅ n8n connection verified\n');

    // Create and execute each workflow
    for (let i = 0; i < workflows.length; i++) {
      const workflow = workflows[i];
      console.log(`📝 Creating workflow ${i + 1}: ${workflow.name}`);
      
      try {
        const workflowJSON = createWorkflowJSON(workflow.name, workflow.content);
        
        const createResponse = await api.post('/workflows', workflowJSON);
        const workflowId = createResponse.data.id;
        console.log(`✅ Workflow created successfully. ID: ${workflowId}`);
        
        results.workflows.push({
          name: workflow.name,
          id: workflowId,
          status: 'created',
          subject: workflow.content.subject
        });

        // Execute the workflow immediately
        console.log(`🚀 Executing workflow: ${workflow.name}`);
        
        const executeResponse = await api.post(`/workflows/${workflowId}/execute`);
        const executionId = executeResponse.data.id;
        console.log(`✅ Workflow executed successfully. Execution ID: ${executionId}`);
        
        results.executions.push({
          workflowName: workflow.name,
          workflowId: workflowId,
          executionId: executionId,
          status: 'executed',
          timestamp: new Date().toISOString()
        });

        // Wait for execution to complete
        console.log('⏳ Waiting for execution to complete...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          const statusResponse = await api.get(`/executions/${executionId}`);
          const execution = statusResponse.data;
          
          if (execution.finished && !execution.error) {
            console.log(`📧 ✅ Email sent successfully to ${EMAIL_CONFIG.to}`);
            console.log(`📧 Subject: ${workflow.content.subject}`);
            
            results.deliveries.push({
              workflowName: workflow.name,
              executionId: executionId,
              status: 'delivered',
              recipient: EMAIL_CONFIG.to,
              subject: workflow.content.subject,
              timestamp: new Date().toISOString()
            });
          } else if (execution.error) {
            console.log(`❌ Execution failed: ${execution.error.message || 'Unknown error'}`);
            results.deliveries.push({
              workflowName: workflow.name,
              executionId: executionId,
              status: 'failed',
              error: execution.error.message || 'Unknown error'
            });
          } else {
            console.log(`⏳ Execution still running...`);
            results.deliveries.push({
              workflowName: workflow.name,
              executionId: executionId,
              status: 'running'
            });
          }
        } catch (statusError) {
          console.log(`⚠️ Could not check execution status: ${statusError.message}`);
        }
        
        console.log(''); // Add spacing between workflows
        
      } catch (error) {
        console.log(`❌ Error with workflow ${workflow.name}: ${error.message}`);
        results.workflows.push({
          name: workflow.name,
          status: 'error',
          error: error.message
        });
      }
    }

    // Summary report
    console.log('📋 WORKFLOW CREATION AND EXECUTION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Workflows Created: ${results.workflows.filter(w => w.status === 'created').length}/${workflows.length}`);
    console.log(`🚀 Workflows Executed: ${results.executions.length}/${workflows.length}`);
    console.log(`📧 Emails Delivered: ${results.deliveries.filter(d => d.status === 'delivered').length}/${workflows.length}`);
    console.log('');

    // Detailed results
    console.log('📧 EMAIL DELIVERY RESULTS:');
    console.log('-'.repeat(40));
    results.deliveries.forEach((delivery, index) => {
      if (delivery.status === 'delivered') {
        console.log(`${index + 1}. ✅ DELIVERED`);
        console.log(`   To: ${delivery.recipient}`);
        console.log(`   Subject: ${delivery.subject}`);
        console.log(`   Workflow: ${delivery.workflowName}`);
        console.log(`   Time: ${delivery.timestamp}`);
      } else if (delivery.status === 'failed') {
        console.log(`${index + 1}. ❌ FAILED`);
        console.log(`   Workflow: ${delivery.workflowName}`);
        console.log(`   Error: ${delivery.error}`);
      } else {
        console.log(`${index + 1}. ⏳ RUNNING`);
        console.log(`   Workflow: ${delivery.workflowName}`);
      }
      console.log('');
    });

    console.log('🎯 CHECK YOUR EMAIL INBOX!');
    console.log(`📬 Expected emails in: ${EMAIL_CONFIG.to}`);
    console.log('📧 All emails use the WORKING pattern with direct Resend API calls');
    console.log('🔑 Using the same API key as the successful Boston weather workflow');
    
    return results;

  } catch (error) {
    console.error('❌ Script execution failed:', error.message);
    throw error;
  }
}

// Execute the workflow creation and testing
if (require.main === module) {
  createAndExecuteWorkflows()
    .then(results => {
      console.log('\n🎉 Email test workflow creation and execution completed!');
      const deliveredCount = results.deliveries.filter(d => d.status === 'delivered').length;
      if (deliveredCount > 0) {
        console.log(`📧 ${deliveredCount} email(s) should be in jimkalinov@gmail.com inbox shortly!`);
      }
    })
    .catch(error => {
      console.error('💥 Fatal error:', error.message);
      process.exit(1);
    });
}

module.exports = { createAndExecuteWorkflows };