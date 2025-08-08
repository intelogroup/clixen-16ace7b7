#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

console.log('🔐 TESTING EDGE FUNCTION AUTHENTICATION');
console.log('========================================');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuthTokenFlow() {
  console.log('\n1. 🔑 Authenticating user...');
  
  // Step 1: Authenticate
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (authError) {
    throw new Error(`Authentication failed: ${authError.message}`);
  }

  console.log('✅ User authenticated');
  console.log(`   User ID: ${authData.user.id}`);
  console.log(`   Email: ${authData.user.email}`);

  // Step 2: Get session and check token
  console.log('\n2. 🎫 Checking session token...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(`Session error: ${sessionError.message}`);
  }

  console.log('✅ Session retrieved');
  console.log(`   Has access token: ${!!session?.access_token}`);
  console.log(`   Token length: ${session?.access_token?.length || 0}`);
  console.log(`   Token prefix: ${session?.access_token?.substring(0, 20) || 'none'}...`);
  console.log(`   Expires at: ${session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown'}`);

  // Step 3: Test Edge Function call with authentication
  console.log('\n3. 🚀 Testing Edge Function with authentication...');

  const testPayload = {
    message: 'Test authentication flow',
    user_id: authData.user.id,
    mode: 'workflow_creation'
  };

  console.log('📤 Calling ai-chat-simple Edge Function...');
  console.log(`   User ID: ${authData.user.id.substring(0, 8)}***`);
  console.log(`   Payload size: ${JSON.stringify(testPayload).length} bytes`);

  try {
    // The Supabase client should automatically include the session token
    const { data, error } = await supabase.functions.invoke('ai-chat-simple', {
      body: testPayload
    });

    if (error) {
      console.log('\n❌ Edge Function Error Details:');
      console.log(`   Status: ${error.status}`);
      console.log(`   Message: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${error.details}`);

      // Analyze the specific error
      if (error.status === 401) {
        console.log('\n🔍 DIAGNOSIS: Authentication Error (401)');
        console.log('   This confirms the issue is with authentication token passing');
        console.log('   Possible causes:');
        console.log('   - Token not being sent by Supabase client');
        console.log('   - Edge Function not receiving/validating token correctly');
        console.log('   - Token format mismatch');
        console.log('   - Session expired');
      } else if (error.status === 404) {
        console.log('\n🔍 DIAGNOSIS: Function Not Found (404)');
        console.log('   The ai-chat-simple Edge Function is not deployed');
      } else if (error.status === 403) {
        console.log('\n🔍 DIAGNOSIS: Forbidden (403)');
        console.log('   User ID mismatch or insufficient permissions');
      } else {
        console.log('\n🔍 DIAGNOSIS: Other Error');
        console.log('   Check Edge Function logs for detailed error information');
      }

      return false;
    }

    console.log('\n✅ Edge Function Success!');
    console.log(`   Has response: ${!!data?.response}`);
    console.log(`   Response length: ${data?.response?.length || 0}`);
    console.log(`   Phase: ${data?.phase}`);

    if (data?.response) {
      console.log('\n💬 Response preview:');
      console.log(data.response.substring(0, 150) + '...');
    }

    return true;

  } catch (error) {
    console.log('\n❌ Unexpected error:');
    console.log(`   ${error.message}`);
    return false;
  }
}

async function testTokenDirectly() {
  console.log('\n4. 🔬 Testing token validation directly...');
  
  // Get the session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    console.log('❌ No access token available');
    return false;
  }

  console.log('📋 Token details:');
  console.log(`   Type: JWT`);
  console.log(`   Length: ${session.access_token.length} characters`);
  
  // Try to decode the token (just the header to check format)
  try {
    const [header, payload, signature] = session.access_token.split('.');
    const decodedHeader = JSON.parse(atob(header));
    const decodedPayload = JSON.parse(atob(payload));
    
    console.log('✅ Token structure valid');
    console.log(`   Algorithm: ${decodedHeader.alg}`);
    console.log(`   Type: ${decodedHeader.typ}`);
    console.log(`   Subject: ${decodedPayload.sub?.substring(0, 8)}***`);
    console.log(`   Issuer: ${decodedPayload.iss}`);
    console.log(`   Audience: ${decodedPayload.aud}`);
    console.log(`   Expires: ${new Date(decodedPayload.exp * 1000).toISOString()}`);
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp < now) {
      console.log('❌ Token is expired!');
      return false;
    } else {
      console.log('✅ Token is valid and not expired');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Token format invalid:', error.message);
    return false;
  }
}

async function runAuthTokenTest() {
  try {
    const edgeFunctionWorking = await testAuthTokenFlow();
    const tokenValid = await testTokenDirectly();

    console.log('\n📊 AUTHENTICATION TEST SUMMARY');
    console.log('==============================');
    console.log(`Token Valid: ${tokenValid ? '✅ Yes' : '❌ No'}`);
    console.log(`Edge Function: ${edgeFunctionWorking ? '✅ Working' : '❌ Failed'}`);

    console.log('\n💡 CONCLUSIONS:');
    
    if (tokenValid && edgeFunctionWorking) {
      console.log('🎉 Authentication is working perfectly!');
      console.log('   • Token is valid and properly formatted');
      console.log('   • Edge Function receives and validates token correctly');
      console.log('   • No authentication issues blocking chat functionality');
    } else if (tokenValid && !edgeFunctionWorking) {
      console.log('🔧 TOKEN IS VALID BUT EDGE FUNCTION FAILS');
      console.log('   • This confirms your suspicion about auth token passing');
      console.log('   • The token itself is valid');
      console.log('   • Issue is likely in how Supabase client sends token to Edge Function');
      console.log('   • OR Edge Function is not deployed/configured correctly');
    } else if (!tokenValid) {
      console.log('❌ TOKEN ISSUES DETECTED');
      console.log('   • Authentication token is invalid or expired');
      console.log('   • Need to fix token generation/refresh first');
    } else {
      console.log('❓ MIXED RESULTS - NEED FURTHER INVESTIGATION');
    }

    console.log('\n🔧 RECOMMENDED FIXES:');
    
    if (!edgeFunctionWorking) {
      console.log('1. Deploy Edge Function: supabase functions deploy ai-chat-simple');
      console.log('2. Verify Edge Function authentication code is working');
      console.log('3. Check Supabase function logs for auth errors');
      console.log('4. Test with manual token passing to isolate the issue');
    }
    
    if (!tokenValid) {
      console.log('1. Check session refresh logic');
      console.log('2. Verify Supabase client configuration');
      console.log('3. Test re-authentication');
    }

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    console.log('\nThis suggests a fundamental authentication issue that needs to be resolved first.');
  }
}

// Execute the authentication test
runAuthTokenTest()
  .then(() => {
    console.log('\n🏁 Authentication token test completed');
  })
  .catch(error => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });
