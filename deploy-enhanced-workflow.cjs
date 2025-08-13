#!/usr/bin/env node

/**
 * Enhanced n8n Workflow Deployment Script
 * Features:
 * - SMTP credential configuration
 * - Webhook URL generation
 * - Automatic workflow activation
 * - Execution testing
 */

const fs = require('fs');
const path = require('path');

// Configuration
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

// SMTP Configuration (Gmail example - replace with your credentials)
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  user: 'your-email@gmail.com', // Replace with your email
  password: 'your-app-password', // Replace with your Gmail app password
  sender: 'your-email@gmail.com' // Replace with your email
};

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${N8N_API_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      console.error(`API Error (${response.status}):`, data);
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.message);
    throw error;
  }
}

// Step 1: Create SMTP Credentials
async function createSMTPCredentials() {
  console.log('📧 Setting up SMTP credentials...');
  
  try {
    // First, check if credentials already exist
    const existingCreds = await apiCall('/credentials');
    const smtpCred = existingCreds.data?.find(c => c.type === 'smtp');
    
    if (smtpCred) {
      console.log('✅ SMTP credentials already exist');
      return smtpCred.id;
    }
    
    // Create new SMTP credentials
    const credentialData = {
      name: 'Gmail SMTP Enhanced',
      type: 'smtp',
      data: {
        host: SMTP_CONFIG.host,
        port: SMTP_CONFIG.port,
        secure: false, // false for TLS (port 587)
        user: SMTP_CONFIG.user,
        password: SMTP_CONFIG.password,
        sender: SMTP_CONFIG.sender
      }
    };
    
    const result = await apiCall('/credentials', {
      method: 'POST',
      body: JSON.stringify(credentialData)
    });
    
    console.log('✅ SMTP credentials created successfully');
    return result.data.id;
  } catch (error) {
    console.log('⚠️ Could not create SMTP credentials automatically');
    console.log('Please configure SMTP manually in n8n UI:');
    console.log('- Host: smtp.gmail.com');
    console.log('- Port: 587');
    console.log('- Security: TLS');
    console.log('- User: your Gmail address');
    console.log('- Password: your Gmail app password');
    return 'smtp_gmail_enhanced';
  }
}

// Step 2: Deploy the workflow
async function deployWorkflow(credentialId) {
  console.log('\n🚀 Deploying enhanced workflow...');
  
  try {
    // Load workflow JSON
    const workflowPath = path.join(__dirname, 'enhanced-email-workflow.json');
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    
    // Update credential ID in workflow
    workflowData.nodes.forEach(node => {
      if (node.credentials?.smtp) {
        node.credentials.smtp.id = credentialId;
      }
    });
    
    // Add unique name with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    workflowData.name = `[ENHANCED] Email Automation - ${timestamp}`;
    
    // Create workflow
    const result = await apiCall('/workflows', {
      method: 'POST',
      body: JSON.stringify(workflowData)
    });
    
    console.log(`✅ Workflow created: ${result.data.name}`);
    console.log(`   ID: ${result.data.id}`);
    
    return result.data;
  } catch (error) {
    console.error('❌ Failed to deploy workflow:', error.message);
    throw error;
  }
}

// Step 3: Activate the workflow
async function activateWorkflow(workflowId) {
  console.log('\n⚡ Activating workflow...');
  
  try {
    const result = await apiCall(`/workflows/${workflowId}/activate`, {
      method: 'POST'
    });
    
    console.log('✅ Workflow activated successfully');
    return result.data;
  } catch (error) {
    console.error('❌ Failed to activate workflow:', error.message);
    throw error;
  }
}

