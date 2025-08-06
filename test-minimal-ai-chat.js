/**
 * Minimal AI Chat Test - Debug the edge function
 */

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const TEST_USER_ID = '050d649c-7cca-4335-9508-c394836783f9';

async function testMinimalChat() {
  console.log('🧪 Testing minimal AI chat functionality...\n');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-system`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw'
      },
      body: JSON.stringify({
        message: 'Hello! Can you create a simple workflow for me?',
        user_id: TEST_USER_ID
      })
    });

    const result = await response.json();
    
    console.log('📊 Response Status:', response.status, response.statusText);
    console.log('📄 Response Body:');
    console.log(JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Edge function is working!');
      
      // Check if it's an API key issue
      if (result.response && result.response.includes('OpenAI API key')) {
        console.log('🔑 Issue: OpenAI API key configuration');
        console.log('💡 Solution: Need to verify OpenAI API key in database or environment');
      }
      
      // Check if workflow was generated
      if (result.workflow_progress) {
        console.log('🤖 Multi-agent system:', result.workflow_progress);
      }
      
      return { success: true, result };
    } else {
      console.log('\n❌ Edge function error');
      return { success: false, error: result };
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testOpenAIDirectly() {
  console.log('\n🔑 Testing OpenAI API key from database...\n');
  
  try {
    // Get the API key from database
    const response = await fetch(`${SUPABASE_URL}/rest/v1/api_configurations?service_name=eq.openai&select=api_key`, {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0 && data[0].api_key) {
        console.log('✅ OpenAI API key found in database');
        console.log('🔑 Key format:', data[0].api_key.substring(0, 7) + '...' + data[0].api_key.slice(-4));
        
        // Test the key with OpenAI
        const testResponse = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${data[0].api_key}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (testResponse.ok) {
          console.log('✅ OpenAI API key is valid and working!');
          return { keyValid: true };
        } else {
          const errorData = await testResponse.json();
          console.log('❌ OpenAI API key is invalid or expired');
          console.log('📄 OpenAI Error:', errorData);
          return { keyValid: false, openaiError: errorData };
        }
      } else {
        console.log('❌ No OpenAI API key found in database');
        return { keyValid: false, error: 'No API key in database' };
      }
    } else {
      console.log('❌ Failed to fetch API key from database:', response.status);
      return { keyValid: false, error: 'Database fetch failed' };
    }
    
  } catch (error) {
    console.error('❌ API key test failed:', error.message);
    return { keyValid: false, error: error.message };
  }
}

async function runDiagnostics() {
  console.log('🔬 AI Chat System Diagnostics\n');
  console.log('=' .repeat(50));
  
  // Test 1: Minimal chat functionality
  const chatTest = await testMinimalChat();
  
  // Test 2: OpenAI API key validation
  const keyTest = await testOpenAIDirectly();
  
  console.log('\n📊 DIAGNOSTIC SUMMARY');
  console.log('=' .repeat(30));
  console.log(`Edge Function: ${chatTest.success ? '✅ Working' : '❌ Failed'}`);
  console.log(`OpenAI API Key: ${keyTest.keyValid ? '✅ Valid' : '❌ Invalid/Missing'}`);
  
  if (chatTest.success && keyTest.keyValid) {
    console.log('\n🎉 All systems operational! Ready for user journey testing.');
    process.exit(0);
  } else {
    console.log('\n⚠️  System has issues that need to be resolved:');
    
    if (!chatTest.success) {
      console.log('   - Edge function needs debugging');
    }
    
    if (!keyTest.keyValid) {
      console.log('   - OpenAI API key needs to be updated/fixed');
    }
    
    process.exit(1);
  }
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('❌ Diagnostic failure:', error);
  process.exit(1);
});