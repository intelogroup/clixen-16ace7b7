#!/usr/bin/env node

/**
 * Set API Credential in n8n Instance
 * Configures the provided API key in the n8n credential system
 */

const https = require('https');

// n8n Configuration
const N8N_BASE_URL = 'https://n8nio-n8n-7xzf6n.sliplane.app';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0';

// New API Key to set
const NEW_API_KEY = 'b6b1af1b97dc4577998ef26e45cf3cc2';

// Possible credential configurations based on key format
const possibleCredentials = [
  {
    name: 'Clixen-OpenWeatherMap-API',
    type: 'httpQueryAuth',
    data: {
      key: 'appid',
      value: NEW_API_KEY
    },
    description: 'OpenWeatherMap API for weather data and notifications',
    testUrl: 'https://api.openweathermap.org/data/2.5/weather?q=London&appid=' + NEW_API_KEY
  },
  {
    name: 'Clixen-NewsAPI',
    type: 'httpHeaderAuth',
    data: {
      name: 'X-API-Key',
      value: NEW_API_KEY
    },
    description: 'NewsAPI for news aggregation and content feeds',
    testUrl: 'https://newsapi.org/v2/top-headlines?country=us&apiKey=' + NEW_API_KEY
  }
];

/**
 * Test API key against different services
 */
async function testApiKey(testUrl, serviceName) {
  return new Promise((resolve) => {
    const url = new URL(testUrl);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          service: serviceName,
          status: res.statusCode,
          success: res.statusCode === 200,
          response: data.substring(0, 200)
        });
      });
    });

    req.on('error', () => {
      resolve({ service: serviceName, success: false, error: 'Connection error' });
    });

    req.on('timeout', () => {
      resolve({ service: serviceName, success: false, error: 'Timeout' });
    });

    req.end();
  });
}

/**
 * Create credential in n8n
 */
async function createCredential(credential) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      name: credential.name,
      type: credential.type,
      data: credential.data
    });
    
    const options = {
      hostname: 'n8nio-n8n-7xzf6n.sliplane.app',
      port: 443,
      path: '/api/v1/credentials',
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
 * Main setup function
 */
async function setupApiCredential() {
  console.log('🔐 Setting up API credential in n8n...');
  console.log(`📋 API Key: ${NEW_API_KEY}`);
  console.log(`🌐 n8n Instance: ${N8N_BASE_URL}\n`);

  console.log('🧪 Testing API key against different services...');
  
  // Test the API key against different services
  const testResults = await Promise.all(
    possibleCredentials.map(cred => 
      testApiKey(cred.testUrl, cred.name.replace('Clixen-', '').replace('-API', ''))
    )
  );

  // Display test results
  console.log('\n📊 API Key Test Results:');
  console.log('═'.repeat(50));
  
  let validService = null;
  testResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.service}: ${result.success ? 'Valid' : 'Failed'}`);
    if (result.success && !validService) {
      validService = result.service;
    }
  });

  if (!validService) {
    console.log('\n⚠️  Could not determine API service. Setting up as OpenWeatherMap (most likely)...');
    validService = 'OpenWeatherMap';
  }

  // Find the matching credential configuration
  const credentialToCreate = possibleCredentials.find(cred => 
    cred.name.toLowerCase().includes(validService.toLowerCase())
  ) || possibleCredentials[0]; // Default to first one

  console.log(`\n🎯 Setting up credential for: ${validService}`);
  console.log(`📝 Credential Name: ${credentialToCreate.name}`);
  
  try {
    console.log('\n🚀 Creating credential in n8n...');
    const result = await createCredential(credentialToCreate);
    
    console.log('✅ Credential created successfully!');
    console.log(`📍 Credential ID: ${result.id}`);
    console.log(`📋 Name: ${result.name}`);
    console.log(`🔧 Type: ${result.type}`);
    
    console.log('\n🎉 Setup Complete!');
    console.log('═'.repeat(50));
    console.log('Next Steps:');
    console.log('1. Access n8n interface: https://n8nio-n8n-7xzf6n.sliplane.app');
    console.log('2. Navigate to Credentials section to verify');
    console.log('3. Test the credential in a workflow');
    console.log('4. Deploy workflows using this credential');
    
  } catch (error) {
    console.log(`❌ Failed to create credential: ${error.message}`);
    
    console.log('\n📋 Manual Setup Instructions:');
    console.log('1. Go to: https://n8nio-n8n-7xzf6n.sliplane.app');
    console.log('2. Navigate to: Credentials → Add Credential');
    console.log(`3. Type: ${credentialToCreate.type}`);
    console.log(`4. Name: ${credentialToCreate.name}`);
    
    if (credentialToCreate.type === 'httpQueryAuth') {
      console.log(`5. Key: ${credentialToCreate.data.key}`);
      console.log(`6. Value: ${credentialToCreate.data.value}`);
    } else {
      console.log(`5. Header Name: ${credentialToCreate.data.name}`);
      console.log(`6. Header Value: ${credentialToCreate.data.value}`);
    }
  }
}

// Run the setup
if (require.main === module) {
  setupApiCredential().catch(error => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  });
}

module.exports = { setupApiCredential, testApiKey, createCredential };