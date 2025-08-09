#!/usr/bin/env node

/**
 * Test OpenAI API Key accessibility and validity
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

// Test user credentials
const TEST_USER = {
  email: 'jayveedz19@gmail.com', 
  password: 'Goldyear2023#'
};

async function authenticateUser() {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  
  if (error) {
    console.log('❌ Authentication failed:', error.message);
    return null;
  }
  
  console.log('✅ User authenticated successfully');
  return { 
    token: data.session.access_token,
    userId: data.user.id
  };
}

async function testEdgeFunctionWithDebug(token, userId) {
  console.log('🧪 Testing Edge Function with OpenAI key debug...');
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-simple`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'test openai key availability',
      user_id: userId,
      session_id: 'debug-test'
    })
  });

  const result = await response.json();
  console.log('Response:', result.response);
  
  // Check if it's the "missing API key" message vs actual OpenAI response
  const isMissingKey = result.response?.includes('OpenAI API Key Required') || 
                      result.response?.includes('Invalid OpenAI API key');
                      
  return { isMissingKey, fullResponse: result };
}

async function checkDatabaseTables() {
  console.log('📊 Checking database for OpenAI key storage tables...');
  
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  // Check for api_keys table
  const { data: apiKeysData, error: apiKeysError } = await supabase
    .from('api_keys')
    .select('*')
    .limit(1);
    
  // Check for api_configurations table  
  const { data: apiConfigData, error: apiConfigError } = await supabase
    .from('api_configurations')
    .select('*')
    .limit(1);

  console.log('api_keys table:', apiKeysError ? 'NOT FOUND' : 'EXISTS');
  console.log('api_configurations table:', apiConfigError ? 'NOT FOUND' : 'EXISTS');
  
  if (!apiKeysError && apiKeysData) {
    console.log('api_keys records:', apiKeysData.length);
  }
  
  if (!apiConfigError && apiConfigData) {
    console.log('api_configurations records:', apiConfigData.length);
  }
}

async function testActualOpenAIKey() {
  console.log('🔑 Testing if OpenAI key is valid (if available)...');
  
  // This would be the OpenAI key if it exists in your environment
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiKey) {
    console.log('❌ No OpenAI key found in local environment');
    return false;
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ OpenAI API key is valid');
      return true;
    } else {
      console.log('❌ OpenAI API key is invalid:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ OpenAI API test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 OpenAI API Key Availability Analysis\n');
  
  // 1. Check database tables
  await checkDatabaseTables();
  console.log();
  
  // 2. Test local OpenAI key if available
  await testActualOpenAIKey();
  console.log();
  
  // 3. Test Edge Function response
  const auth = await authenticateUser();
  if (auth) {
    await testEdgeFunctionWithDebug(auth.token, auth.userId);
  }
  
  console.log('\n📋 Analysis Summary:');
  console.log('- Database tables for API key storage: Check above');
  console.log('- Edge Function response: Check above');  
  console.log('- Local OpenAI key validity: Check above');
}

main().catch(console.error);