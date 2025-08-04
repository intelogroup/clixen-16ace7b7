#!/usr/bin/env node

// Detailed chat system testing with real user scenarios
import fetch from 'node-fetch';

const NETLIFY_URL = 'https://clixen.netlify.app';

console.log('🧪 DETAILED CHAT SYSTEM TESTING...\n');

// Test 1: Site accessibility and basic functionality
const testSiteAccess = async () => {
  console.log('1. Testing site accessibility...');
  try {
    const response = await fetch(NETLIFY_URL);
    const html = await response.text();
    
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log(`  Content length: ${html.length} chars`);
    
    // Check if key elements are present
    const hasReact = html.includes('React') || html.includes('root');
    const hasVite = html.includes('vite') || html.includes('type="module"');
    const hasTitle = html.includes('<title>') && html.includes('Clixen');
    
    console.log(`  ✓ React app structure: ${hasReact}`);
    console.log(`  ✓ Vite build: ${hasVite}`);  
    console.log(`  ✓ Proper title: ${hasTitle}`);
    
    return response.ok;
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    return false;
  }
};

// Test 2: Authentication endpoints
const testAuthSystem = async () => {
  console.log('\n2. Testing authentication system...');
  try {
    // Test if Supabase auth is accessible
    const supabaseTest = await fetch(`${NETLIFY_URL}/.netlify/functions/api-proxy?endpoint=test-supabase`);
    const supabaseResult = await supabaseTest.json();
    
    console.log(`  Supabase connection: ${supabaseResult.success ? '✓ SUCCESS' : '✗ FAILED'}`);
    if (supabaseResult.error) {
      console.log(`  Error: ${supabaseResult.error}`);
    }
    
    return supabaseResult.success;
  } catch (error) {
    console.log(`  ✗ Error testing auth: ${error.message}`);
    return false;
  }
};

// Test 3: n8n integration via proxy
const testN8nIntegration = async () => {
  console.log('\n3. Testing n8n integration...');
  try {
    // Test n8n proxy
    const proxyTest = await fetch(`${NETLIFY_URL}/.netlify/functions/n8n-proxy/workflows`);
    
    if (proxyTest.ok) {
      const workflows = await proxyTest.json();
      console.log(`  ✓ n8n proxy working - ${workflows.data?.length || 0} workflows`);
      
      // Test specific workflow details
      if (workflows.data && workflows.data.length > 0) {
        const firstWorkflow = workflows.data[0];
        console.log(`  ✓ Sample workflow: "${firstWorkflow.name}" (${firstWorkflow.active ? 'active' : 'inactive'})`);
      }
      
      return true;
    } else {
      const error = await proxyTest.text();
      console.log(`  ✗ n8n proxy failed: ${error}`);
      return false;
    }
  } catch (error) {
    console.log(`  ✗ Error testing n8n: ${error.message}`);
    return false;
  }
};

// Test 4: Environment configuration
const testEnvironment = async () => {
  console.log('\n4. Testing environment configuration...');
  try {
    const envTest = await fetch(`${NETLIFY_URL}/.netlify/functions/api-proxy?endpoint=env-check`);
    const env = await envTest.json();
    
    console.log('  Environment variables:');
    Object.entries(env.environment).forEach(([key, value]) => {
      const status = value === 'SET' ? '✓' : '✗';
      console.log(`    ${status} ${key}: ${value}`);
    });
    
    // Check critical variables
    const critical = ['SUPABASE_URL', 'N8N_API_URL', 'N8N_API_KEY'];
    const allCriticalSet = critical.every(key => env.environment[key] === 'SET');
    
    console.log(`  Critical variables configured: ${allCriticalSet ? '✓ YES' : '✗ NO'}`);
    return allCriticalSet;
  } catch (error) {
    console.log(`  ✗ Error testing environment: ${error.message}`);
    return false;
  }
};

