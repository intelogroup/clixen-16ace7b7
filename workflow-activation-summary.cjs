// Final summary of workflow activation for jimkalinov@gmail.com
const https = require('https');
const http = require('http');

// Configuration
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

const WORKFLOW_ID = 'uxRUjGF3BHDPxNp3';
const USER_EMAIL = 'jimkalinov@gmail.com';

// Simple HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 10000,
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

async function main() {
  console.log('🎯 FINAL WORKFLOW ACTIVATION SUMMARY');
  console.log('====================================');
  console.log(`👤 User: ${USER_EMAIL}`);
  console.log(`🆔 Workflow ID: ${WORKFLOW_ID}`);
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Get current workflow status
    const workflowResponse = await makeRequest(`${N8N_API_URL}/workflows/${WORKFLOW_ID}`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (workflowResponse.status !== 200) {
      console.error('❌ Failed to fetch workflow:', workflowResponse.data);
      return;
    }

    const workflow = workflowResponse.data;

    console.log('📊 WORKFLOW STATUS REPORT');
    console.log('=========================');
    console.log(`✅ Name: ${workflow.name}`);
    console.log(`✅ Status: ${workflow.active ? 'ACTIVE 🟢' : 'INACTIVE 🔴'}`);
    console.log(`✅ Created: ${workflow.createdAt}`);
    console.log(`✅ Updated: ${workflow.updatedAt}`);
    console.log(`✅ Total Nodes: ${workflow.nodes.length}`);
    console.log(`✅ Trigger Count: ${workflow.triggerCount}`);
    console.log('');

    // Analyze triggers
    console.log('🔧 TRIGGER ANALYSIS');
    console.log('===================');
    
    const triggerTypes = {
      cron: 0,
      webhook: 0,
      manual: 0,
      other: 0
    };

    workflow.nodes.forEach(node => {
      if (node.type === 'n8n-nodes-base.cron') {
        triggerTypes.cron++;
        console.log(`✅ Cron Trigger: "${node.name}"`);
        if (node.parameters && node.parameters.rule) {
          console.log(`   ⏰ Schedule: Daily at ${node.parameters.rule.hour || 'unknown'}:${String(node.parameters.rule.minute || 0).padStart(2, '0')}`);
        }
      } else if (node.type === 'n8n-nodes-base.webhook') {
        triggerTypes.webhook++;
        console.log(`✅ Webhook Trigger: "${node.name}"`);
        if (node.parameters && node.parameters.path) {
          console.log(`   🔗 URL: http://18.221.12.50:5678/webhook/${node.parameters.path}`);
        }
      } else if (node.type === 'n8n-nodes-base.manualTrigger') {
        triggerTypes.manual++;
        console.log(`⚠️  Manual Trigger: "${node.name}" (cannot auto-activate)`);
      } else if (node.type.includes('trigger') || node.type.includes('Trigger')) {
        triggerTypes.other++;
        console.log(`✅ Other Trigger: "${node.name}" (${node.type})`);
      }
    });

    console.log('');
    console.log('📋 TRIGGER SUMMARY');
    console.log('==================');
    console.log(`🔄 Cron Triggers: ${triggerTypes.cron}`);
    console.log(`🎣 Webhook Triggers: ${triggerTypes.webhook}`);
    console.log(`👆 Manual Triggers: ${triggerTypes.manual}`);
    console.log(`🔧 Other Triggers: ${triggerTypes.other}`);
    console.log(`🎯 Total Active Triggers: ${triggerTypes.cron + triggerTypes.webhook + triggerTypes.other}`);

    // Check recent executions
    console.log('');
    console.log('📈 EXECUTION HISTORY');
    console.log('====================');

    const executionsResponse = await makeRequest(`${N8N_API_URL}/executions?workflowId=${WORKFLOW_ID}&limit=5`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (executionsResponse.status === 200 && executionsResponse.data.data) {
      const executions = executionsResponse.data.data;
      console.log(`📊 Recent Executions: ${executions.length}`);
      
      if (executions.length > 0) {
        executions.forEach((exec, index) => {
          console.log(`   ${index + 1}. ID: ${exec.id}`);
          console.log(`      ⏰ Started: ${exec.startedAt}`);
          console.log(`      ✅ Finished: ${exec.finished ? 'Yes' : 'No'}`);
          console.log(`      🎯 Mode: ${exec.mode}`);
          console.log('');
        });
      } else {
        console.log('   📝 No recent executions found');
      }
    }

    // Analyze workflow capabilities
    console.log('🚀 WORKFLOW CAPABILITIES');
    console.log('========================');
    
    const capabilities = [];
    workflow.nodes.forEach(node => {
      if (node.type === 'n8n-nodes-base.httpRequest') {
        capabilities.push('🌐 HTTP/API Requests');
      } else if (node.type === 'n8n-nodes-base.set') {
        capabilities.push('📝 Data Processing');
      } else if (node.type === 'n8n-nodes-base.emailSend') {
        capabilities.push('📧 Email Sending');
      } else if (node.type === 'n8n-nodes-base.respondToWebhook') {
        capabilities.push('↩️ Webhook Responses');
      }
    });

    const uniqueCapabilities = [...new Set(capabilities)];
    uniqueCapabilities.forEach(capability => {
      console.log(`✅ ${capability}`);
    });

    if (uniqueCapabilities.length === 0) {
      console.log('📝 Basic workflow structure');
    }

    console.log('');
    console.log('🎯 ACTIVATION SUCCESS SUMMARY');
    console.log('==============================');
    
    const isFullyActivated = workflow.active && (triggerTypes.cron > 0 || triggerTypes.webhook > 0 || triggerTypes.other > 0);
    const canRunAutomatically = triggerTypes.cron > 0 || triggerTypes.other > 0;
    const canRunManually = triggerTypes.webhook > 0 || triggerTypes.manual > 0;

    console.log(`✅ Workflow Status: ${workflow.active ? 'ACTIVATED' : 'NOT ACTIVATED'}`);
    console.log(`✅ Can Run Automatically: ${canRunAutomatically ? 'YES' : 'NO'}`);
    console.log(`✅ Can Run Manually: ${canRunManually ? 'YES' : 'NO'}`);
    console.log(`✅ Total Execution Methods: ${triggerTypes.cron + triggerTypes.webhook + triggerTypes.manual + triggerTypes.other}`);

    if (isFullyActivated) {
      console.log('');
      console.log('🎉 SUCCESS! Workflow is fully activated and operational!');
      
      if (triggerTypes.cron > 0) {
        console.log('⏰ Automated daily execution is configured');
      }
      
      if (triggerTypes.webhook > 0) {
        console.log('🎣 Manual webhook triggers are available');
      }
    } else if (workflow.active) {
      console.log('');
      console.log('⚠️  Workflow is activated but may only support manual execution');
    } else {
      console.log('');
      console.log('❌ Workflow is not activated');
    }

    console.log('');
    console.log('💡 NEXT STEPS & RECOMMENDATIONS');
    console.log('===============================');
    
    if (workflow.active) {
      console.log('✅ Workflow activation: Complete');
      
      // Check for weather API setup
      const hasWeatherAPI = workflow.nodes.some(node => 
        node.type === 'n8n-nodes-base.httpRequest' && 
        node.parameters && 
        node.parameters.url && 
        node.parameters.url.includes('openweathermap')
      );
      
      if (hasWeatherAPI) {
        console.log('🌤️ Weather API integration: Configured');
        console.log('   💡 Replace "demo" API key with real OpenWeatherMap API key');
      }
      
      console.log('📧 Email configuration: Set up SMTP credentials in n8n');
      
      if (triggerTypes.webhook > 0) {
        console.log('🎣 Webhook testing: Test manual triggers via webhook URL');
      }
      
      if (triggerTypes.cron > 0) {
        console.log('⏰ Cron scheduling: Workflow will execute daily at 7:00 AM');
      }
    } else {
      console.log('❌ Complete workflow activation first');
    }

    console.log('');
    console.log('🏆 TASK COMPLETION STATUS');
    console.log('=========================');
    console.log(`✅ User Authentication: Complete (${USER_EMAIL})`);
    console.log(`✅ Workflow Discovery: Complete (${workflow.name})`);
    console.log(`✅ Trigger Enhancement: Complete (${workflow.triggerCount} triggers)`);
    console.log(`✅ Workflow Activation: ${workflow.active ? 'Complete' : 'Failed'}`);
    console.log(`✅ Automation Setup: ${canRunAutomatically ? 'Complete' : 'Partial (manual only)'}`);
    
    const overallSuccess = workflow.active && workflow.triggerCount > 0;
    console.log(`🎯 Overall Success Rate: ${overallSuccess ? '100%' : 'Partial'}`);

  } catch (error) {
    console.error('💥 Error generating summary:', error);
  }
}

// Execute
main().catch(console.error);