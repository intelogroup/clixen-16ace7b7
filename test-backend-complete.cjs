#!/usr/bin/env node

/**
 * Complete Backend Testing Script
 * Tests all backend functions and services
 */

const https = require('https');
const http = require('http');

// Configuration
const NETLIFY_SITE = 'https://clixen.netlify.app';
const LOCAL_SITE = 'http://localhost:8888';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        }
      });
    }).on('error', reject);
  });
}

async function testEndpoint(name, url) {
  console.log(`\n${colors.cyan}Testing ${name}...${colors.reset}`);
  
  try {
    const response = await fetchUrl(url);
    
    if (response.statusCode === 200) {
      console.log(`${colors.green}✅ ${name} - SUCCESS${colors.reset}`);
      
      // Display relevant information based on endpoint
      if (response.data) {
        if (response.data.environmentVariables) {
          // Environment test
          const env = response.data.environmentVariables;
          console.log('\nEnvironment Variables:');
          console.log(`  Frontend (VITE_):    ${countSet(env, 'VITE_')} configured`);
          console.log(`  Backend (non-VITE_): ${countSet(env, '', 'VITE_')} configured`);
          console.log(`  OpenAI API:          ${env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY}`);
        } else if (response.data.checks) {
          // Health check
          console.log('\nHealth Check Results:');
          response.data.checks.forEach(check => {
            const icon = check.status === 'healthy' ? '✅' : check.status === 'degraded' ? '⚠️' : '❌';
            console.log(`  ${icon} ${check.service}: ${check.message}`);
          });
        } else if (response.data.tests) {
          // Backend test
          console.log('\nTest Results:');
          response.data.tests.forEach(test => {
            const icon = test.passed ? '✅' : '❌';
            console.log(`  ${icon} ${test.name}: ${test.message}`);
            if (test.duration) {
              console.log(`     Duration: ${test.duration}ms`);
            }
          });
          
          if (response.data.recommendations) {
            console.log('\n📋 Recommendations:');
            response.data.recommendations.forEach(rec => {
              console.log(`  • ${rec}`);
            });
          }
        } else if (response.data.environment) {
          // API proxy health
          console.log('\nAPI Proxy Status:');
          Object.entries(response.data.environment).forEach(([key, value]) => {
            const icon = value ? '✅' : '❌';
            console.log(`  ${icon} ${key}: ${value}`);
          });
        }
        
        if (response.data.summary) {
          console.log(`\n📊 Summary: ${response.data.summary.status || response.data.status}`);
        }
      }
    } else {
      console.log(`${colors.red}❌ ${name} - FAILED (Status: ${response.statusCode})${colors.reset}`);
      if (response.data) {
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }
    }
  } catch (error) {
    console.log(`${colors.red}❌ ${name} - ERROR: ${error.message}${colors.reset}`);
  }
}

function countSet(env, prefix, excludePrefix = null) {
  return Object.entries(env)
    .filter(([key, value]) => {
      const matchesPrefix = prefix ? key.startsWith(prefix) : true;
      const notExcluded = excludePrefix ? !key.startsWith(excludePrefix) : true;
      return matchesPrefix && notExcluded && value !== 'NOT_SET';
    })
    .length;
}

async function runTests(baseUrl) {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}🧪 BACKEND TESTING SUITE - ${baseUrl}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);

  // Test all endpoints
  await testEndpoint('Environment Variables', `${baseUrl}/.netlify/functions/env-test`);
  await testEndpoint('Backend Health Check', `${baseUrl}/.netlify/functions/backend-health`);
  await testEndpoint('Backend Comprehensive Test', `${baseUrl}/.netlify/functions/backend-test`);
  await testEndpoint('API Proxy Health', `${baseUrl}/.netlify/functions/api-proxy?endpoint=health`);
  await testEndpoint('API Proxy Environment', `${baseUrl}/.netlify/functions/api-proxy?endpoint=env-check`);
  
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}✨ Testing Complete!${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const isLocal = args.includes('--local');
  
  if (isLocal) {
    console.log(`${colors.yellow}Testing LOCAL environment...${colors.reset}`);
    await runTests(LOCAL_SITE);
  } else {
    console.log(`${colors.yellow}Testing PRODUCTION environment...${colors.reset}`);
    await runTests(NETLIFY_SITE);
  }
  
  console.log(`\n${colors.cyan}💡 Tips:${colors.reset}`);
  console.log('  • Use --local flag to test local development server');
  console.log('  • Check Netlify dashboard to set missing environment variables');
  console.log('  • Backend functions use VITE_ variables as fallback if non-prefixed are missing');
  console.log('  • Visit https://clixen.netlify.app/api/backend-test for detailed diagnostics\n');
}

// Run tests
main().catch(console.error);