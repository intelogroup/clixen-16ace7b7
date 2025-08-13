#!/usr/bin/env node

/**
 * Deploy Dorchester Weather & Boston News Email Workflow
 * Comprehensive workflow with Weather + News + OpenAI + Resend integration
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// n8n Configuration
const N8N_BASE_URL = 'https://n8nio-n8n-7xzf6n.sliplane.app';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0';

// Workflow file
const WORKFLOW_FILE = 'dorchester-weather-boston-news-email.json';

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
async function deployDorchesterWeatherNews() {
  console.log('🚀 Deploying Dorchester Weather & Boston News Email Workflow...');
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
    console.log(`📍 Features:`);
    console.log(`   🌤️  Weather: Dorchester, MA via OpenWeatherMap`);
    console.log(`   📰 News: Latest Boston news via NewsAPI`);
    console.log(`   🤖 AI: OpenAI GPT-4 formatting`);
    console.log(`   📧 Email: Resend API to jimkalinov@gmail.com`);
    
    const result = await deployWorkflow(workflowData);
    
    console.log(`\n✅ Workflow deployed successfully!`);
    console.log(`📍 Workflow ID: ${result.id}`);
    console.log(`🔗 URL: ${N8N_BASE_URL}/workflow/${result.id}`);
    
    console.log('\n🎯 Workflow Architecture:');
    console.log('1. Start → Get Dorchester Weather (OpenWeatherMap)');
    console.log('2. Start → Get Boston News (NewsAPI)'); 
    console.log('3. Both → Combine Data (Function Node)');
    console.log('4. Combined → OpenAI Format Email (GPT-4)');
    console.log('5. Formatted → Send Email (Resend API)');
    
    console.log('\n⚠️  Required Configuration:');
    console.log('1. Replace "YOUR_OPENAI_API_KEY_HERE" with actual OpenAI key');
    console.log('2. Verify all API credentials are active');
    console.log('3. Test workflow execution manually');
    
    console.log('\n🔧 API Integration Status:');
    console.log('✅ OpenWeatherMap: Configured for Dorchester, MA');
    console.log('✅ NewsAPI: Configured for Boston news search');
    console.log('⚠️  OpenAI: Requires API key replacement');
    console.log('✅ Resend: Hardcoded credentials integrated');
    
    console.log('\n📧 Email Details:');
    console.log('• Recipient: jimkalinov@gmail.com');
    console.log('• Sender: onboarding@resend.dev');
    console.log('• Subject: 🌤️ Dorchester Weather & Boston News - [Date]');
    console.log('• Format: Minimalist HTML designed by OpenAI');
    
    console.log('\n🎉 Ready for Testing!');
    console.log('Access the workflow in n8n and execute manually to test all integrations.');
    
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
    console.log('4. Test each node individually');
    
    return {
      status: 'failed',
      error: error.message
    };
  }
}

// Run the deployment
if (require.main === module) {
  deployDorchesterWeatherNews()
    .then((result) => {
      if (result.status === 'success') {
        console.log('\n🚀 Deployment Complete! 🎯');
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

module.exports = { deployDorchesterWeatherNews, deployWorkflow };