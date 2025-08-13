#!/usr/bin/env node

/**
 * Deploy News Email Workflows to n8n
 * Deploys workflows that use NewsAPI credential and hardcoded Resend API
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// n8n Configuration
const N8N_BASE_URL = 'https://n8nio-n8n-7xzf6n.sliplane.app';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0';

// Workflow files to deploy
const workflowFiles = [
  'resend-email-template.json',
  'news-email-workflow.json'
];

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
 * Test workflow execution
 */
async function testWorkflow(workflowId, testData = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(testData);
    
    const options = {
      hostname: 'n8nio-n8n-7xzf6n.sliplane.app',
      port: 443,
      path: `/api/v1/workflows/${workflowId}/execute`,
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
async function deployNewsEmailWorkflows() {
  console.log('🚀 Deploying News Email Workflows to n8n...');
  console.log(`🌐 n8n Instance: ${N8N_BASE_URL}\n`);

  const results = [];
  const workflowsDir = path.join(__dirname, '..', 'n8n-workflows');

  for (const filename of workflowFiles) {
    const filePath = path.join(workflowsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filename}`);
      results.push({ name: filename, status: 'failed', error: 'File not found' });
      continue;
    }

    try {
      console.log(`📁 Loading workflow: ${filename}`);
      const workflowData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      console.log(`🔄 Deploying: ${workflowData.name}`);
      const result = await deployWorkflow(workflowData);
      
      results.push({ 
        name: workflowData.name, 
        filename: filename,
        status: 'success', 
        id: result.id,
        url: `${N8N_BASE_URL}/workflow/${result.id}`
      });
      
      console.log(`✅ ${workflowData.name} deployed successfully`);
      console.log(`   📍 Workflow ID: ${result.id}`);
      console.log(`   🔗 URL: ${N8N_BASE_URL}/workflow/${result.id}`);
      
    } catch (error) {
      results.push({ 
        name: filename, 
        status: 'failed', 
        error: error.message 
      });
      console.log(`❌ ${filename} failed: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('📊 Deployment Summary:');
  console.log('═'.repeat(60));
  
  results.forEach(result => {
    const status = result.status === 'success' ? '✅' : '❌';
    console.log(`${status} ${result.name || result.filename}: ${result.status}`);
    if (result.id) {
      console.log(`   🆔 ID: ${result.id}`);
      console.log(`   🔗 URL: ${result.url}`);
    }
    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`);
    }
  });

  const successCount = results.filter(r => r.status === 'success').length;
  console.log(`\n📈 Success Rate: ${successCount}/${results.length} workflows deployed`);

  if (successCount > 0) {
    console.log('\n🎯 Next Steps:');
    console.log('1. Access n8n interface to verify workflows');
    console.log('2. Test email functionality with sample data');
    console.log('3. Configure scheduling for automated execution');
    console.log('4. Monitor workflow execution and email delivery');
    
    console.log('\n📧 Email Configuration:');
    console.log('• Sender: onboarding@resend.dev (hardcoded)');
    console.log('• NewsAPI: Uses Clixen-NewsAPI credential');
    console.log('• Rate Limits: 1000 NewsAPI requests/day, Resend limits apply');
  }

  return results;
}

// Test workflow execution
async function testNewsEmailWorkflow() {
  console.log('\n🧪 Testing News Email Workflow...');
  
  // This would be called after deployment to test the workflow
  const testData = {
    category: 'technology',
    recipient_email: 'test@example.com'
  };
  
  console.log('Test data:', testData);
  console.log('Note: Execute manually in n8n interface for testing');
}

// Run the deployment
if (require.main === module) {
  deployNewsEmailWorkflows()
    .then(() => {
      console.log('\n🎉 All workflows processed!');
      return testNewsEmailWorkflow();
    })
    .catch(error => {
      console.error('❌ Deployment failed:', error.message);
      process.exit(1);
    });
}

module.exports = { 
  deployNewsEmailWorkflows, 
  deployWorkflow, 
  testWorkflow 
};