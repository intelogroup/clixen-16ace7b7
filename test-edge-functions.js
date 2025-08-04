#!/usr/bin/env node

/**
 * Test script for Edge Functions
 */

const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

async function testFunction(functionName, payload) {
  try {
    console.log(`🔍 Testing ${functionName}...`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${functionName}: Success`);
      console.log(`   Response: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
    } else {
      console.log(`❌ ${functionName}: Failed`);
      console.log(`   Error: ${JSON.stringify(data, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ ${functionName}: Error - ${error.message}`);
  }
}

async function runTests() {
  console.log('🧪 Testing Edge Functions...');
  
  // Test ai-chat-system
  await testFunction('ai-chat-system', {
    message: 'Hello, test message',
    user_id: '00000000-0000-0000-0000-000000000000'
  });

  // Test ai-chat-sessions
  await testFunction('ai-chat-sessions', {
    user_id: '00000000-0000-0000-0000-000000000000'
  });

  console.log('🏁 Testing complete!');
}

runTests().catch(console.error);
