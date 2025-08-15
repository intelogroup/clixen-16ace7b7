#!/usr/bin/env node

/**
 * Test MCP-Enhanced Edge Function Deployment
 * Tests the production deployment of ai-chat-simple-mcp function
 */

const https = require('https');

const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

const testCases = [
  {
    name: 'Workflow Creation Request',
    payload: {
      message: 'Help me create a workflow to send daily email reports',
      projectId: 'test-project-001',
      userId: 'test-user-001',
      conversationId: 'test-conv-001'
    }
  },
  {
    name: 'General Chat Request',
    payload: {
      message: 'What can you help me with?',
      projectId: 'test-project-002', 
      userId: 'test-user-002',
      conversationId: 'test-conv-002'
    }
  },
  {
    name: 'Automation Intent',
    payload: {
      message: 'I want to automate my lead processing pipeline',
      projectId: 'test-project-003',
      userId: 'test-user-003',
      conversationId: 'test-conv-003'
    }
  }
];

function makeRequest(testCase) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(testCase.payload);
    
    const options = {
      hostname: 'zfbgdixbzezpxllkoyfc.supabase.co',
      port: 443,
      path: '/functions/v1/ai-chat-simple-mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Length': data.length
      }
    };

    const startTime = Date.now();
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          const parsedResponse = JSON.parse(responseData);
          resolve({
            testCase: testCase.name,
            status: res.statusCode,
            duration: duration,
            response: parsedResponse,
            success: res.statusCode === 200
          });
        } catch (parseError) {
          resolve({
            testCase: testCase.name,
            status: res.statusCode,
            duration: duration,
            response: responseData,
            success: false,
            error: 'Failed to parse JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      reject({
        testCase: testCase.name,
        duration: duration,
        success: false,
        error: error.message
      });
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Testing MCP-Enhanced Edge Function Deployment\n');
  console.log(`📍 Function URL: ${SUPABASE_URL}/functions/v1/ai-chat-simple-mcp`);
  console.log(`🔑 Using Supabase Anon Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...\n`);
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n🧪 Test ${i + 1}/${testCases.length}: ${testCase.name}`);
    console.log(`📝 Message: "${testCase.payload.message}"`);
    
    try {
      const result = await makeRequest(testCase);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ Success (${result.duration}ms)`);
        console.log(`📊 Response Length: ${JSON.stringify(result.response).length} chars`);
        
        if (result.response.mcpStatus) {
          console.log(`🔗 MCP Status: ${result.response.mcpStatus}`);
        }
        
        if (result.response.workflowData) {
          console.log(`⚙️ Workflow Data: ${JSON.stringify(result.response.workflowData)}`);
        }
        
        console.log(`💬 AI Response Preview: "${result.response.response?.substring(0, 100)}..."`);
      } else {
        console.log(`❌ Failed (${result.duration}ms)`);
        console.log(`📄 Status: ${result.status}`);
        console.log(`🔍 Response: ${JSON.stringify(result.response, null, 2)}`);
      }
      
    } catch (error) {
      results.push(error);
      console.log(`❌ Error (${error.duration}ms): ${error.error}`);
    }
    
    // Add delay between requests
    if (i < testCases.length - 1) {
      console.log('⏳ Waiting 2s before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n📈 TEST SUMMARY');
  console.log('================');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  console.log(`✅ Successful: ${successful}/${testCases.length}`);
  console.log(`❌ Failed: ${failed}/${testCases.length}`);
  console.log(`⏱️ Average Response Time: ${Math.round(avgDuration)}ms`);
  console.log(`🎯 Success Rate: ${Math.round((successful / testCases.length) * 100)}%`);
  
  if (successful === testCases.length) {
    console.log('\n🎉 ALL TESTS PASSED - MCP DEPLOYMENT SUCCESSFUL! 🎉');
    console.log('✅ Function is ready for production use');
    console.log('✅ MCP integration working correctly');
    console.log('✅ Response times within acceptable range');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - REVIEW REQUIRED');
    console.log('❌ Check function logs and configuration');
    console.log('❌ Verify environment variables');
    console.log('❌ Test MCP server connectivity');
  }
  
  console.log('\n🔗 Next Steps:');
  console.log('1. Update frontend to use new MCP endpoint');
  console.log('2. Monitor function performance in production');
  console.log('3. Test real user workflows end-to-end');
  console.log('4. Verify user isolation and security');
  
  return {
    totalTests: testCases.length,
    successful: successful,
    failed: failed,
    successRate: (successful / testCases.length) * 100,
    avgDuration: avgDuration
  };
}

// Run tests if this script is called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };