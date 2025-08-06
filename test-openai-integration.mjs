#!/usr/bin/env node

/**
 * Test OpenAI Integration in ai-chat-system Edge Function
 * Tests the multi-agent system with proper authentication
 */

console.log('🧪 Testing OpenAI Integration in Clixen Multi-Agent System...\n');

const testCases = [
  {
    name: 'Basic OpenAI Integration Test',
    payload: {
      message: 'Hello, can you help me create a simple workflow?',
      user_id: '9de1ece7-cafc-4c08-8ea6-30aacc962df7', // Real user ID from database
      agent_type: 'orchestrator'
    }
  },
  {
    name: 'Workflow Designer Agent Test',
    payload: {
      message: 'I need to create an n8n workflow that triggers when I receive an email',
      user_id: '9de1ece7-cafc-4c08-8ea6-30aacc962df7',
      agent_type: 'workflow_designer'
    }
  },
  {
    name: 'Multi-Agent Conversation Test',
    payload: {
      message: 'Create a workflow to automatically post to Slack when I get a GitHub issue',
      user_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab'
      // Let the system choose the appropriate agent
    }
  }
];

async function runTest(testCase) {
  console.log(`🔬 Running: ${testCase.name}`);
  console.log(`📝 Message: "${testCase.payload.message}"`);
  
  try {
    const response = await fetch('https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/ai-chat-system', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw'
      },
      body: JSON.stringify(testCase.payload)
    });
    
    const result = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`🤖 Agent: ${result.agent_type || 'N/A'}`);
    console.log(`⏱️  Processing Time: ${result.processing_time || 0}ms`);
    console.log(`🎯 Tokens Used: ${result.tokens_used || 0}`);
    
    if (response.ok) {
      console.log('✅ SUCCESS');
      console.log(`💬 Response: ${result.response?.substring(0, 200)}${result.response?.length > 200 ? '...' : ''}`);
      
      if (result.session_id) {
        console.log(`🆔 Session ID: ${result.session_id}`);
      }
      
      if (result.next_agent) {
        console.log(`➡️  Next Agent: ${result.next_agent}`);
      }
      
    } else {
      console.log('❌ FAILED');
      console.log(`Error: ${result.error || 'Unknown error'}`);
      console.log(`Response: ${result.response || 'No response'}`);
    }
    
    console.log('─'.repeat(80) + '\n');
    
    return {
      success: response.ok,
      agent_type: result.agent_type,
      tokens_used: result.tokens_used || 0,
      processing_time: result.processing_time || 0,
      has_openai_response: result.response && !result.response.includes('OpenAI API Key Required')
    };
    
  } catch (error) {
    console.log('❌ EXCEPTION:', error.message);
    console.log('─'.repeat(80) + '\n');
    
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  const results = [];
  
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push({ testCase: testCase.name, ...result });
    
    // Wait between tests to avoid rate limiting
    if (testCase !== testCases[testCases.length - 1]) {
      console.log('⏳ Waiting 2 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(80));
  
  const successCount = results.filter(r => r.success).length;
  const totalTests = results.length;
  const totalTokens = results.reduce((sum, r) => sum + (r.tokens_used || 0), 0);
  const avgProcessingTime = results.reduce((sum, r) => sum + (r.processing_time || 0), 0) / totalTests;
  const hasRealOpenAI = results.some(r => r.has_openai_response);
  
  console.log(`✅ Successful Tests: ${successCount}/${totalTests}`);
  console.log(`🎯 Total Tokens Used: ${totalTokens}`);
  console.log(`⏱️  Average Processing Time: ${Math.round(avgProcessingTime)}ms`);
  console.log(`🤖 Real OpenAI Integration: ${hasRealOpenAI ? '✅ YES' : '❌ NO'}`);
  
  console.log('\nDetailed Results:');
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.testCase}: ${result.success ? '✅' : '❌'} ${result.agent_type || 'N/A'}`);
  });
  
  if (successCount === totalTests && hasRealOpenAI) {
    console.log('\n🎉 ALL TESTS PASSED! OpenAI integration is working perfectly!');
  } else if (successCount === totalTests) {
    console.log('\n⚠️  Tests passed but no real OpenAI responses detected.');
    console.log('💡 Make sure to configure a real OpenAI API key in the database.');
  } else {
    console.log('\n❌ Some tests failed. Check the detailed logs above.');
  }
}

main().catch(console.error);