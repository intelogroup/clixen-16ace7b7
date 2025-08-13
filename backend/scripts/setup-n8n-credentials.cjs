#!/usr/bin/env node

/**
 * Clixen n8n Credential Setup Script
 * Automated creation of API credentials for n8n workflows
 * 
 * Security: Uses placeholder values - replace with real keys in production
 */

const https = require('https');

// n8n API Configuration
const N8N_BASE_URL = 'https://n8nio-n8n-7xzf6n.sliplane.app/api/v1';
const N8N_API_KEY = 'YOUR_N8N_API_KEY_HERE'; // Replace with actual key

// Credential Templates with Placeholders
const credentials = [
  {
    name: 'Clixen-OpenAI-API',
    type: 'httpHeaderAuth',
    data: {
      name: 'Authorization',
      value: 'Bearer YOUR_OPENAI_API_KEY_HERE'
    },
    description: 'OpenAI API for GPT-4 processing and AI workflows'
  },
  {
    name: 'Clixen-Firecrawl-API',
    type: 'httpHeaderAuth',
    data: {
      name: 'Authorization',
      value: 'Bearer YOUR_FIRECRAWL_API_KEY_HERE'
    },
    description: 'Firecrawl API for web scraping and content extraction'
  },
  {
    name: 'Clixen-Resend-API',
    type: 'httpHeaderAuth',
    data: {
      name: 'Authorization',
      value: 'Bearer YOUR_RESEND_API_KEY_HERE'
    },
    description: 'Resend API for reliable email delivery'
  },
  {
    name: 'Clixen-OpenWeatherMap-API',
    type: 'httpQueryAuth',
    data: {
      key: 'appid',
      value: 'YOUR_OPENWEATHERMAP_API_KEY_HERE'
    },
    description: 'OpenWeatherMap API for weather data'
  },
  {
    name: 'Clixen-NewsAPI',
    type: 'httpHeaderAuth',
    data: {
      name: 'X-API-Key',
      value: 'YOUR_NEWSAPI_KEY_HERE'
    },
    description: 'NewsAPI for news aggregation'
  }
];

/**
 * Create a credential in n8n
 */
async function createCredential(credential) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(credential);
    
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
async function setupCredentials() {
  console.log('🔐 Starting Clixen n8n Credential Setup...');
  console.log('⚠️  Security Notice: Using placeholder values - update with real keys in production\\n');

  const results = [];

  for (const credential of credentials) {
    try {
      console.log(`Creating credential: ${credential.name}`);
      const result = await createCredential(credential);
      results.push({ name: credential.name, status: 'success', id: result.id });
      console.log(`✅ ${credential.name} created successfully`);
    } catch (error) {
      results.push({ name: credential.name, status: 'failed', error: error.message });
      console.log(`❌ ${credential.name} failed: ${error.message}`);
    }
  }

  console.log('\\n📊 Setup Summary:');
  console.log('═'.repeat(50));
  
  results.forEach(result => {
    const status = result.status === 'success' ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\\n🎯 Next Steps:');
  console.log('1. Replace placeholder API keys with real values');
  console.log('2. Test each credential in n8n interface');
  console.log('3. Deploy workflows using configured credentials');
  
  const successCount = results.filter(r => r.status === 'success').length;
  console.log(`\\n📈 Success Rate: ${successCount}/${results.length} credentials created`);
}

// Check if running as main module
if (require.main === module) {
  setupCredentials().catch(error => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  });
}

module.exports = { setupCredentials, createCredential };