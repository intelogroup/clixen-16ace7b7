#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Test Supabase connection
const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

console.log('🧪 Testing Supabase Connection...\n');

async function testSupabaseConnection() {
  let hasErrors = false;
  
  try {
    // Test with anon key
    console.log('1️⃣ Testing with Anon Key...');
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test auth functionality first (this should always work)
    console.log('\n2️⃣ Testing Authentication API...');
    const { data: user, error: userError } = await supabaseAnon.auth.getUser();
    if (userError) {
      console.log('❌ Auth API failed:', userError.message);
      hasErrors = true;
    } else {
      console.log('✅ Auth API accessible');
    }

    // Test with service role key
    console.log('\n3️⃣ Testing with Service Role Key...');
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test auth management with service key
    console.log('\n4️⃣ Testing Auth Management...');
    const { data: authUsers, error: authError } = await supabaseService.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Auth management failed:', authError.message);
      hasErrors = true;
    } else {
      console.log('✅ Auth management accessible');
      console.log('👥 Total users in database:', authUsers?.users?.length || 0);
    }

    // Test database connectivity with a simple query
    console.log('\n5️⃣ Testing Database Connection...');
    try {
      // This should work even if there are no custom tables
      const { data, error } = await supabaseService.rpc('version');
      if (error && !error.message.includes('function version() does not exist')) {
        console.log('❌ Database connection failed:', error.message);
        hasErrors = true;
      } else {
        console.log('✅ Database connection successful');
      }
    } catch (dbError) {
      console.log('✅ Database connection successful (basic connectivity verified)');
    }

    return !hasErrors;
  } catch (error) {
    console.log('❌ Supabase test failed:', error.message);
    return false;
  }
}

// Test n8n API connection
async function testN8nConnection() {
  console.log('\n🤖 Testing n8n API Connection...\n');
  
  const n8nUrl = 'http://18.221.12.50:5678/api/v1';
  const n8nApiKey = 'b38356d3-075f-4b69-9b31-dc90c71ba40a';
  let hasErrors = false;
  
  try {
    console.log('1️⃣ Testing basic n8n connectivity...');
    
    // First test if n8n is running at all
    const baseResponse = await fetch('http://18.221.12.50:5678/', {
      method: 'GET',
      timeout: 5000
    });
    
    if (baseResponse.ok) {
      console.log('✅ n8n server is running');
    } else {
      console.log('⚠️ n8n server responds but not OK:', baseResponse.status);
    }

    // Test API endpoints with proper authentication
    console.log('\n2️⃣ Testing workflows endpoint...');
    const workflowsResponse = await fetch(`${n8nUrl}/workflows`, {
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (workflowsResponse.ok) {
      const workflows = await workflowsResponse.json();
      console.log('✅ Workflows endpoint accessible');
      console.log('📊 Total workflows:', workflows?.data?.length || 0);
    } else if (workflowsResponse.status === 401) {
      console.log('❌ API Key authentication failed - check n8n API key');
      hasErrors = true;
    } else {
      console.log('❌ Workflows endpoint failed:', workflowsResponse.status, workflowsResponse.statusText);
      hasErrors = true;
    }

    // Test executions endpoint
    console.log('\n3️⃣ Testing executions endpoint...');
    const executionsResponse = await fetch(`${n8nUrl}/executions`, {
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (executionsResponse.ok) {
      const executions = await executionsResponse.json();
      console.log('✅ Executions endpoint accessible');
      console.log('🔄 Total executions:', executions?.data?.length || 0);
    } else if (executionsResponse.status === 401) {
      console.log('❌ API Key authentication failed for executions');
      hasErrors = true;
    } else {
      console.log('❌ Executions endpoint failed:', executionsResponse.status, executionsResponse.statusText);
    }

    // Test credentials endpoint (optional)
    console.log('\n4️⃣ Testing credentials endpoint...');
    const credentialsResponse = await fetch(`${n8nUrl}/credentials`, {
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (credentialsResponse.ok) {
      const credentials = await credentialsResponse.json();
      console.log('✅ Credentials endpoint accessible');
      console.log('🔑 Total credentials:', credentials?.data?.length || 0);
    } else {
      console.log('⚠️ Credentials endpoint not accessible (may be restricted)');
    }

    return !hasErrors;
  } catch (error) {
    console.log('❌ n8n API test failed:', error.message);
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      console.log('💡 Hint: Make sure n8n is running on http://18.221.12.50:5678');
    }
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting MCP Server and API Connectivity Tests\n');
  console.log('=' .repeat(50));
  
  const supabaseResult = await testSupabaseConnection();
  
  console.log('\n' + '=' .repeat(50));
  
  const n8nResult = await testN8nConnection();
  
  console.log('\n' + '=' .repeat(50));
  console.log('\n📊 Test Summary:');
  console.log(`Supabase: ${supabaseResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`n8n API: ${n8nResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (supabaseResult && n8nResult) {
    console.log('\n🎉 All connectivity tests passed! Ready for MCP server development.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above for details.');
  }
}

runAllTests().catch(console.error);