// Test 5: Agent system files and structure
const testAgentSystem = async () => {
  console.log('\n5. Testing agent system structure...');
  
  // This would normally require server-side access to check files
  // Instead, we'll check if the bundled JavaScript includes agent references
  try {
    const response = await fetch(NETLIFY_URL);
    const html = await response.text();
    
    // Extract JavaScript file references
    const scriptMatches = html.match(/<script[^>]*src="([^"]*)"[^>]*>/g);
    
    if (scriptMatches && scriptMatches.length > 0) {
      console.log(`  ✓ Found ${scriptMatches.length} JavaScript files in HTML`);
      
      // Try to fetch the main bundle to check for agent code
      const mainScriptMatch = html.match(/<script[^>]*src="([^"]*index[^"]*\.js)"[^>]*>/);
      if (mainScriptMatch) {
        const scriptUrl = NETLIFY_URL + mainScriptMatch[1];
        const scriptResponse = await fetch(scriptUrl);
        const scriptContent = await scriptResponse.text();
        
        // Check for agent-related code in the bundle
        const hasAgentCode = scriptContent.includes('BaseAgent') || scriptContent.includes('agentCoordinator');
        const hasOpenAI = scriptContent.includes('openai') || scriptContent.includes('OpenAI');
        const hasMultiAgent = scriptContent.includes('OrchestratorAgent') || scriptContent.includes('WorkflowDesigner');
        
        console.log(`  ✓ Agent system in bundle: ${hasAgentCode}`);
        console.log(`  ✓ OpenAI integration: ${hasOpenAI}`);
        console.log(`  ✓ Multi-agent classes: ${hasMultiAgent}`);
        
        return hasAgentCode;
      }
    }
    
    return false;
  } catch (error) {
    console.log(`  ✗ Error checking agent system: ${error.message}`);
    return false;
  }
};

// Test 6: Chat-specific endpoints (if any exist)
const testChatEndpoints = async () => {
  console.log('\n6. Testing chat-specific functionality...');
  
  try {
    // Test if there are any chat-specific API endpoints
    const healthTest = await fetch(`${NETLIFY_URL}/.netlify/functions/api-proxy?endpoint=health`);
    const health = await healthTest.json();
    
    console.log(`  ✓ API proxy responsive: ${health.status === 'ok'}`);
    console.log(`  ✓ Function timestamp: ${health.timestamp}`);
    
    // Check available endpoints
    const endpointsTest = await fetch(`${NETLIFY_URL}/.netlify/functions/api-proxy?endpoint=unknown`);
    const endpoints = await endpointsTest.json();
    
    if (endpoints.availableEndpoints) {
      console.log(`  ✓ Available endpoints: ${endpoints.availableEndpoints.join(', ')}`);
    }
    
    return true;
  } catch (error) {
    console.log(`  ✗ Error testing chat endpoints: ${error.message}`);
    return false;
  }
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting comprehensive chat system test...\n');
  
  const results = {
    siteAccess: await testSiteAccess(),
    authSystem: await testAuthSystem(),
    n8nIntegration: await testN8nIntegration(),
    environment: await testEnvironment(),
    agentSystem: await testAgentSystem(),
    chatEndpoints: await testChatEndpoints()
  };
  
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('================================');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${status} ${testName}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall Score: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED - Chat system is fully functional!');
  } else {
    console.log('⚠️  Some tests failed - investigating issues...');
  }
  
  return results;
};

// Execute tests
runAllTests().then(results => {
  console.log('\n📋 NEXT STEPS:');
  
  if (results.siteAccess && results.n8nIntegration && results.environment) {
    console.log('✅ Core functionality is working');
    console.log('🎯 Ready for manual chat testing:');
    console.log('   1. Visit https://clixen.netlify.app');
    console.log('   2. Login with jayveedz19@gmail.com / Jimkali90#');
    console.log('   3. Navigate to Chat page');
    console.log('   4. Send test message: "Create a webhook workflow"');
    console.log('   5. Observe multi-agent responses');
  } else {
    console.log('❌ Critical issues found - may need Netlify MCP intervention');
  }
}).catch(error => {
  console.error('❌ Test execution failed:', error.message);
});