// Step 4: Get webhook URL
async function getWebhookUrl(workflowId) {
  console.log('\n🔗 Getting webhook URL...');
  
  try {
    const workflow = await apiCall(`/workflows/${workflowId}`);
    
    // Find webhook node
    const webhookNode = workflow.data.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
    if (webhookNode) {
      const webhookPath = webhookNode.parameters.path || 'webhook';
      const webhookUrl = `http://18.221.12.50:5678/webhook/${webhookPath}`;
      
      console.log(`✅ Webhook URL: ${webhookUrl}`);
      return webhookUrl;
    }
    
    console.log('⚠️ No webhook trigger found in workflow');
    return null;
  } catch (error) {
    console.error('❌ Failed to get webhook URL:', error.message);
    return null;
  }
}

// Step 5: Test webhook execution
async function testWebhook(webhookUrl) {
  if (!webhookUrl) {
    console.log('\n⚠️ Skipping webhook test (no webhook URL)');
    return;
  }
  
  console.log('\n🧪 Testing webhook execution...');
  
  const testData = {
    to: 'jimkalinov@gmail.com',
    subject: '🎉 Test Email from Enhanced n8n Workflow',
    content: `
      <h2>Hello from n8n!</h2>
      <p>This is a test email sent via the enhanced workflow.</p>
      <p><strong>Features working:</strong></p>
      <ul>
        <li>✅ Webhook trigger</li>
        <li>✅ SMTP configuration</li>
        <li>✅ Email formatting</li>
        <li>✅ Automatic activation</li>
      </ul>
      <p>Timestamp: ${new Date().toISOString()}</p>
    `
  };
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.text();
    
    if (response.ok) {
      console.log('✅ Webhook test successful!');
      console.log('   Response:', result);
    } else {
      console.log('⚠️ Webhook returned non-OK status:', response.status);
      console.log('   Response:', result);
    }
  } catch (error) {
    console.error('❌ Webhook test failed:', error.message);
  }
}

// Step 6: Display summary
function displaySummary(workflow, webhookUrl) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 DEPLOYMENT SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n✅ Workflow Name: ${workflow.name}`);
  console.log(`✅ Workflow ID: ${workflow.id}`);
  console.log(`✅ Status: ${workflow.active ? 'ACTIVE' : 'INACTIVE'}`);
  
  if (webhookUrl) {
    console.log(`\n🔗 Webhook URL: ${webhookUrl}`);
    console.log('\n📬 Test the webhook with curl:');
    console.log(`curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "jimkalinov@gmail.com",
    "subject": "Test Email",
    "content": "This is a test email from n8n"
  }'`);
  }
  
  console.log('\n⏰ Schedule Triggers:');
  console.log('   - 9:00 AM daily');
  console.log('   - 6:00 PM daily');
  
  console.log('\n📧 SMTP Configuration:');
  console.log('   - Host: ' + SMTP_CONFIG.host);
  console.log('   - Port: ' + SMTP_CONFIG.port);
  console.log('   - Security: TLS');
  
  console.log('\n💡 Next Steps:');
  console.log('1. Update SMTP credentials in n8n UI if needed');
  console.log('2. Test the webhook URL with sample data');
  console.log('3. Monitor execution logs in n8n');
  console.log('4. Check email delivery to jimkalinov@gmail.com');
  
  console.log('\n' + '='.repeat(60));
}

// Main execution
async function main() {
  console.log('🎯 Enhanced n8n Workflow Deployment Script');
  console.log('==========================================\n');
  
  try {
    // Step 1: Set up SMTP credentials
    const credentialId = await createSMTPCredentials();
    
    // Step 2: Deploy workflow
    const workflow = await deployWorkflow(credentialId);
    
    // Step 3: Activate workflow
    await activateWorkflow(workflow.id);
    
    // Step 4: Get webhook URL
    const webhookUrl = await getWebhookUrl(workflow.id);
    
    // Step 5: Test webhook
    await testWebhook(webhookUrl);
    
    // Step 6: Display summary
    displaySummary(workflow, webhookUrl);
    
    console.log('\n✨ Deployment completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { apiCall, deployWorkflow, activateWorkflow };