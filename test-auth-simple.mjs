#!/usr/bin/env node
/**
 * Simple Authentication Test - Test auth without browser complexity
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuthentication() {
  console.log('🔍 Testing Authentication System...');
  
  try {
    // Test sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (error) {
      console.log(`❌ Authentication failed: ${error.message}`);
      return false;
    }

    if (data.user) {
      console.log(`✅ Authentication successful for user: ${data.user.email}`);
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Created: ${new Date(data.user.created_at).toLocaleString()}`);
      
      // Test session validity
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        console.log(`✅ Session is valid, expires: ${new Date(session.session.expires_at * 1000).toLocaleString()}`);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`❌ Authentication test failed: ${error.message}`);
    return false;
  }
}

async function testMultiAgentEdgeFunction() {
  console.log('🔍 Testing Multi-Agent Edge Function...');
  
  try {
    // Get session first
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.log('❌ No active session for edge function test');
      return false;
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-system`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionData.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Hello, can you help me create a simple workflow?'
      })
    });

    if (!response.ok) {
      console.log(`❌ Edge function returned status: ${response.status}`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log(`✅ Edge function responded: ${JSON.stringify(result).substring(0, 100)}...`);
    return true;

  } catch (error) {
    console.log(`❌ Edge function test failed: ${error.message}`);
    return false;
  }
}

async function testN8nIntegration() {
  console.log('🔍 Testing n8n Integration...');
  
  try {
    const response = await fetch('http://18.221.12.50:5678/healthz');
    if (response.ok) {
      console.log('✅ n8n API is healthy');
      return true;
    } else {
      console.log(`❌ n8n API returned status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ n8n connection failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Running Simple Authentication and API Tests');
  console.log('=' .repeat(50));
  
  const results = {
    auth: false,
    edgeFunction: false,
    n8n: false
  };
  
  // Run tests in sequence
  results.auth = await testAuthentication();
  
  if (results.auth) {
    results.edgeFunction = await testMultiAgentEdgeFunction();
  }
  
  results.n8n = await testN8nIntegration();
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results Summary');
  console.log('=' .repeat(50));
  console.log(`Authentication: ${results.auth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Multi-Agent System: ${results.edgeFunction ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`n8n Integration: ${results.n8n ? '✅ PASS' : '❌ FAIL'}`);
  
  const passCount = Object.values(results).filter(Boolean).length;
  console.log(`\nOverall: ${passCount}/3 tests passed`);
  
  return passCount === 3;
}

// Run the tests
runTests()
  .then(success => {
    console.log(`\n🏁 Tests ${success ? 'COMPLETED SUCCESSFULLY' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });