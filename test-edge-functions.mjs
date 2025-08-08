#!/usr/bin/env node

import https from 'https';

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

console.log('🔌 TESTING EDGE FUNCTIONS DEPLOYMENT');
console.log('====================================');

const edgeFunctions = [
  'health-check',
  'ai-chat-simple', 
  'projects-api',
  'workflows-api'
];

async function testEdgeFunction(functionName, payload = {}) {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    const postData = JSON.stringify(payload);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log(`\n📡 Testing ${functionName}...`);
    console.log(`   URL: ${url}`);
    console.log(`   Payload: ${JSON.stringify(payload).substring(0, 50)}...`);

    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', chunk => {
        responseData += chunk;
      });

      res.on('end', () => {
        const result = {
          status: res.statusCode,
          headers: res.headers,
          data: responseData
        };

        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response size: ${responseData.length} bytes`);

        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(responseData);
            console.log(`   ✅ ${functionName}: Working`);
            console.log(`   Response keys: ${Object.keys(jsonData).join(', ')}`);
          } catch (e) {
            console.log(`   ✅ ${functionName}: Working (non-JSON response)`);
          }
          resolve(result);
        } else if (res.statusCode === 404) {
          console.log(`   ❌ ${functionName}: Not deployed (404)`);
          resolve(result);
        } else if (res.statusCode === 401) {
          console.log(`   ⚠️  ${functionName}: Authentication required (401)`);
          resolve(result);
        } else {
          console.log(`   ❌ ${functionName}: Error ${res.statusCode}`);
          console.log(`   Response: ${responseData.substring(0, 200)}...`);
          resolve(result);
        }
      });
    });

    req.on('error', error => {
      console.log(`   ❌ ${functionName}: Network error - ${error.message}`);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.log(`   ⏱️  ${functionName}: Timeout (10s)`);
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

async function testAllEdgeFunctions() {
  const results = {};
  
  for (const functionName of edgeFunctions) {
    try {
      let payload = {};
      
      // Customize payload for each function
      switch (functionName) {
        case 'ai-chat-simple':
          payload = {
            message: 'Hello, this is a test',
            user_id: 'test-user-id',
            mode: 'workflow_creation'
          };
          break;
        case 'projects-api':
          payload = { action: 'list' };
          break;
        case 'workflows-api':
          payload = { action: 'list' };
          break;
        case 'health-check':
        default:
          payload = { test: true };
          break;
      }
      
      const result = await testEdgeFunction(functionName, payload);
      results[functionName] = {
        success: result.status === 200 || result.status === 401,
        status: result.status,
        deployed: result.status !== 404
      };
    } catch (error) {
      results[functionName] = {
        success: false,
        status: 'ERROR',
        deployed: false,
        error: error.message
      };
    }
  }
  
  return results;
}

async function testCorsOptions() {
  console.log('\n🔄 Testing CORS Configuration...');
  
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/functions/v1/ai-chat-simple`;
    
    const options = {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization, content-type',
        'Origin': 'http://localhost:8081'
      }
    };

    const req = https.request(url, options, (res) => {
      console.log(`   CORS Status: ${res.statusCode}`);
      console.log(`   Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin']}`);
      console.log(`   Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods']}`);
      console.log(`   Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers']}`);
      
      if (res.statusCode === 200) {
        console.log('   ✅ CORS: Properly configured');
        resolve(true);
      } else {
        console.log('   ⚠️  CORS: May have issues');
        resolve(false);
      }
    });

    req.on('error', error => {
      console.log(`   ❌ CORS: Test failed - ${error.message}`);
      reject(error);
    });

    req.end();
  });
}

async function runEdgeFunctionTests() {
  console.log('Starting Edge Function deployment tests...\n');
  
  // Test CORS first
  let corsWorking = false;
  try {
    corsWorking = await testCorsOptions();
  } catch (error) {
    console.log('CORS test failed:', error.message);
  }
  
  // Test each function
  const results = await testAllEdgeFunctions();
  
  // Summary
  console.log('\n📊 EDGE FUNCTIONS TEST SUMMARY');
  console.log('==============================');
  
  const deployed = Object.values(results).filter(r => r.deployed).length;
  const working = Object.values(results).filter(r => r.success).length;
  
  console.log(`Deployed: ${deployed}/${edgeFunctions.length}`);
  console.log(`Working: ${working}/${edgeFunctions.length}`);
  console.log(`CORS: ${corsWorking ? 'Working' : 'Issues detected'}`);
  
  console.log('\nDetailed Results:');
  edgeFunctions.forEach(func => {
    const result = results[func];
    const icon = result.success ? '✅' : result.deployed ? '⚠️' : '❌';
    const status = result.error ? `ERROR (${result.error})` : `HTTP ${result.status}`;
    console.log(`  ${icon} ${func}: ${status}`);
  });
  
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (deployed === 0) {
    console.log('🚨 CRITICAL: No Edge Functions are deployed!');
    console.log('   Run: cd backend && supabase functions deploy --project-ref zfbgdixbzezpxllkoyfc');
  } else if (deployed < edgeFunctions.length) {
    console.log('⚠️  Some Edge Functions are missing:');
    edgeFunctions.forEach(func => {
      if (!results[func]?.deployed) {
        console.log(`   Deploy ${func}: supabase functions deploy ${func} --project-ref zfbgdixbzezpxllkoyfc`);
      }
    });
  }
  
  if (working < deployed) {
    console.log('🔧 Some deployed functions have issues:');
    edgeFunctions.forEach(func => {
      const result = results[func];
      if (result.deployed && !result.success) {
        if (result.status === 401) {
          console.log(`   ${func}: Authentication/API key issues`);
        } else {
          console.log(`   ${func}: Check function logs for errors`);
        }
      }
    });
  }
  
  if (!corsWorking) {
    console.log('🌐 CORS configuration may need attention for frontend integration');
  }
  
  if (working === edgeFunctions.length && corsWorking) {
    console.log('🎉 All Edge Functions are working perfectly!');
    console.log('   The AI chat should be fully functional');
  }
  
  console.log('\n🏁 Edge Function test completed');
}

// Execute the test
runEdgeFunctionTests().catch(error => {
  console.error('\n💥 Test execution failed:', error);
  process.exit(1);
});
