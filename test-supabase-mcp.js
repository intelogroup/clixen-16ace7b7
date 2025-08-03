#!/usr/bin/env node

// Test script for the Supabase MCP server
import { spawn } from 'child_process';

console.log('🧪 Testing Supabase MCP Server...\n');

// Test environment variables
const testEnv = {
  ...process.env,
  SUPABASE_URL: 'https://zfbgdixbzezpxllkoyfc.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw',
  SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig'
};

console.log('Environment configured:');
console.log('- SUPABASE_URL:', testEnv.SUPABASE_URL);
console.log('- SUPABASE_ANON_KEY:', testEnv.SUPABASE_ANON_KEY ? 'Set' : 'Missing');
console.log('- SUPABASE_SERVICE_KEY:', testEnv.SUPABASE_SERVICE_KEY ? 'Set' : 'Missing');

// Test multiple requests
const testRequests = [
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  },
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'test-connection',
      arguments: {}
    }
  },
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'list-users',
      arguments: {}
    }
  }
];

console.log('\n📋 Testing Supabase MCP Server...');

try {
  // Start the MCP server
  const mcpServer = spawn('node', ['/root/repo/supabase-mcp-server.js'], {
    env: testEnv,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  let errorOutput = '';

  // Set up data handlers
  mcpServer.stdout.on('data', (data) => {
    output += data.toString();
  });

  mcpServer.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  // Send test requests one by one with delays
  testRequests.forEach((request, index) => {
    setTimeout(() => {
      console.log(`Sending request ${index + 1}:`, request.method);
      mcpServer.stdin.write(JSON.stringify(request) + '\n');
    }, index * 1000);
  });

  // Give it time to process all requests
  setTimeout(() => {
    mcpServer.kill();
    
    console.log('\n📊 Supabase MCP Server Test Results:');
    console.log('='.repeat(50));
    
    if (output) {
      console.log('✅ Server Output:');
      console.log(output);
    }
    
    if (errorOutput) {
      console.log('\n⚠️ Server Errors:');
      console.log(errorOutput);
    }
    
    if (!output && !errorOutput) {
      console.log('❌ No response from MCP server');
    }
    
    console.log('\n🔄 Supabase MCP server test completed');
  }, 5000);

  mcpServer.on('error', (error) => {
    console.log('❌ Failed to start Supabase MCP server:', error.message);
  });

} catch (error) {
  console.log('❌ Test failed:', error.message);
}