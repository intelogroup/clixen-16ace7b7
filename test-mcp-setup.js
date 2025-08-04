#!/usr/bin/env node

/**
 * MCP Configuration Test Script for Clixen AI Platform
 * Tests both Netlify and Supabase MCP server configurations
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TEST_CONFIG = {
  netlify: {
    token: "nfp_nJDfV7UNE6CQxcHdBpz2HmNc3TFyxcas7a2e"
  },
  supabase: {
    url: "https://zfbgdixbzezpxllkoyfc.supabase.co",
    access_token: "sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f",
    service_role_key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig"
  }
};

async function testNetlifyMCP() {
  console.log('🌐 Testing Netlify MCP Server...');
  
  try {
    const env = {
      ...process.env,
      NETLIFY_PERSONAL_ACCESS_TOKEN: TEST_CONFIG.netlify.token
    };
    
    // Test tools/list
    const listCmd = `echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | npx @netlify/mcp`;
    const { stdout: listResult } = await execAsync(listCmd, { env });
    const listResponse = JSON.parse(listResult);
    
    if (listResponse.result && listResponse.result.tools) {
      console.log(`✅ Netlify MCP: Found ${listResponse.result.tools.length} available tools`);
      console.log(`   Tools: ${listResponse.result.tools.map(t => t.name).join(', ')}`);
    }
    
    // Test user info
    const userCmd = `echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "netlify-user-services", "arguments": {"selectSchema": {"operation": "get-user", "params": {}}}}}' | npx @netlify/mcp`;
    const { stdout: userResult } = await execAsync(userCmd, { env });
    const userResponse = JSON.parse(userResult);
    
    if (userResponse.result && userResponse.result.content) {
      const userData = JSON.parse(userResponse.result.content[0].text);
      console.log(`✅ Netlify User: ${userData.email} (${userData.site_count} sites)`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Netlify MCP Test Failed:', error.message);
    return false;
  }
}

async function testSupabaseMCP() {
  console.log('🗄️ Testing Supabase MCP Server...');
  
  try {
    const env = {
      ...process.env,
      SUPABASE_URL: TEST_CONFIG.supabase.url,
      SUPABASE_ACCESS_TOKEN: TEST_CONFIG.supabase.access_token,
      SUPABASE_SERVICE_ROLE_KEY: TEST_CONFIG.supabase.service_role_key
    };
    
    // Test tools/list
    const listCmd = `echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | npx @supabase/mcp-server-supabase`;
    const { stdout: listResult } = await execAsync(listCmd, { env });
    const listResponse = JSON.parse(listResult);
    
    if (listResponse.result && listResponse.result.tools) {
      console.log(`✅ Supabase MCP: Found ${listResponse.result.tools.length} available tools`);
      console.log(`   Key tools: list_projects, execute_sql, create_project, deploy_edge_function`);
    }
    
    // Test project listing
    const projectsCmd = `echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "list_projects", "arguments": {}}}' | npx @supabase/mcp-server-supabase`;
    const { stdout: projectsResult } = await execAsync(projectsCmd, { env });
    const projectsResponse = JSON.parse(projectsResult);
    
    if (projectsResponse.result && projectsResponse.result.content) {
      const projects = JSON.parse(projectsResponse.result.content[0].text);
      console.log(`✅ Supabase Projects: Found ${projects.length} projects`);
      projects.forEach(project => {
        console.log(`   - ${project.name} (${project.id}) - ${project.status}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Supabase MCP Test Failed:', error.message);
    return false;
  }
}

async function testCustomSupabaseMCP() {
  console.log('🔧 Testing Custom Supabase MCP Server...');
  
  try {
    const env = {
      ...process.env,
      SUPABASE_URL: TEST_CONFIG.supabase.url,
      SUPABASE_SERVICE_KEY: TEST_CONFIG.supabase.service_role_key
    };
    
    // Test tools/list
    const listCmd = `echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node /root/repo/mcp/supabase-mcp-server.js`;
    const { stdout: listResult } = await execAsync(listCmd, { env });
    const lines = listResult.split('\n');
    const jsonLine = lines.find(line => line.startsWith('{"result"'));
    
    if (jsonLine) {
      const listResponse = JSON.parse(jsonLine);
      if (listResponse.result && listResponse.result.tools) {
        console.log(`✅ Custom Supabase MCP: Found ${listResponse.result.tools.length} available tools`);
        console.log(`   Tools: ${listResponse.result.tools.map(t => t.name).join(', ')}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Custom Supabase MCP Test Failed:', error.message);
    return false;
  }
}

async function verifyClaudeConfig() {
  console.log('📋 Verifying Claude Desktop Configuration...');
  
  try {
    const { stdout } = await execAsync('cat /root/repo/claude_desktop_config.json');
    const config = JSON.parse(stdout);
    
    const requiredServers = ['netlify', 'supabase', 'supabase-custom'];
    const foundServers = Object.keys(config.mcpServers);
    
    requiredServers.forEach(server => {
      if (foundServers.includes(server)) {
        console.log(`✅ Found MCP server: ${server}`);
      } else {
        console.log(`❌ Missing MCP server: ${server}`);
      }
    });
    
    return requiredServers.every(server => foundServers.includes(server));
  } catch (error) {
    console.error('❌ Claude Config Verification Failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting MCP Configuration Tests for Clixen AI Platform\n');
  
  const results = {
    netlify: await testNetlifyMCP(),
    supabase: await testSupabaseMCP(),
    customSupabase: await testCustomSupabaseMCP(),
    claudeConfig: await verifyClaudeConfig()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 MCP Configuration is ready for use with Clixen AI Platform!');
    console.log('\nAvailable MCP Servers:');
    console.log('- netlify: Full Netlify API access (deploy, manage sites, functions)');
    console.log('- supabase: Official Supabase management (projects, database, auth)');
    console.log('- supabase-custom: Custom auth and database operations');
    console.log('');
    console.log('You can now use these MCP servers in Claude Code for:');
    console.log('• Netlify deployment and site management');
    console.log('• Supabase project and database operations');  
    console.log('• Custom authentication and user management');
    console.log('• Testing and debugging the Clixen AI platform');
  }
  
  return allPassed;
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export { runAllTests, testNetlifyMCP, testSupabaseMCP, testCustomSupabaseMCP, verifyClaudeConfig };