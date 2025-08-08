#!/usr/bin/env node

/**
 * Test the deployed ai-chat-simple Edge Function
 */

const https = require('https');

const EDGE_FUNCTION_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/ai-chat-simple';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

async function testEdgeFunction() {
  console.log('🧪 Testing deployed ai-chat-simple Edge Function...');
  console.log('📡 URL:', EDGE_FUNCTION_URL);
  
  const testPayload = {
    message: "Hello, I want to test the AI chat",
    user_id: "test-user-id",
    mode: "workflow_creation"
  };

  const data = JSON.stringify(testPayload);

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(EDGE_FUNCTION_URL, options, (res) => {
      console.log('📊 Status Code:', res.statusCode);
      console.log('📋 Headers:', res.headers);

      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const jsonResponse = JSON.parse(responseData);
            console.log('✅ Success! Response:', {
              hasResponse: !!jsonResponse.response,
              responseLength: jsonResponse.response?.length || 0,
              phase: jsonResponse.phase,
              needsMoreInfo: jsonResponse.needs_more_info,
              workflowGenerated: jsonResponse.workflow_generated
            });
            resolve(jsonResponse);
          } else {
            console.log('❌ Error Response:', responseData);
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        } catch (error) {
          console.error('📱 Parse Error:', error);
          console.log('📄 Raw Response:', responseData);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('🌐 Request Error:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function testCorsOptions() {
  console.log('\n🔄 Testing CORS OPTIONS request...');
  
  const options = {
    method: 'OPTIONS',
    headers: {
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, content-type',
      'Origin': 'http://localhost:5173'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(EDGE_FUNCTION_URL, options, (res) => {
      console.log('📊 CORS Status:', res.statusCode);
      console.log('🔗 CORS Headers:', {
        'access-control-allow-origin': res.headers['access-control-allow-origin'],
        'access-control-allow-methods': res.headers['access-control-allow-methods'],
        'access-control-allow-headers': res.headers['access-control-allow-headers']
      });
      
      if (res.statusCode === 200) {
        console.log('✅ CORS preflight successful');
        resolve(true);
      } else {
        console.log('❌ CORS preflight failed');
        reject(new Error(`CORS failed: ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    await testCorsOptions();
    await testEdgeFunction();
    console.log('\n🎉 All tests passed! Edge Function is working correctly.');
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  }
}

main();
