#!/usr/bin/env node

/**
 * Set NewsAPI Credential in n8n Instance
 * Configures the NewsAPI key: b6b1af1b97dc4577998ef26e45cf3cc2
 */

const https = require('https');

// n8n Configuration
const N8N_BASE_URL = 'https://n8nio-n8n-7xzf6n.sliplane.app';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0';

// NewsAPI Configuration
const NEWSAPI_KEY = 'b6b1af1b97dc4577998ef26e45cf3cc2';

const newsApiCredential = {
  name: 'Clixen-NewsAPI',
  type: 'httpHeaderAuth',
  data: {
    name: 'X-API-Key',
    value: NEWSAPI_KEY
  }
};

/**
 * Test NewsAPI key
 */
async function testNewsApi() {
  return new Promise((resolve) => {
    const testUrl = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${NEWSAPI_KEY}`;
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
        try {
          const response = JSON.parse(data);
          resolve({
            success: res.statusCode === 200,
            status: res.statusCode,
            articles: response.articles ? response.articles.length : 0,
            message: response.message || 'OK'
          });
        } catch (error) {
          resolve({ success: false, error: 'Invalid JSON response' });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      resolve({ success: false, error: 'Request timeout' });
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
async function setupNewsApiCredential() {
  console.log('🔐 Setting up NewsAPI credential in n8n...');
  console.log(`📋 API Key: ${NEWSAPI_KEY}`);
  console.log(`🌐 n8n Instance: ${N8N_BASE_URL}\n`);

  console.log('🧪 Testing NewsAPI key...');
  
  const testResult = await testNewsApi();
  
  console.log('📊 NewsAPI Test Result:');
  console.log('═'.repeat(40));
  
  if (testResult.success) {
    console.log(`✅ NewsAPI: Valid (${testResult.articles} articles retrieved)`);
    console.log(`📰 Status: ${testResult.status} - ${testResult.message}`);
  } else {
    console.log(`❌ NewsAPI: Failed - ${testResult.error || testResult.message}`);
    console.log('⚠️  Proceeding with credential creation anyway...');
  }

  console.log(`\n🎯 Creating NewsAPI credential...`);
  console.log(`📝 Credential Name: ${newsApiCredential.name}`);
  console.log(`🔧 Type: HTTP Header Auth (X-API-Key)`);
  
  try {
    console.log('\n🚀 Creating credential in n8n...');
    const result = await createCredential(newsApiCredential);
    
    console.log('✅ NewsAPI credential created successfully!');
    console.log(`📍 Credential ID: ${result.id}`);
    console.log(`📋 Name: ${result.name}`);
    console.log(`🔧 Type: ${result.type}`);
    
    console.log('\n🎉 NewsAPI Setup Complete!');
    console.log('═'.repeat(50));
    console.log('Usage in workflows:');
    console.log('• Select "Clixen-NewsAPI" credential in HTTP Request nodes');
    console.log('• Use endpoints like: https://newsapi.org/v2/top-headlines');
    console.log('• Available categories: business, entertainment, health, science, sports, technology');
    console.log('• Rate limit: 1000 requests/day (Developer plan)');
    
  } catch (error) {
    console.log(`❌ Failed to create credential: ${error.message}`);
    
    console.log('\n📋 Manual Setup Instructions:');
    console.log('1. Go to: https://n8nio-n8n-7xzf6n.sliplane.app');
    console.log('2. Navigate to: Credentials → Add Credential');
    console.log('3. Type: HTTP Header Auth');
    console.log('4. Name: Clixen-NewsAPI');
    console.log('5. Header Name: X-API-Key');
    console.log(`6. Header Value: ${NEWSAPI_KEY}`);
  }
}

// Run the setup
if (require.main === module) {
  setupNewsApiCredential().catch(error => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  });
}

module.exports = { setupNewsApiCredential, testNewsApi, createCredential };