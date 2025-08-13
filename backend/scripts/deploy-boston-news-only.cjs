#!/usr/bin/env node

/**
 * Deploy Boston News Email Workflow (News Only)
 * Updated workflow with Manual + Eval triggers, no weather component
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// n8n Configuration
const N8N_BASE_URL = 'https://n8nio-n8n-7xzf6n.sliplane.app';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0';

// Workflow file
const WORKFLOW_FILE = 'boston-news-email-only.json';

/**
 * Deploy workflow to n8n
 */
async function deployWorkflow(workflowData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(workflowData);
    
    const options = {
      hostname: 'n8nio-n8n-7xzf6n.sliplane.app',
      port: 443,
      path: '/api/v1/workflows',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-N8N-API-KEY': N8N_API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Main deployment function
 */
async function deployBostonNewsOnly() {
  console.log('🚀 Deploying Boston News Email Workflow (News Only)...');
  console.log(`🌐 n8n Instance: ${N8N_BASE_URL}\n`);

  const workflowPath = path.join(__dirname, '..', 'n8n-workflows', WORKFLOW_FILE);
  
  if (!fs.existsSync(workflowPath)) {
    console.log(`❌ Workflow file not found: ${WORKFLOW_FILE}`);
    process.exit(1);
  }

  try {
    console.log(`📁 Loading workflow: ${WORKFLOW_FILE}`);
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    
    console.log(`🔄 Deploying: ${workflowData.name}`);
    console.log(`📍 Updated Features:`);
    console.log(`   ✅ Manual Trigger node (for immediate testing)`);
    console.log(`   ✅ Evaluate Expression trigger (for evaluation)`);
    console.log(`   📰 Boston News: Latest 5 articles via NewsAPI`);
    console.log(`   🤖 AI Formatting: OpenAI GPT-4 email design`);
    console.log(`   📧 Email Delivery: Resend API to jimkalinov@gmail.com`);
    console.log(`   ❌ Weather: Removed as requested`);
    
    const result = await deployWorkflow(workflowData);
    
    console.log(`\n✅ Boston News Workflow deployed successfully!`);
    console.log(`📍 Workflow ID: ${result.id}`);
    console.log(`🔗 URL: ${N8N_BASE_URL}/workflow/${result.id}`);
    
    console.log('\n🎯 Updated Workflow Architecture:');
    console.log('1. Manual Trigger → Get Boston News');
    console.log('2. Evaluate Expression → Get Boston News'); 
    console.log('3. Boston News → Process News Data');
    console.log('4. Process Data → OpenAI Format Email');
    console.log('5. OpenAI → Format Final Email');
    console.log('6. Final Format → Send Email (Resend)');
    
    console.log('\n🔧 New Features:');
    console.log('✅ Manual Trigger: Click to test workflow immediately');
    console.log('✅ Evaluate Expression: For testing and evaluation scenarios');
    console.log('✅ Simplified Flow: News → AI → Email (no weather)');
    console.log('✅ Enhanced News: 5 articles from last 24 hours');
    
    console.log('\n⚠️  Configuration Required:');
    console.log('1. Replace "YOUR_OPENAI_API_KEY_HERE" with actual OpenAI key');
    console.log('2. Test using Manual Trigger button in n8n interface');
    console.log('3. Verify email delivery to jimkalinov@gmail.com');
    
    console.log('\n📧 Email Details:');
    console.log('• Recipient: jimkalinov@gmail.com');
    console.log('• Sender: onboarding@resend.dev');
    console.log('• Subject: 📰 Boston News Brief - [Date]');
    console.log('• Content: 5 latest Boston news articles');
    console.log('• Format: Minimalist HTML by OpenAI GPT-4');
    
    console.log('\n🧪 Testing Instructions:');
    console.log('1. Access workflow in n8n interface');
    console.log('2. Add real OpenAI API key');
    console.log('3. Click "Manual Trigger" to test');
    console.log('4. Monitor each node execution');
    console.log('5. Check email delivery');
    
    console.log('\n🎉 Ready for immediate testing with trigger nodes!');
    
    return {
      id: result.id,
      url: `${N8N_BASE_URL}/workflow/${result.id}`,
      status: 'success'
    };
    
  } catch (error) {
    console.log(`❌ Deployment failed: ${error.message}`);
    
    console.log('\n📋 Manual Setup Instructions:');
    console.log('1. Access n8n: https://n8nio-n8n-7xzf6n.sliplane.app');
    console.log('2. Import workflow JSON manually');
    console.log('3. Configure OpenAI API key');
    console.log('4. Test with Manual Trigger');
    
    return {
      status: 'failed',
      error: error.message
    };
  }
}

// Run the deployment
if (require.main === module) {
  deployBostonNewsOnly()
    .then((result) => {
      if (result.status === 'success') {
        console.log('\n🚀 Boston News Workflow Deployment Complete! 🎯');
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Deployment script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { deployBostonNewsOnly, deployWorkflow };