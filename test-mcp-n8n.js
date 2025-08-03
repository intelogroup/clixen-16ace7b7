#!/usr/bin/env node

// Test script for the n8n MCP server
import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

console.log('🧪 Testing n8n MCP Server...\n');

// Test environment variables
const testEnv = {
  ...process.env,
  N8N_API_URL: 'http://18.221.12.50:5678/api/v1',
  N8N_API_KEY: 'b38356d3-075f-4b69-9b31-dc90c71ba40a'
};

console.log('Environment configured:');
console.log('- N8N_API_URL:', testEnv.N8N_API_URL);
console.log('- N8N_API_KEY:', testEnv.N8N_API_KEY ? 'Set' : 'Missing');

// Test the MCP server by sending a sample JSON-RPC request
const testRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

console.log('\n📋 Testing tool list...');

try {
  // Start the MCP server
  const mcpServer = spawn('node', ['/root/repo/clixen/packages/mcp-server/dist/index.js'], {
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

  // Send the test request
  mcpServer.stdin.write(JSON.stringify(testRequest) + '\n');

  // Give it time to process
  setTimeout(() => {
    mcpServer.kill();
    
    console.log('\n📊 MCP Server Test Results:');
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
    
    // Test if the server can start at all
    console.log('\n🔄 Server startup test completed');
  }, 3000);

  mcpServer.on('error', (error) => {
    console.log('❌ Failed to start MCP server:', error.message);
  });

} catch (error) {
  console.log('❌ Test failed:', error.message);
}