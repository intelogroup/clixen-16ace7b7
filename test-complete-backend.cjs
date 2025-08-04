#!/usr/bin/env node

/**
 * Complete Backend Testing Script with All Services
 * Tests all backend functions, storage, and APIs
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
  magenta: '\x1b[35m',
};

async function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, options, (res) => {
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
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testEndpoint(name, url) {
  console.log(`\n${colors.cyan}Testing ${name}...${colors.reset}`);
  
  try {
    const response = await fetchUrl(url);
    
    if (response.statusCode === 200 || response.statusCode === 207) {
      const status = response.statusCode === 200 ? 'SUCCESS' : 'PARTIAL';
      const icon = response.statusCode === 200 ? '✅' : '⚠️';
      console.log(`${colors.green}${icon} ${name} - ${status}${colors.reset}`);
      
      // Display relevant information based on endpoint
      if (response.data) {
        if (response.data.tests) {
          // Full backend test
          console.log('\n📊 Test Results:');
          response.data.tests.forEach(test => {
            const icon = test.passed ? '✅' : '❌';
            const color = test.passed ? colors.green : colors.red;
            console.log(`  ${color}${icon} ${test.name}: ${test.message}${colors.reset}`);
            if (test.duration) {
              console.log(`     Duration: ${test.duration}ms`);
            }
            if (test.details && name.includes('full')) {
              // Show detailed results for full test
              if (test.name === 'Complete Configuration Check') {
                console.log('     Configuration Status:');
                Object.entries(test.details).forEach(([category, values]) => {
                  const allGood = Object.values(values).every(v => v === true);
                  const catIcon = allGood ? '✅' : '⚠️';
                  console.log(`       ${catIcon} ${category}: ${JSON.stringify(values)}`);
                });
              }
            }
          });
          
          if (response.data.summary) {
            console.log(`\n📈 Summary:`);
            console.log(`  Total Tests: ${response.data.summary.total}`);
            console.log(`  Passed: ${colors.green}${response.data.summary.passed}${colors.reset}`);
            console.log(`  Failed: ${colors.red}${response.data.summary.failed}${colors.reset}`);
            console.log(`  Success Rate: ${response.data.summary.percentage}%`);
            console.log(`  Total Duration: ${response.data.summary.duration}ms`);
          }
          
          if (response.data.status) {
            console.log(`\n${colors.magenta}Status: ${response.data.status}${colors.reset}`);
          }
        } else if (response.data.environmentVariables) {
          // Environment test
          const env = response.data.environmentVariables;
          console.log('\nEnvironment Variables:');
          
          // Count configured variables
          const viteCount = Object.entries(env).filter(([k, v]) => k.startsWith('VITE_') && v !== 'NOT_SET').length;
          const backendCount = Object.entries(env).filter(([k, v]) => !k.startsWith('VITE_') && v !== 'NOT_SET').length;
          
          console.log(`  Frontend (VITE_): ${colors.cyan}${viteCount}${colors.reset} configured`);
          console.log(`  Backend (non-VITE_): ${colors.cyan}${backendCount}${colors.reset} configured`);
          
          // Check critical variables
          const critical = {
            'OpenAI (Frontend)': env.VITE_OPENAI_API_KEY,
            'OpenAI (Backend)': env.OPENAI_API_KEY,
            'Supabase Service Role': env.SUPABASE_SERVICE_ROLE_KEY,
            'n8n API': env.N8N_API_KEY || env.VITE_N8N_API_KEY,
          };
          
          console.log('\n  Critical Services:');
          Object.entries(critical).forEach(([name, value]) => {
            const icon = value && value !== 'NOT_SET' ? '✅' : '❌';
            const status = value && value !== 'NOT_SET' ? 'SET' : 'MISSING';
            const color = value && value !== 'NOT_SET' ? colors.green : colors.red;
            console.log(`    ${color}${icon} ${name}: ${status}${colors.reset}`);
          });
        } else if (response.data.checks) {
          // Health check
          console.log('\nHealth Check Results:');
          response.data.checks.forEach(check => {
            const icon = check.status === 'healthy' ? '✅' : check.status === 'degraded' ? '⚠️' : '❌';
            const color = check.status === 'healthy' ? colors.green : check.status === 'degraded' ? colors.yellow : colors.red;
            console.log(`  ${color}${icon} ${check.service}: ${check.message}${colors.reset}`);
          });
          
          if (response.data.summary) {
            console.log(`\n📊 Health Summary:`);
            console.log(`  Healthy: ${colors.green}${response.data.summary.healthy}${colors.reset}`);
            console.log(`  Degraded: ${colors.yellow}${response.data.summary.degraded}${colors.reset}`);
            console.log(`  Unhealthy: ${colors.red}${response.data.summary.unhealthy}${colors.reset}`);
          }
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

async function runTests(baseUrl) {
  console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.blue}🧪 COMPLETE BACKEND TESTING SUITE${colors.reset}`);
  console.log(`${colors.blue}📍 Target: ${baseUrl}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);

  // Test all endpoints
  console.log(`\n${colors.magenta}🔍 ENVIRONMENT CONFIGURATION${colors.reset}`);
  await testEndpoint('Environment Variables', `${baseUrl}/.netlify/functions/env-test`);
  
  console.log(`\n${colors.magenta}🏥 HEALTH MONITORING${colors.reset}`);
  await testEndpoint('Backend Health Check', `${baseUrl}/.netlify/functions/backend-health`);
  
  console.log(`\n${colors.magenta}🧪 COMPREHENSIVE TESTING${colors.reset}`);
  await testEndpoint('Backend Test Suite', `${baseUrl}/.netlify/functions/backend-test`);
  await testEndpoint('Complete Backend Test (with S3)', `${baseUrl}/.netlify/functions/backend-full-test`);
  
  console.log(`\n${colors.magenta}🔌 API ENDPOINTS${colors.reset}`);
  await testEndpoint('API Proxy Health', `${baseUrl}/.netlify/functions/api-proxy?endpoint=health`);
  await testEndpoint('API Proxy Environment', `${baseUrl}/.netlify/functions/api-proxy?endpoint=env-check`);
  await testEndpoint('n8n Integration', `${baseUrl}/.netlify/functions/api-proxy?endpoint=test-n8n`);
  await testEndpoint('Supabase Connection', `${baseUrl}/.netlify/functions/api-proxy?endpoint=test-supabase`);
  
  console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.green}✨ Testing Complete!${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const isLocal = args.includes('--local');
  
  if (isLocal) {
    console.log(`${colors.yellow}🏠 Testing LOCAL environment...${colors.reset}`);
    await runTests(LOCAL_SITE);
  } else {
    console.log(`${colors.yellow}☁️ Testing PRODUCTION environment on Netlify...${colors.reset}`);
    await runTests(NETLIFY_SITE);
  }
  
  console.log(`\n${colors.cyan}💡 Tips:${colors.reset}`);
  console.log('  • Use --local flag to test local development server');
  console.log('  • Run ./setup-complete-backend-env.sh to set all environment variables');
  console.log('  • Backend functions use VITE_ variables as fallback if non-prefixed are missing');
  console.log('  • Visit https://clixen.netlify.app/api/backend-full-test for detailed diagnostics');
  console.log('  • All S3 storage operations require SUPABASE_S3_* environment variables\n');
}

// Run tests
main().catch(console.error);